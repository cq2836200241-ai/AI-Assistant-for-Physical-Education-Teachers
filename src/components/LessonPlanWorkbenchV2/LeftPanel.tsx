import { useRef, useState } from 'react';
import {
  Sparkles,
  MapPin,
  BookOpen,
  Search,
  RefreshCw,
  Loader2,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addLessonPlanV2,
  type LessonPlanV2,
} from '../../utils/lessonPlanStorageV2';
import { buildLessonPlanPromptV2 } from '../../utils/lessonPlanPromptV2';
import { extractLessonPlanJson } from '../../utils/lessonPlanMarkdown';
import { useAIProvider } from '../../hooks/useAIProvider';

interface LeftPanelProps {
  plansCount: number;
  favoritesCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onToggleLibrary: () => void;
  onPlanGenerated: (plan: LessonPlanV2) => void;
  onToggleFavorites: () => void;
}

interface TopicValidationResult {
  isSportsLessonTopic?: boolean;
  confidence?: number;
  normalizedTopic?: string;
  reason?: string;
}

const GRADE_OPTIONS = [
  '小学一年级',
  '小学二年级',
  '小学三年级',
  '小学四年级',
  '小学五年级',
  '小学六年级',
  '初中一年级',
  '初中二年级',
  '初中三年级',
];

const SPORTS_TOPIC_ERROR =
  '请输入具体的体育课题，例如：前滚翻、篮球运球、立定跳远、运动后合理补水。';

const CLEARLY_UNRELATED_TOPICS = [
  '吃饭',
  '睡觉',
  '数学',
  '语文',
  '英语',
  '物理',
  '化学',
  '历史',
  '地理',
  '生物',
  '政治',
  '音乐',
  '美术',
  '编程',
  '天气',
  '旅游',
  '做饭',
  '游戏',
];

function isClearlyUnrelatedTopic(value: string) {
  const normalized = value.replace(/\s+/g, '').toLowerCase();
  return CLEARLY_UNRELATED_TOPICS.includes(normalized);
}

function getLocalValidatedTopic(value: string) {
  const inputTopic = value.trim();

  if (!inputTopic || isClearlyUnrelatedTopic(inputTopic)) {
    throw new Error(SPORTS_TOPIC_ERROR);
  }

  return inputTopic;
}

