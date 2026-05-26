import { useAppStore, ProviderConfig } from '../store/appStore';
import { GoogleGenAI } from '@google/genai';

/**
 * 获取当前激活的 Provider 配置
 */
function getActiveProvider() {
  const { providers, activeProviderId } = useAppStore.getState();
  const provider = providers[activeProviderId];
  if (!provider) throw new Error('Provider not found');
  return { provider, providerId: activeProviderId };
}

/**
 * 获取 Provider 的 API Key
 */
function getApiKey(provider: ProviderConfig, providerId: string): string {
  return provider.apiKey || '';
}

/**
 * 处理 429 限流错误
 */
function handleRateLimitError(err: any, providerId: string): never {
  if (err?.status === 429 || err?.status === 'RESOURCE_EXHAUSTED' || 
      err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
    throw new Error('API请求频率超限或配额耗尽，请稍后再试，或在设置中配置自定义 API Key。');
  }
  throw err;
}

/**
 * Gemini 流式生成
 */
async function geminiGenerateStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  onProgress: (fullText: string) => void,
  preferJson: boolean = false
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  let responseStream;
  try {
    responseStream = await ai.models.generateContentStream({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        ...(preferJson ? { responseMimeType: 'application/json' } : {}),
      }
    });
  } catch (err: any) {
    handleRateLimitError(err, 'gemini');
  }

  let fullText = '';
  for await (const chunk of responseStream) {
    if (!useAppStore.getState().isGenerating) break;
    if (chunk.text) {
      fullText += chunk.text;
      onProgress(fullText);
    }
  }
  return fullText;
}

/**
 * Gemini 非流式生成
 */
async function geminiGenerate(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  preferJson: boolean = false
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        ...(preferJson ? { responseMimeType: 'application/json' } : {}),
      }
    });
  } catch (err: any) {
    handleRateLimitError(err, 'gemini');
  }
  return response.text || '';
}

/**
 * OpenAI 兼容接口的请求头构建
 */
function buildOpenAIHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
}

/**
 * OpenAI 兼容接口的请求体构建
 */
function buildOpenAIBody(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  stream: boolean,
  preferJson: boolean = false
) {
  return JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature,
    stream,
    ...(preferJson ? { response_format: { type: 'json_object' } } : {})
  });
}

/**
 * 处理 OpenAI 兼容接口的 HTTP 错误响应
 */
async function handleOpenAIError(res: Response): Promise<never> {
  let errMessage = '请求失败';
  try {
    const errBody = await res.json();
    errMessage = errBody.error?.message || errMessage;
  } catch(e) { /* ignore */ }
  if (res.status === 429) {
    throw new Error('API请求频率超限或配额耗尽，请检查您的请求频率或API Key配额。');
  }
  throw new Error(`API Error: ${res.status} - ${errMessage}`);
}

function isUnsupportedJsonModeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /response_format|json_object|json mode|unsupported|not support|不支持|无效参数|invalid/i.test(message);
}

/**
 * OpenAI 兼容接口 - 流式生成
 */
async function openaiGenerateStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  onProgress: (fullText: string) => void,
  preferJson: boolean = false
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: buildOpenAIHeaders(apiKey),
    body: buildOpenAIBody(model, systemPrompt, userPrompt, temperature, true, preferJson)
  });

  if (!res.ok) {
    await handleOpenAIError(res);
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  if (!reader) throw new Error("No response body");

  let fullText = '';
  let buffer = '';

  while (true) {
    if (!useAppStore.getState().isGenerating) break;
    const { value, done } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const message = line.trim();
      if (message === '') continue;
      if (message === 'data: [DONE]') continue;
      if (message.startsWith('data: ')) {
        try {
          const data = JSON.parse(message.slice(6));
          if (data.choices && data.choices[0].delta?.content) {
            fullText += data.choices[0].delta.content;
            onProgress(fullText);
          }
        } catch (e) {
          console.warn("SSE json parse error", e, message);
        }
      }
    }
  }
  return fullText;
}

/**
 * OpenAI 兼容接口 - 非流式生成
 */
