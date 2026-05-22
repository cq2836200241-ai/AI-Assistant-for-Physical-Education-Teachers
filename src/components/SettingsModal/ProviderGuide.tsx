import { useState } from 'react';
import { BookOpen, ExternalLink, Copy, Check, ArrowRight, AlertTriangle, Sparkles, Shield, Key, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  warning?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  codeBlock?: {
    label: string;
    value: string;
  }[];
}

interface ProviderGuideData {
  id: string;
  name: string;
  logo: string;
  description: string;
  officialUrl: string;
  steps: Step[];
}

const DEEPSEEK_GUIDE: ProviderGuideData = {
  id: 'deepseek',
  name: 'DeepSeek',
  logo: '🧠',
  description: 'DeepSeek 提供强大的 AI 对话能力，支持文本生成、推理等多种任务。按照以下步骤完成配置，即可在教案系统中使用 DeepSeek 生成教案。',
  officialUrl: 'https://platform.deepseek.com/',
  steps: [
    {
      icon: <Shield className="w-5 h-5" />,
      title: '注册 DeepSeek 账号',
      description: '访问 DeepSeek 开放平台，注册或登录你的账号。',
      details: [
        '打开 DeepSeek 开放平台官网',
        '点击右上角「登录/注册」按钮',
        '使用手机号或邮箱完成注册',
        '登录后进入控制台页面',
      ],
      action: {
        label: '前往 DeepSeek 控制台',
        href: 'https://platform.deepseek.com/',
      },
    },
    {
      icon: <Key className="w-5 h-5" />,
      title: '创建 API Key',
      description: '在控制台中创建 API Key，用于应用与 DeepSeek 的通信认证。',
      details: [
        '在左侧导航栏找到「API Keys」',
        '点击「创建 API Key」按钮',
        '输入 Key 名称（如：教案系统）',
        '点击「创建」并立即复制保存 Key',
      ],
      warning: '⚠️ 重要：API Key 关闭弹窗后将不再完整显示，请务必立即复制并妥善保存！',
      action: {
        label: '前往 API Keys 页面',
        href: 'https://platform.deepseek.com/api_keys',
      },
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: '填写配置信息',
      description: '回到本应用，在设置中填入以下信息完成 DeepSeek 的配置。',
      details: [
        '打开本应用的「设置」→「AI 模型」',
        '在左侧提供商列表中选择「DeepSeek」',
        '将刚才复制的 API Key 粘贴到对应输入框',
        '确认模型名称和 Base URL 正确（如下所示）',
      ],
      codeBlock: [
        { label: 'API Key', value: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
        { label: '模型名称 (Model)', value: 'deepseek-chat' },
        { label: 'API Base URL', value: 'https://api.deepseek.com/v1' },
      ],
      warning: '💡 提示：模型名称也可以使用 deepseek-reasoner（深度推理模型），适合复杂教案生成场景。',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: '测试连接',
      description: '配置完成后，测试连接是否成功，确保可以正常使用。',
      details: [
        '在 AI 模型配置页面底部找到「测试连接」按钮',
        '点击后等待几秒钟',
        '显示「✓ 连接成功」即表示配置正确',
        '如果显示「✗ 连接失败」，请检查 API Key 是否正确',
      ],
      warning: '❓ 连接失败？请检查：① API Key 是否完整复制 ② 网络是否正常 ③ API 余额是否充足',
    },
  ],
};

const ALL_GUIDES: Record<string, ProviderGuideData> = {
  deepseek: DEEPSEEK_GUIDE,
};

interface ProviderGuideProps {
  onSwitchToAITab: () => void;
}

export function ProviderGuide({ onSwitchToAITab }: ProviderGuideProps) {
  const [selectedGuide, setSelectedGuide] = useState('deepseek');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const guide = ALL_GUIDES[selectedGuide];

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  if (!guide) return null;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary-500" />
          使用指南
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          以 {guide.name} 为例，手把手教你完成 API 配置。
        </p>
      </div>

      {/* 提供商选择 */}
      <div className="flex flex-wrap gap-2">
        {Object.values(ALL_GUIDES).map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGuide(g.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${selectedGuide === g.id
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'bg-slate-100 text-slate-500 border border-transparent hover:bg-slate-200'
              }
            `}
          >
            <span>{g.logo}</span>
            <span>{g.name}</span>
          </button>
        ))}
      </div>

      {/* 简介 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl shrink-0 mt-0.5">{guide.logo}</div>
          <div>
            <h4 className="text-sm font-semibold text-blue-800 mb-1">
              关于 {guide.name}
            </h4>
            <p className="text-xs text-blue-700/80 leading-relaxed">
              {guide.description}
            </p>
          </div>
        </div>
      </div>

      {/* 分步指南 */}
      <div className="space-y-4">
        {guide.steps.map((step, stepIndex) => (
          <div
            key={stepIndex}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            {/* 步骤标题 */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
              <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                {stepIndex + 1}
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="text-primary-500">{step.icon}</span>
                <span>{step.title}</span>
              </div>
            </div>

            {/* 步骤内容 */}
            <div className="px-4 py-3 space-y-3">
              <p className="text-sm text-slate-600">{step.description}</p>

              {/* 详情列表 */}
              <ul className="space-y-1.5">
                {step.details.map((detail, di) => (
                  <li key={di} className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-primary-400 mt-0.5 shrink-0">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>

              {/* 代码块展示 */}
              {step.codeBlock && (
                <div className="bg-slate-900 rounded-lg p-3 space-y-2">
                  {step.codeBlock.map((block, ci) => (
                    <div key={ci} className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 font-mono shrink-0 w-[120px]">
                        {block.label}：
                      </span>
                      <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded px-2.5 py-1.5 min-w-0">
                        <code className="text-[12px] text-green-300 font-mono truncate">
                          {block.value}
                        </code>
                        <button
                          onClick={() => handleCopy(block.value, stepIndex * 10 + ci)}
                          className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                          title="复制"
                        >
                          {copiedIndex === stepIndex * 10 + ci ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 警告提示 */}
              {step.warning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">{step.warning}</p>
                </div>
              )}

              {/* 操作按钮 */}
              {step.action && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {step.action.href && (
                    <a
                      href={step.action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {step.action.label}
                    </a>
                  )}
                  {step.action.onClick && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={step.action.onClick}
                    >
                      <ArrowRight className="w-3 h-3" />
                      {step.action.label}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 底部快捷跳转 */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-100 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-primary-800 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              配置完成了吗？
            </h4>
            <p className="text-xs text-primary-600/80 mt-0.5">
              切换到 AI 模型设置页面，粘贴你的 API Key 并测试连接。
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs gap-1.5 shrink-0"
            onClick={onSwitchToAITab}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            前往配置
          </Button>
        </div>
      </div>
    </div>
  );
}