export function LeftPanel({
  plansCount,
  favoritesCount,
  searchQuery,
  onSearchChange,
  onRefresh,
  onToggleLibrary,
  onPlanGenerated,
  onToggleFavorites,
}: LeftPanelProps) {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [venue, setVenue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const topicInputRef = useRef<HTMLInputElement>(null);

  const { generate } = useAIProvider();

  /** 解析 AI 返回的文本，尝试提取 JSON */
  function extractJson<T>(raw: string): T | null {
    const text = raw.trim();

    try {
      return JSON.parse(text) as T;
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          return JSON.parse(match[1].trim()) as T;
        } catch {
          // 继续尝试从正文中截取 JSON 对象
        }
      }

      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(text.slice(start, end + 1)) as T;
        } catch {
          return null;
        }
      }

      return null;
    }
  }

  const focusTopicInput = () => {
    window.setTimeout(() => {
      topicInputRef.current?.focus();
      topicInputRef.current?.select();
    }, 0);
  };

  const validateTopic = async (inputTopic: string) => {
    const systemPrompt =
      '你是一位严谨的中小学体育教研员。你的任务是判断用户输入是否适合作为体育与健康课程的教案课题。';

    const userPrompt = `用户输入："${inputTopic}"

请严格按下面规则返回一个纯 JSON 对象，不要包含 Markdown 标记、解释或多余文字。

判断规则：
1. 只有当输入是体育项目、运动技能、体能练习、课堂体育游戏、体育安全、运动健康或可在体育与健康课中教学的明确主题时，isSportsLessonTopic 才能为 true。
2. 如果输入是普通食品、普通名词、其他学科、人物、地点、情绪、闲聊、抽象概念，或无法形成体育教学目标的词语，必须返回 isSportsLessonTopic: false。
3. 不要为了满足请求强行把无关词改编成体育课题。例如"吃饭"不能改编成夹球或模仿动作；但"运动后合理饮食"可以视为运动健康课题。

如果不是体育课题，返回：
{
  "isSportsLessonTopic": false,
  "confidence": 0,
  "reason": "简短说明为什么不是体育课题"
}

如果是体育课题，返回：
{
  "isSportsLessonTopic": true,
  "confidence": 0.9,
  "normalizedTopic": "规范课题名称",
  "reason": ""
}

confidence 必须是 0 到 1 之间的小数。`;

    const text = await generate(systemPrompt, userPrompt, { preferJson: true });
    const result = extractJson<TopicValidationResult>(text);
    const confidence = result?.confidence ?? 0;

    if (result?.isSportsLessonTopic === true && confidence >= 0.75) {
      return result.normalizedTopic?.trim() || inputTopic;
    }

    throw new Error(result?.reason?.trim() || SPORTS_TOPIC_ERROR);
  };

  // AI 生成：调用 API → 解析 JSON → 存入桌面数据文件 → 刷新列表并选中
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setErrorMsg('');

    try {
      const inputTopic = getLocalValidatedTopic(topic);

      setIsGenerating(true);
      const validatedTopic = await validateTopic(inputTopic);

      const { systemPrompt, userPrompt } = buildLessonPlanPromptV2({
        topic: validatedTopic,
        grade,
        venue: venue.trim(),
      });

      const rawText = await generate(systemPrompt, userPrompt, { preferJson: true });

      const parsed = extractLessonPlanJson(rawText);
      if (!parsed) {
        throw new Error('AI 返回的数据格式不正确，无法解析为有效的教案 JSON。请重试。');
      }

      // 存入桌面数据文件
      const savedPlan = await addLessonPlanV2(parsed);

      // 自动选中新生成的教案
      onPlanGenerated(savedPlan);
    } catch (err: any) {
      setErrorMsg(err.message || '生成失败，请检查 API 配置后重试。');
      focusTopicInput();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-4 custom-scrollbar">
      {/* 生成新教案表单 */}
      <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <Sparkles className="h-4 w-4 text-amber-500" />
          生成新教案
        </h3>

        <div className="space-y-3">
          <div>
            <Label htmlFor="v2-topic" className="text-xs font-medium text-slate-600">
              课题名称
            </Label>
            <Input
              ref={topicInputRef}
              id="v2-topic"
              placeholder="例如：前滚翻、立定跳远..."
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="mt-1 h-9 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="v2-grade" className="text-xs font-medium text-slate-600">
              年龄段 / 年级
            </Label>
            <Select value={grade} onValueChange={(val) => setGrade(val ?? '')}>
              <SelectTrigger id="v2-grade" className="mt-1 h-9 text-sm">
                <SelectValue placeholder="选择年级" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="v2-venue" className="text-xs font-medium text-slate-600">
              教学场地
            </Label>
            <Input
              id="v2-venue"
              placeholder="例如：室内体育馆、田径场..."
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="mt-1 h-9 text-sm"
            />
          </div>

          {errorMsg && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              {errorMsg}
            </p>
          )}

          <Button
            className="mt-1 w-full gap-1.5 bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-sm hover:from-primary-600 hover:to-secondary-600"
            size="sm"
            disabled={!topic.trim() || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI 生成教案
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 我的教案库 */}
      <button
        type="button"
        onClick={onToggleLibrary}
        className="shrink-0 rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-slate-800">
            <BookOpen className="h-4 w-4 shrink-0 text-primary-500" />
            <span className="truncate">我的教案库</span>
            <span className="ml-1 shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-100">
              共 {plansCount} 篇
            </span>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-slate-500 hover:text-primary-600"
            onClick={onRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="border-b border-slate-100 px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="搜索课题或场地..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      </button>

      {/* 教案收藏 */}
      <button
        type="button"
        onClick={onToggleFavorites}
        className="flex shrink-0 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-rose-200 hover:bg-rose-50/40"
      >
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-slate-800">
          <Heart className="h-4 w-4 shrink-0 text-rose-500" />
          <span className="truncate">教案收藏</span>
          <span className="ml-1 shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-100">
            {favoritesCount} 篇
          </span>
        </h3>
        <span className="text-xs text-slate-400">查看 →</span>
      </button>
    </div>
  );
}