async function openaiGenerate(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  preferJson: boolean = false
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: buildOpenAIHeaders(apiKey),
    body: buildOpenAIBody(model, systemPrompt, userPrompt, temperature, false, preferJson)
  });

  if (!res.ok) {
    await handleOpenAIError(res);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export const useAIProvider = () => {
  const generateStream = async function (
    systemPrompt: string, 
    userPrompt: string, 
    onProgress: (content: string) => void,
    options?: { preferJson?: boolean }
  ) {
    const { provider, providerId } = getActiveProvider();
    const preferJson = options?.preferJson ?? false;
    
    if (providerId === 'gemini') {
      const apiKey = getApiKey(provider, providerId);
      if (!apiKey) throw new Error('请配置 Gemini API Key');
      try {
        return await geminiGenerateStream(
          apiKey, provider.model, systemPrompt, userPrompt, 
          provider.temperature, onProgress, preferJson
        );
      } catch (err) {
        if (!preferJson || !isUnsupportedJsonModeError(err)) throw err;
        return geminiGenerateStream(
          apiKey, provider.model, systemPrompt, userPrompt,
          provider.temperature, onProgress, false
        );
      }
    } else {
      const apiKey = provider.apiKey;
      if (!apiKey) throw new Error(`请配置 ${provider.name} 的 API Key`);
      try {
        return await openaiGenerateStream(
          provider.baseUrl || 'https://api.openai.com/v1', apiKey, 
          provider.model, systemPrompt, userPrompt, 
          provider.temperature, onProgress, preferJson
        );
      } catch (err) {
        if (!preferJson || !isUnsupportedJsonModeError(err)) throw err;
        return openaiGenerateStream(
          provider.baseUrl || 'https://api.openai.com/v1', apiKey,
          provider.model, systemPrompt, userPrompt,
          provider.temperature, onProgress, false
        );
      }
    }
  };

  const generate = async function (systemPrompt: string, userPrompt: string, options?: { preferJson?: boolean }) {
    const { provider, providerId } = getActiveProvider();
    const preferJson = options?.preferJson ?? false;
    
    if (providerId === 'gemini') {
      const apiKey = getApiKey(provider, providerId);
      if (!apiKey) throw new Error('请配置 Gemini API Key');
      try {
        return await geminiGenerate(
          apiKey, provider.model, systemPrompt, userPrompt, 
          provider.temperature, preferJson
        );
      } catch (err) {
        if (!preferJson || !isUnsupportedJsonModeError(err)) throw err;
        return geminiGenerate(
          apiKey, provider.model, systemPrompt, userPrompt,
          provider.temperature, false
        );
      }
    } else {
      const apiKey = provider.apiKey;
      if (!apiKey) throw new Error(`请配置 ${provider.name} 的 API Key`);
      try {
        return await openaiGenerate(
          provider.baseUrl || 'https://api.openai.com/v1', apiKey,
          provider.model, systemPrompt, userPrompt,
          provider.temperature, preferJson
        );
      } catch (err) {
        if (!preferJson || !isUnsupportedJsonModeError(err)) throw err;
        return openaiGenerate(
          provider.baseUrl || 'https://api.openai.com/v1', apiKey,
          provider.model, systemPrompt, userPrompt,
          provider.temperature, false
        );
      }
    }
  };

  const testConnection = async (id: string, config?: Partial<ProviderConfig>) => {
    const { providers } = useAppStore.getState();
    const provider = config ? { ...providers[id], ...config } : providers[id];
    if (!provider) throw new Error('Provider not found');

    if (id === 'gemini') {
      const apiKey = provider.apiKey;
      if (!apiKey) throw new Error('请配置 Gemini API Key');
      return geminiGenerate(
        apiKey, provider.model,
        'Respond with exactly: "连接成功！"',
        'Hello',
        0.1
      );
    } else {
      const apiKey = provider.apiKey;
      if (!apiKey) throw new Error(`请配置 ${provider.name} 的 API Key`);
      const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
      return openaiGenerate(
        baseUrl, apiKey, provider.model,
        'Respond with exactly: "连接成功！"',
        'Hello',
        0.1
      );
    }
  };

  return { generateStream, generate, testConnection };
};
