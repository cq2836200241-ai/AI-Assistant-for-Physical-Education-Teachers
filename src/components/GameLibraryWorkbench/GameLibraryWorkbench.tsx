import { useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Clock3,
  Gauge,
  Heart,
  LayoutGrid,
  Loader2,
  MapPin,
  RefreshCcw,
  Search,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import gameData from '../../date/large_class_games.json';
import { CreateGameDialog } from './CreateGameDialog';
import type { GameItem } from '../../types/gameItem';
import {
  loadFavoriteGamesFromStorage,
  loadHiddenSeedGameIdsFromStorage,
  loadUserGamesFromStorage,
  mergeLibraryWithUserGames,
  persistFavoriteGames,
  persistHiddenSeedGameIds,
  persistUserGames,
} from '../../utils/gameLibraryStorage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAIProvider } from '../../hooks/useAIProvider';
import { useAppStore } from '../../store/appStore';

type FilterKey = 'targets' | 'space_type' | 'group_size';
type GameSource = 'local' | 'ai';
type TabMode = 'ai' | 'library' | 'favorites';
type AiViewMode = 'form' | 'result';

interface GameListViewState {
  searchTerm: string;
  selectedTargets: string[];
  selectedSpaces: string[];
  selectedGroups: string[];
  scrollTop: number;
}

const librarySeed = gameData as GameItem[];
const seedIds = new Set(librarySeed.map((game) => game.id));
const GAME_LIBRARY_VIEW_STATE_KEY = 'game-library-workbench-view-state-v1';

const emptyListViewState: GameListViewState = {
  searchTerm: '',
  selectedTargets: [],
  selectedSpaces: [],
  selectedGroups: [],
  scrollTop: 0,
};

function getGameOrigin(game: GameItem) {
  if (game.id.startsWith('ai_') || game.id.startsWith('saved_')) return 'ai';
  if (game.id.startsWith('custom_')) return 'custom';
  if (seedIds.has(game.id)) return 'seed';
  return 'library';
}

function readStoredWorkbenchViewState(): {
  activeTab: TabMode;
  library: GameListViewState;
  favorites: GameListViewState;
} {
  if (typeof window === 'undefined') {
    return { activeTab: 'ai', library: emptyListViewState, favorites: emptyListViewState };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(GAME_LIBRARY_VIEW_STATE_KEY) || '{}');
    const activeTab = parsed.activeTab === 'library' || parsed.activeTab === 'favorites' || parsed.activeTab === 'ai'
      ? parsed.activeTab
      : 'ai';
    return {
      activeTab,
      library: { ...emptyListViewState, ...(parsed.library || {}) },
      favorites: { ...emptyListViewState, ...(parsed.favorites || {}) },
    };
  } catch {
    return { activeTab: 'ai', library: emptyListViewState, favorites: emptyListViewState };
  }
}

function writeStoredWorkbenchViewState(state: {
  activeTab: TabMode;
  library: GameListViewState;
  favorites: GameListViewState;
}) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GAME_LIBRARY_VIEW_STATE_KEY, JSON.stringify(state));
  } catch {
    // 本地浏览状态只是体验增强，写入失败时不阻断游戏库使用。
  }
}

const selectOptions = {
  groupSize: ['小组课(12-20人)', '中等班额(25-35人)', '标准行政班(40-50人)', '超大班额(50人以上)'],
  spaceType: ['篮球场', '标准操场/田径场', '室内体育馆', '排球场', '小型空地'],
  equipment: ['无器材', '常规器材', '球类充足', '标志物充足', '器材受限'],
  target: ['团队协作', '灵敏反应', '心肺耐力', '核心力量', '平衡协调', '爆发速度'],
};

function uniqueValues(key: FilterKey, games: GameItem[]) {
  return Array.from(new Set(games.flatMap((game) => game.tags[key]))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function hasEverySelected(values: string[], selected: string[]) {
  return selected.length === 0 || selected.every((item) => values.includes(item));
}

function buildMockGames(params: AiFormState, round: number): GameItem[] {
  const target = params.target || '团队协作';
  const space = params.spaceType || '篮球场';
  const group = params.groupSize || '标准行政班(40-50人)';
  const equipment = params.equipment || '常规器材';
  const context = params.context.trim();
  const suffix = context ? `，并结合“${context}”情境` : '';

  return [
    {
      id: `ai_game_${round}_01`,
      title: `${target}闪电站点赛`,
      brief_description: `围绕${target}设计的高密度轮换游戏，适合${group}在${space}开展${suffix}。`,
      tags: { targets: [target, '快速决策', '课堂组织'], group_size: [group], space_type: [space], equipment_level: equipment, age_groups: ['小学中高段(3-6年级)', '初中'] },
      metrics: { estimated_duration_min: 12, intensity_level: '中高', heart_rate_zone: '135-160' },
      setup: {
        equipment_list: equipment === '无器材' ? ['无需器材', '边线或区域标记'] : ['标志桶 x 12个', `${equipment}若干`],
        layout_instructions: `在${space}划分4个任务站，每站保留2米安全缓冲区。全班按人数均分为4队，队首站在各自起点线后。`,
      },
      execution: {
        organization_strategy: '采用站点轮换，所有小组同时开始，教师用哨音控制转换，避免长队等待。',
        rules_steps: ['每队依次完成站点任务后顺时针轮换。', '每完成一次任务获得1枚积分。', '听到暂停口令后立即冻结，教师快速确认安全距离。', '四轮结束后统计积分，强调动作质量优先于速度。'],
        safety_warnings: ['【间距预警】轮换时必须沿指定方向移动，禁止逆向穿插。', '【速度预警】冲刺回位前先观察侧方同伴，避免抢道碰撞。'],
      },
      coaching_adjustments: { progression_harder: '缩短每站完成时间，或增加一次判断口令再出发。', regression_easier: '减少站点数量，延长轮换时间，让学生先熟悉路线。' },
    },
    {
      id: `ai_game_${round}_02`,
      title: `${space}能量护送`,
      brief_description: `以护送任务串联跑、传、协作，提升${target}，对${group}的课堂管理友好。`,
      tags: { targets: [target, '沟通配合', '空间感知'], group_size: [group], space_type: [space], equipment_level: equipment, age_groups: ['小学中高段(3-6年级)', '初中'] },
      metrics: { estimated_duration_min: 15, intensity_level: '中', heart_rate_zone: '125-150' },
      setup: {
        equipment_list: equipment === '无器材' ? ['分区线', '计分板'] : ['软式球 x 4个', '标志盘 x 16个'],
        layout_instructions: `在${space}设置起点、补给点和终点三段路线，每组保持独立通道。`,
      },
      execution: {
        organization_strategy: '每组内部设护送员、观察员、补给员，轮换角色保证每名学生都参与。',
        rules_steps: ['护送员携带“能量物”从起点出发。', '队友只能通过口令提示路线和节奏。', '到达补给点后完成一次指定动作再继续。', '掉落或越界需回到上一补给点重新开始。'],
        safety_warnings: ['【追逐预警】本游戏不设置身体阻挡，禁止拉拽和冲撞。', '【器材预警】球类或标志物掉落后先停步再拾取，避免低头抢捡。'],
      },
      coaching_adjustments: { progression_harder: '加入限时任务或弱侧手携带规则。', regression_easier: '扩大通道宽度，取消掉落回退惩罚。' },
    },
    {
      id: `ai_game_${round}_03`,
      title: `${target}信号矩阵`,
      brief_description: `教师用颜色、数字或手势触发不同动作，让学生在${space}中完成快速反应与团队协同。`,
      tags: { targets: [target, '反应力', '专注力'], group_size: [group], space_type: [space], equipment_level: equipment, age_groups: ['小学中高段(3-6年级)', '初中'] },
      metrics: { estimated_duration_min: 10, intensity_level: '高', heart_rate_zone: '140-165' },
      setup: {
        equipment_list: ['四色标志盘 x 20个', equipment === '无器材' ? '可用手势替代器材' : `${equipment}辅助道具`],
        layout_instructions: `将${space}划成4个颜色区域，各区域入口错开，减少学生集中冲向同一点。`,
      },
      execution: {
        organization_strategy: '教师站在中线外侧发出信号，全班按小组响应，不淘汰学生，采用累计得分制。',
        rules_steps: ['学生慢跑散布在安全区域内。', '教师发出颜色或动作信号。', '小组快速进入对应区域并完成指定动作。', '最整齐且无碰撞的小组得分。'],
        safety_warnings: ['【变向预警】听到信号后先抬头确认路线，再加速移动。', '【聚集预警】同一区域人数过多时，后到学生在外圈完成动作，不强行挤入。'],
      },
      coaching_adjustments: { progression_harder: '叠加双信号，例如颜色加动作组合。', regression_easier: '先固定两种信号，待学生熟悉后再增加变化。' },
    },
    {
      id: `ai_game_${round}_04`,
      title: `班级协同闯关：${target}版`,
      brief_description: `把${group}拆成多个闯关小队，通过短任务连续挑战形成高参与度课堂。`,
      tags: { targets: [target, '规则意识', '小组合作'], group_size: [group], space_type: [space], equipment_level: equipment, age_groups: ['小学中高段(3-6年级)', '初中'] },
      metrics: { estimated_duration_min: 18, intensity_level: '中高', heart_rate_zone: '130-158' },
      setup: {
        equipment_list: equipment === '无器材' ? ['粉笔或地贴标线', '任务卡片 x 4张'] : ['任务卡片 x 4张', '标志桶 x 8个', `${equipment}若干`],
        layout_instructions: `沿${space}边线布置4个闯关点，中间区域留作教师观察和临时调整区。`,
      },
      execution: {
        organization_strategy: '每队从不同关卡开始，完成后领取下一关提示，减少拥堵并提升运动密度。',
        rules_steps: ['每队读取本站任务卡。', '全员完成任务后举手示意教师确认。', '确认通过后移动到下一关。', '规定时间内完成关卡最多且动作规范的小队获胜。'],
        safety_warnings: ['【拥堵预警】每个关卡最多容纳两队，后到队伍在等待线后做原地准备活动。', '【疲劳预警】连续闯关后安排30秒补水和呼吸调整。'],
      },
      coaching_adjustments: { progression_harder: '增加团队同步完成要求，如全员同节奏移动。', regression_easier: '允许队内分工完成，降低每名学生的连续负荷。' },
    },
  ];
}

function buildGameGenerationPrompt(params: AiFormState) {
  const systemPrompt = [
    '你是一名资深中小学体育教师、课堂组织专家和体育游戏设计师。',
    '你必须只输出合法 JSON，不要输出 Markdown、解释、代码块或额外文字。',
    'JSON 顶层必须是数组，且数组长度必须为 4。',
    '每个对象必须严格符合用户给定的 schema 字段，不要遗漏字段。',
  ].join('\n');

  const userPrompt = `请根据以下备课条件生成 4 个体育课堂游戏：

人数：${params.groupSize || '标准行政班(40-50人)'}
场地：${params.spaceType || '篮球场'}
器材情况：${params.equipment || '常规器材'}
主要训练目标：${params.target || '团队协作'}
特殊情境：${params.context.trim() || '无'}

请严格返回如下 TypeScript 结构对应的 JSON 数组：
[
  {
    "id": "ai_game_唯一编号",
    "title": "游戏名称",
    "brief_description": "80字以内简介",
    "tags": {
      "targets": ["主要目标", "辅助目标"],
      "group_size": ["人数适配"],
      "space_type": ["场地"],
      "equipment_level": "器材情况",
      "age_groups": ["适用年级"]
    },
    "metrics": {
      "estimated_duration_min": 12,
      "intensity_level": "中/中高/高",
      "heart_rate_zone": "120-150"
    },
    "setup": {
      "equipment_list": ["器材1", "器材2"],
      "layout_instructions": "场地布置说明"
    },
    "execution": {
      "organization_strategy": "组织策略",
      "rules_steps": ["步骤1", "步骤2", "步骤3", "步骤4"],
      "safety_warnings": ["【风险预警】具体安全要求", "【风险预警】具体安全要求"]
    },
    "coaching_adjustments": {
      "progression_harder": "提高难度方法",
      "regression_easier": "降低难度方法"
    }
  }
]

要求：
1. 必须生成 4 个彼此不同的游戏。
2. 必须适合 PC 端备课阅读，字段内容要具体、可执行。
3. safety_warnings 至少 2 条，必须明确风险点和教师提醒。
4. 不要使用 Markdown 代码块。`;

  return { systemPrompt, userPrompt };
}

function extractJsonArray(text: string): GameItem[] {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI 返回内容不是 JSON 数组');
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI 返回的游戏列表为空');
  }

  return parsed.slice(0, 4).map((game, index) => ({
    ...game,
    id: String(game.id || `ai_game_${Date.now()}_${index + 1}`),
    tags: {
      targets: Array.isArray(game.tags?.targets) ? game.tags.targets : [],
      group_size: Array.isArray(game.tags?.group_size) ? game.tags.group_size : [],
      space_type: Array.isArray(game.tags?.space_type) ? game.tags.space_type : [],
      equipment_level: String(game.tags?.equipment_level || '常规器材'),
      age_groups: Array.isArray(game.tags?.age_groups) ? game.tags.age_groups : [],
    },
    metrics: {
      estimated_duration_min: Number(game.metrics?.estimated_duration_min || 12),
      intensity_level: String(game.metrics?.intensity_level || '中'),
      heart_rate_zone: String(game.metrics?.heart_rate_zone || '120-150'),
    },
    setup: {
      equipment_list: Array.isArray(game.setup?.equipment_list) ? game.setup.equipment_list : [],
      layout_instructions: String(game.setup?.layout_instructions || ''),
    },
    execution: {
      organization_strategy: String(game.execution?.organization_strategy || ''),
      rules_steps: Array.isArray(game.execution?.rules_steps) ? game.execution.rules_steps : [],
      safety_warnings: Array.isArray(game.execution?.safety_warnings) ? game.execution.safety_warnings : [],
    },
    coaching_adjustments: {
      progression_harder: String(game.coaching_adjustments?.progression_harder || ''),
      regression_easier: String(game.coaching_adjustments?.regression_easier || ''),
    },
  }));
}

interface AiFormState {
  groupSize: string;
  spaceType: string;
  equipment: string;
  target: string;
  context: string;
}

function FilterDropdown({
  label,
  icon,
  options,
  selected,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };

  return (
    <Popover>
      <PopoverTrigger render={
        <Button variant="outline" size="sm" className="h-9 min-w-[150px] justify-between border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50">
          <span className="flex min-w-0 items-center gap-2">
            {icon}
            <span className="truncate">{label}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            {selected.length > 0 && <span className="rounded-full bg-primary-50 px-1.5 py-0.5 font-bold text-primary-700">{selected.length}</span>}
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </Button>
      } />
      <PopoverContent align="start" className="w-72 gap-2 rounded-lg border-slate-200 p-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="text-sm font-bold text-slate-800">{label}</div>
          {selected.length > 0 && <button className="text-xs font-semibold text-slate-400 hover:text-rose-500" onClick={() => onChange([])}>清空</button>}
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
          {options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
              <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              <span className="leading-snug">{option}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InfoBlock({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <h3 className="mb-3 text-sm font-black text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function TagList({ items, tone = 'slate' }: { items: string[]; tone?: 'slate' | 'teal' | 'amber' }) {
  const colorClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
    teal: 'border-primary-100 bg-primary-50 text-primary-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={cn('rounded-full border px-2 py-1 text-xs font-semibold', colorClass)}>{item}</span>
      ))}
    </div>
  );
}

function GameCard({
  game,
  active,
  source: sourceProp,
  onClick,
  actionLabel,
  actionIcon,
  actionTone = 'danger',
  onAction,
}: {
  game: GameItem;
  active: boolean;
  source: GameSource;
  onClick: () => void;
  actionLabel?: string;
  actionIcon?: ReactNode;
  actionTone?: 'danger' | 'rose';
  onAction?: () => void;
}) {
  const origin = getGameOrigin(game);
  const isCustom = origin === 'custom';
  const isAiGenerated = origin === 'ai';
  const isBuiltIn = origin === 'seed';
  const source = isAiGenerated ? 'ai' : sourceProp;
  const durationLabel = game.metrics.estimated_duration_min > 0 ? `${game.metrics.estimated_duration_min} 分钟` : '—';

  return (
    <div
      className={cn(
        'group relative flex min-h-[168px] flex-col rounded-lg border bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg',
        active ? 'border-primary-300 ring-2 ring-primary-100' : 'border-slate-200',
        isCustom && 'border-emerald-200'
      )}
    >
      <button type="button" onClick={onClick} className="flex min-h-0 flex-1 flex-col text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-slate-950 group-hover:text-primary-700">{game.title}</h3>
          <Badge variant={game.metrics.intensity_level.includes('高') ? 'destructive' : 'secondary'} className="h-6 shrink-0 rounded-md">
            {game.metrics.intensity_level}
          </Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{game.brief_description || '暂无简介'}</p>
        <div className="mt-3 flex items-center gap-3 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-primary-600" />{durationLabel}</span>
          <span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5 text-amber-600" />{game.metrics.heart_rate_zone}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <TagList items={game.tags.targets.slice(0, 2)} tone={isAiGenerated ? 'amber' : 'teal'} />
          <div className="flex shrink-0 items-center gap-1">
            {source === 'ai' && <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 text-[11px] font-bold text-amber-700">AI</span>}
            {isCustom && <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-[11px] font-bold text-emerald-700">自建</span>}
            {!isCustom && source !== 'ai' && <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] font-bold text-slate-500">内置</span>}
          </div>
        </div>
      </button>
      {onAction && actionLabel && (
        <div className="mt-2 flex justify-end border-t border-slate-100 pt-2">
          <button
            type="button"
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-md border bg-white px-2 text-[11px] font-semibold transition',
              actionTone === 'rose'
                ? 'border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                : 'border-slate-200 text-red-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
            )}
            onClick={(event) => {
              event.stopPropagation();
              onAction();
            }}
          >
            {actionIcon}
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function CompactGameRow({
  game,
  source: sourceProp,
  onClick,
  actionLabel,
  actionIcon,
  actionTone = 'danger',
  onAction,
}: {
  game: GameItem;
  source: GameSource;
  onClick: () => void;
  actionLabel?: string;
  actionIcon?: ReactNode;
  actionTone?: 'danger' | 'rose';
  onAction?: () => void;
}) {
  const origin = getGameOrigin(game);
  const isCustom = origin === 'custom';
  const isAiGenerated = origin === 'ai';
  const source = isAiGenerated ? 'ai' : sourceProp;
  const durationLabel = game.metrics.estimated_duration_min > 0 ? `${game.metrics.estimated_duration_min} 分钟` : '-';
  const targetLabel = game.tags.targets.slice(0, 2).join(' / ') || '-';
  const placeLabel = game.tags.space_type[0] || '-';
  const groupLabel = game.tags.group_size[0] || '-';
  const sourceLabel = source === 'ai' ? 'AI' : isCustom ? '自建' : '内置';

  return (
    <div className="grid grid-cols-[minmax(180px,1.8fr)_minmax(120px,1fr)_minmax(120px,0.9fr)_64px_70px_80px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm transition-colors hover:bg-slate-50">
      <button type="button" onClick={onClick} className="min-w-0 text-left">
        <div className="truncate text-[15px] font-black text-slate-900">{game.title}</div>
        <div className="mt-1 truncate text-xs leading-5 text-slate-500">{game.brief_description || '暂无简介'}</div>
      </button>
      <div className="min-w-0 truncate text-xs font-semibold text-primary-700">{targetLabel}</div>
      <div className="min-w-0 text-xs leading-5 text-slate-600">
        <div className="truncate">{placeLabel}</div>
        <div className="truncate text-slate-400">{groupLabel}</div>
      </div>
      <div className="text-xs font-bold text-slate-600">{durationLabel}</div>
      <Badge variant={game.metrics.intensity_level.includes('高') ? 'destructive' : 'secondary'} className="h-6 w-fit rounded-md">
        {game.metrics.intensity_level}
      </Badge>
      <div className="flex items-center justify-end gap-2">
        <span className={cn(
          'rounded-md border px-1.5 py-1 text-[11px] font-bold',
          source === 'ai'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : isCustom
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-500'
        )}>
          {sourceLabel}
        </span>
        {onAction && actionLabel && (
          <button
            type="button"
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-md border bg-white px-2 text-[11px] font-semibold transition',
              actionTone === 'rose'
                ? 'border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                : 'border-slate-200 text-red-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
            )}
            title={actionLabel}
            onClick={(event) => {
              event.stopPropagation();
              onAction();
            }}
          >
            {actionIcon}
          </button>
        )}
      </div>
    </div>
  );
}

function DetailList({ items, tone = 'slate' }: { items: string[]; tone?: 'slate' | 'red' }) {
  if (items.length === 0) return <EmptyHint />;

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className={cn(
            'flex gap-3 rounded-lg border px-3 py-2 text-sm leading-6',
            tone === 'red'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          )}
        >
          <span className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black',
            tone === 'red' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
          )}>
            {index + 1}
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function DetailSection({
  sectionId,
  title,
  icon,
  children,
  tone = 'slate',
  setSectionRef,
}: {
  sectionId: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  tone?: 'slate' | 'primary' | 'amber' | 'red';
  setSectionRef: (id: string) => (element: HTMLElement | null) => void;
}) {
  const toneClass = {
    slate: 'border-slate-200 bg-white text-slate-700',
    primary: 'border-primary-100 bg-primary-50/30 text-primary-800',
    amber: 'border-amber-100 bg-amber-50/40 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
  }[tone];

  return (
    <section
      ref={setSectionRef(sectionId)}
      className={cn('scroll-mt-4 rounded-lg border p-4 shadow-sm', toneClass)}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
          {icon}
        </span>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function FullGameDetail({
  game,
  source,
  isFavorite,
  saveMessage,
  onCancelPreview,
  onSaveAi,
  onToggleFavorite,
}: {
  game?: GameItem;
  source: GameSource;
  isFavorite: boolean;
  saveMessage?: string;
  onCancelPreview: () => void;
  onSaveAi: (game: GameItem) => void;
  onToggleFavorite: () => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    setActiveSection('overview');
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [game?.id]);

  if (!game) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400">
        <LayoutGrid className="mb-3 h-12 w-12 opacity-30" />
        <p className="text-sm font-semibold">请选择一个游戏查看详情</p>
      </div>
    );
  }

  const origin = getGameOrigin(game);
  const isCustom = origin === 'custom';
  const isAiGenerated = origin === 'ai';
  const durationDisplay = game.metrics.estimated_duration_min > 0 ? `${game.metrics.estimated_duration_min} 分钟` : '-';

  const navItems = [
    { id: 'overview', label: '概览', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'fit', label: '适配', icon: <Target className="h-4 w-4" /> },
    { id: 'setup', label: '场地器材', icon: <MapPin className="h-4 w-4" /> },
    { id: 'execution', label: '玩法流程', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'safety', label: '安全提示', icon: <AlertTriangle className="h-4 w-4" /> },
    { id: 'adjustments', label: '教学调整', icon: <Gauge className="h-4 w-4" /> },
  ];

  const setSectionRef = (id: string) => (element: HTMLElement | null) => {
    sectionRefs.current[id] = element;
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDetailScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerTop = container.getBoundingClientRect().top;
    const nextActive = navItems.reduce((current, item) => {
      const section = sectionRefs.current[item.id];
      if (!section) return current;
      return section.getBoundingClientRect().top - containerTop <= 96 ? item.id : current;
    }, navItems[0].id);

    setActiveSection((current) => current === nextActive ? current : nextActive);
  };


  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {saveMessage && <div className="mx-5 mt-5 shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{saveMessage}</div>}
      <div className="shrink-0 border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[260px] flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black leading-tight text-slate-950">{game.title}</h2>
              {isAiGenerated && <Badge className="rounded-md bg-amber-500 text-white">AI 生成</Badge>}
              {isCustom && <Badge className="rounded-md bg-emerald-600 text-white">自建</Badge>}
            </div>
            <p className="line-clamp-2 text-sm leading-6 text-slate-600">{game.brief_description || <EmptyHint />}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancelPreview} className="h-7 gap-1 rounded-md border-slate-300 px-2 text-xs font-bold text-slate-600 hover:bg-slate-100">
              <X className="h-3.5 w-3.5" />
              返回列表
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFavorite}
              className={cn(
                'h-7 gap-1 rounded-md px-2 text-xs font-bold',
                isFavorite
                  ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'border-slate-300 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
              )}
            >
              <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-rose-500')} />
              {isFavorite ? '已收藏' : '收藏'}
            </Button>
            <Badge variant="outline" className="h-7 rounded-md border-slate-300 px-2.5 text-slate-600">{game.id}</Badge>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Clock3 className="h-3.5 w-3.5" />时长</div>
            <div className="mt-1 text-lg font-black text-slate-900">{durationDisplay}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Gauge className="h-3.5 w-3.5" />强度</div>
            <div className="mt-1 text-lg font-black text-slate-900">{game.metrics.intensity_level || '-'}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Heart className="h-3.5 w-3.5" />心率区间</div>
            <div className="mt-1 text-lg font-black text-slate-900">{game.metrics.heart_rate_zone || '-'}</div>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}

        className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-5 custom-scrollbar"
        onScroll={handleDetailScroll}
      >
        <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-[190px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-0 xl:self-start">
            <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm xl:grid xl:overflow-visible">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-black transition-colors',
                    activeSection === item.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 space-y-4">
            <DetailSection sectionId="overview" title="游戏概览" icon={<BookOpen className="h-4 w-4" />} tone="primary" setSectionRef={setSectionRef}>
              <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm ring-1 ring-primary-100">
                {game.brief_description || '暂无简介'}
              </p>
            </DetailSection>

            <DetailSection sectionId="fit" title="目标与适配" icon={<Target className="h-4 w-4" />} setSectionRef={setSectionRef}>
              <div className="grid gap-3 lg:grid-cols-2">
                <InfoBlock title="训练目标" className="!shadow-none">
                  <TagList items={game.tags.targets} tone="teal" />
                </InfoBlock>
                <InfoBlock title="适用对象" className="!shadow-none">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                      <Users className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                      <span>{game.tags.group_size.join('、') || '未填写人数'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                      <BookOpen className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                      <span>{game.tags.age_groups.join('、') || '未填写年级'}</span>
                    </div>
                  </div>
                </InfoBlock>
                <InfoBlock title="场地类型" className="!shadow-none">
                  <TagList items={game.tags.space_type} />
                </InfoBlock>
                <InfoBlock title="器材水平" className="!shadow-none">
                  <TagList items={[game.tags.equipment_level || '未填写器材水平']} tone="amber" />
                </InfoBlock>
              </div>
            </DetailSection>

            <DetailSection sectionId="setup" title="场地与器材" icon={<MapPin className="h-4 w-4" />} setSectionRef={setSectionRef}>
              <div className="grid gap-4 lg:grid-cols-[6fr_4fr]">
                <InfoBlock title="场地布置" className="!shadow-none">
                  {game.setup.layout_instructions ? (
                    <p className="text-sm leading-6 text-slate-700">{game.setup.layout_instructions}</p>
                  ) : (
                    <EmptyHint />
                  )}
                </InfoBlock>
                <InfoBlock title="器材清单" className="!shadow-none">
                  <DetailList items={game.setup.equipment_list} />
                </InfoBlock>
              </div>
            </DetailSection>

            <DetailSection sectionId="execution" title="玩法流程" icon={<LayoutGrid className="h-4 w-4" />} tone="amber" setSectionRef={setSectionRef}>
              <div className="space-y-4">
                <InfoBlock title="组织策略" className="!shadow-none">
                  {game.execution.organization_strategy ? (
                    <p className="text-sm leading-6 text-slate-700">{game.execution.organization_strategy}</p>
                  ) : (
                    <EmptyHint />
                  )}
                </InfoBlock>
                <InfoBlock title="规则步骤" className="!shadow-none">
                  <DetailList items={game.execution.rules_steps} />
                </InfoBlock>
              </div>
            </DetailSection>

            <DetailSection sectionId="safety" title="安全提示" icon={<AlertTriangle className="h-4 w-4" />} tone="red" setSectionRef={setSectionRef}>
              <DetailList items={game.execution.safety_warnings} tone="red" />
            </DetailSection>

            <DetailSection sectionId="adjustments" title="教学调整" icon={<Gauge className="h-4 w-4" />} setSectionRef={setSectionRef}>
              <div className="grid gap-4 lg:grid-cols-2">
                <InfoBlock title="提高难度" className="!shadow-none">
                  {game.coaching_adjustments.progression_harder ? (
                    <p className="text-sm leading-6 text-slate-700">{game.coaching_adjustments.progression_harder}</p>
                  ) : (
                    <EmptyHint />
                  )}
                </InfoBlock>
                <InfoBlock title="降低难度" className="!shadow-none">
                  {game.coaching_adjustments.regression_easier ? (
                    <p className="text-sm leading-6 text-slate-700">{game.coaching_adjustments.regression_easier}</p>
                  ) : (
                    <EmptyHint />
                  )}
                </InfoBlock>
              </div>
            </DetailSection>
          </main>
        </div>
      </div>

      {source === 'ai' && (
        <div className="shrink-0 border-t border-amber-200 bg-white px-5 py-3 shadow-[0_-2px_8px_rgba(15,23,42,0.06)]">
          <Button onClick={() => onSaveAi(game)} className="h-10 w-full rounded-lg bg-primary-500 text-sm font-black text-white hover:bg-primary-600">
            <BookOpen className="h-4 w-4" />
            添加到我的游戏库
          </Button>
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-600">{label}</span>
      <Select value={value} onValueChange={(newValue) => newValue && onChange(newValue)}>
        <SelectTrigger className="h-9 w-full border-slate-200 bg-white">
          <SelectValue placeholder={`请选择${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function SkeletonResults() {
  return (
    <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="min-h-[168px] animate-pulse rounded-lg border border-slate-200 bg-white p-3">
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-full rounded bg-slate-100" />
          <div className="mt-2 h-3 w-5/6 rounded bg-slate-100" />
          <div className="mt-6 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-slate-100" />
            <div className="h-5 w-20 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyHint({ text = '（未填写）' }: { text?: string }) {
  return <p className="text-sm italic text-slate-400">{text}</p>;
}

function SidebarNavButton({
  active,
  icon,
  label,
  count,
  tone = 'primary',
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  count?: number;
  tone?: 'primary' | 'amber' | 'rose';
  onClick: () => void;
}) {
  const activeClass = {
    primary: 'border-primary-200 bg-primary-50 text-primary-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left shadow-sm transition',
        active ? activeClass : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm font-black">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {typeof count === 'number' && (
        <span className="ml-2 shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
          {count}
        </span>
      )}
    </button>
  );
}

function LibrarySearchControls({
  searchTerm,
  selectedTargets,
  selectedSpaces,
  selectedGroups,
  filterOptions,
  activeFilterCount,
  compact = false,
  onSearchTermChange,
  onSelectedTargetsChange,
  onSelectedSpacesChange,
  onSelectedGroupsChange,
  onResetFilters,
  onCreateGame,
}: {
  searchTerm: string;
  selectedTargets: string[];
  selectedSpaces: string[];
  selectedGroups: string[];
  filterOptions: {
    targets: string[];
    space_type: string[];
    group_size: string[];
  };
  activeFilterCount: number;
  compact?: boolean;
  onSearchTermChange: (value: string) => void;
  onSelectedTargetsChange: (value: string[]) => void;
  onSelectedSpacesChange: (value: string[]) => void;
  onSelectedGroupsChange: (value: string[]) => void;
  onResetFilters: () => void;
  onCreateGame: (game: GameItem) => void;
}) {
  if (compact) {
    return (
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} placeholder="搜索名称、描述、目标或场地..." className="h-9 rounded-lg border-slate-200 bg-white pl-8 text-xs" />
        </div>
        <FilterDropdown label="目标筛选" icon={<Target className="h-4 w-4 text-primary-600" />} options={filterOptions.targets} selected={selectedTargets} onChange={onSelectedTargetsChange} />
        <FilterDropdown label="场地筛选" icon={<MapPin className="h-4 w-4 text-sky-600" />} options={filterOptions.space_type} selected={selectedSpaces} onChange={onSelectedSpacesChange} />
        <FilterDropdown label="人数筛选" icon={<Users className="h-4 w-4 text-amber-600" />} options={filterOptions.group_size} selected={selectedGroups} onChange={onSelectedGroupsChange} />
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-9 px-3 text-slate-500 hover:text-rose-600">
            <X className="h-4 w-4" />
            重置
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-black text-slate-800">
          <Search className="h-4 w-4 text-primary-500" />
          游戏库搜索
        </h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-7 px-2 text-xs text-slate-500 hover:text-rose-600">
            <X className="h-3.5 w-3.5" />
            重置
          </Button>
        )}
      </div>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} placeholder="搜索名称、描述、目标或场地..." className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-8 text-xs focus-visible:bg-white" />
        </div>
        <div className="grid gap-2">
          <FilterDropdown label="目标筛选" icon={<Target className="h-4 w-4 text-primary-600" />} options={filterOptions.targets} selected={selectedTargets} onChange={onSelectedTargetsChange} />
          <FilterDropdown label="场地筛选" icon={<MapPin className="h-4 w-4 text-sky-600" />} options={filterOptions.space_type} selected={selectedSpaces} onChange={onSelectedSpacesChange} />
          <FilterDropdown label="人数筛选" icon={<Users className="h-4 w-4 text-amber-600" />} options={filterOptions.group_size} selected={selectedGroups} onChange={onSelectedGroupsChange} />
        </div>
        <CreateGameDialog onCreate={onCreateGame} />
      </div>
    </div>
  );
}

function AiGeneratePanel({
  activeProvider,
  activeProviderId,
  aiForm,
  generationError,
  hasGeneratedGames,
  onAiFormChange,
  onGenerate,
  onViewResults,
}: {
  activeProvider?: { name?: string; model?: string; apiKey?: string };
  activeProviderId: string;
  aiForm: AiFormState;
  generationError: string;
  hasGeneratedGames: boolean;
  onAiFormChange: (next: AiFormState) => void;
  onGenerate: () => void;
  onViewResults?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Sparkles className="h-5 w-5 text-amber-500" />
          AI生成游戏
        </h2>
        <p className="mt-1 text-xs text-slate-500">在右侧大区域设置生成条件，生成完成后会自动记录到我的游戏库</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="mx-auto max-w-5xl rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <span className="min-w-0 truncate font-bold">当前 API：{activeProvider?.name || '未选择'} / {activeProvider?.model || '未设置模型'}</span>
            <span className={cn('shrink-0 font-bold', activeProviderId === 'gemini' || activeProvider?.apiKey ? 'text-emerald-600' : 'text-red-600')}>
              {activeProviderId === 'gemini' || activeProvider?.apiKey ? '已读取配置' : '缺少 API Key'}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="人数" value={aiForm.groupSize} options={selectOptions.groupSize} onChange={(value) => onAiFormChange({ ...aiForm, groupSize: value })} />
            <SelectField label="场地" value={aiForm.spaceType} options={selectOptions.spaceType} onChange={(value) => onAiFormChange({ ...aiForm, spaceType: value })} />
            <SelectField label="器材情况" value={aiForm.equipment} options={selectOptions.equipment} onChange={(value) => onAiFormChange({ ...aiForm, equipment: value })} />
            <SelectField label="主要训练目标" value={aiForm.target} options={selectOptions.target} onChange={(value) => onAiFormChange({ ...aiForm, target: value })} />
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-black text-slate-600">特殊情境补充说明</span>
              <Textarea value={aiForm.context} onChange={(event) => onAiFormChange({ ...aiForm, context: event.target.value })} placeholder="例如：雨后地面较滑、班级注意力容易分散、需要低器材高密度..." className="min-h-28 resize-none border-slate-200 bg-white" />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={onGenerate} className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-black text-white hover:bg-slate-800">
              <Sparkles className="h-4 w-4" />
              调用 AI 生成游戏
            </Button>
            {hasGeneratedGames && (
              <Button onClick={onGenerate} variant="outline" className="h-10 rounded-lg border-amber-200 bg-white text-sm font-black text-amber-700 hover:bg-amber-50">
                <RefreshCcw className="h-4 w-4" />
                重新生成
              </Button>
            )}
            {hasGeneratedGames && onViewResults && (
              <Button onClick={onViewResults} variant="outline" className="h-10 rounded-lg border-slate-200 bg-white text-sm font-black text-slate-700 hover:bg-slate-50">
                <LayoutGrid className="h-4 w-4" />
                鏌ョ湅鏈€杩戠敓鎴愮粨鏋?
              </Button>
            )}
          </div>

          {generationError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold leading-6 text-red-700">
              {generationError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameGridPanel({
  title,
  description,
  icon,
  games,
  source,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  scrollTop,
  headerControls,
  getCardAction,
  onScroll,
  onSelectGame,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  games: GameItem[];
  source: GameSource | ((game: GameItem) => GameSource);
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
  scrollTop: number;
  headerControls?: ReactNode;
  getCardAction?: (game: GameItem) => {
    label: string;
    icon: ReactNode;
    tone?: 'danger' | 'rose';
    onAction: () => void;
  } | undefined;
  onScroll: (scrollTop: number) => void;
  onSelectGame: (game: GameItem) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAppliedScrollTopRef = useRef<number | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (lastAppliedScrollTopRef.current === scrollTop) return;
    element.scrollTop = scrollTop;
    lastAppliedScrollTopRef.current = scrollTop;
  }, [scrollTop, games.length]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[220px]">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              {icon}
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
          {headerControls}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar"
        onScroll={(event) => {
          const nextScrollTop = event.currentTarget.scrollTop;
          lastAppliedScrollTopRef.current = nextScrollTop;
          onScroll(nextScrollTop);
        }}
      >
        {games.length === 0 ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center text-slate-400">
            {emptyIcon}
            <p className="text-sm font-semibold text-slate-500">{emptyTitle}</p>
            {emptyDescription && <p className="text-xs text-slate-400">{emptyDescription}</p>}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid grid-cols-[minmax(180px,1.8fr)_minmax(120px,1fr)_minmax(120px,0.9fr)_64px_70px_80px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
              <span>游戏</span>
              <span>目标</span>
              <span>场地 / 人数</span>
              <span>时长</span>
              <span>强度</span>
              <span className="text-right">操作</span>
            </div>
            {games.map((game) => {
              const cardSource = typeof source === 'function' ? source(game) : source;
              const cardAction = getCardAction?.(game);
              return (
                <CompactGameRow
                  key={game.id}
                  game={game}
                  source={cardSource}
                  onClick={() => onSelectGame(game)}
                  actionLabel={cardAction?.label}
                  actionIcon={cardAction?.icon}
                  actionTone={cardAction?.tone}
                  onAction={cardAction?.onAction}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AiLandingPanel({
  games,
  selectedGame,
  selectedSource,
  isGenerating,
  saveMessage,
  isFavorite,
  onSelectGame,
  onCancelPreview,
  onSaveAi,
  onToggleFavorite,
  renderForm,
  onOpenForm,
  onViewResults,
}: {
  games: GameItem[];
  selectedGame?: GameItem;
  selectedSource: GameSource;
  isGenerating: boolean;
  saveMessage: string;
  isFavorite: boolean;
  onSelectGame: (game: GameItem) => void;
  onCancelPreview: () => void;
  onSaveAi: (game: GameItem) => void;
  onToggleFavorite: () => void;
  renderForm: () => ReactNode;
  onOpenForm: () => void;
  onViewResults: () => void;
}) {
  if (isGenerating) {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="shrink-0 border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI生成游戏
          </h2>
          <p className="mt-1 text-xs text-slate-500">正在生成新的课堂游戏方案</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500 ring-1 ring-amber-100">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div>
              <p className="text-base font-black text-slate-700">正在制作中</p>
              <p className="mt-1 text-sm text-slate-400">AI 正在整理游戏规则、场地布置和安全提示</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedGame && selectedSource === 'ai') {
    return (
      <FullGameDetail
        game={selectedGame}
        source="ai"
        isFavorite={isFavorite}
        saveMessage={saveMessage}
        onCancelPreview={onCancelPreview}
        onSaveAi={onSaveAi}
        onToggleFavorite={onToggleFavorite}
      />
    );
  }

  if (games.length === 0) {
    return <>{renderForm()}</>;
  }

  return (
    <GameGridPanel
      title="AI生成游戏"
      description={`最近生成 ${games.length} 个游戏，点击卡片进入详情页`}
      icon={<Sparkles className="h-5 w-5 text-amber-500" />}
      games={games}
      source="ai"
      emptyIcon={<Sparkles className="h-12 w-12 text-amber-300" />}
      emptyTitle="填写条件后生成课堂游戏"
      emptyDescription="生成后点击任意游戏卡片即可进入详情页"
      scrollTop={0}
      headerControls={
        <Button onClick={onOpenForm} variant="outline" className="h-9 rounded-lg border-amber-200 bg-amber-50 text-xs font-black text-amber-700 hover:bg-amber-100">
          <Sparkles className="h-4 w-4" />
          重新设置生成
        </Button>
      }
      onScroll={() => undefined}
      onSelectGame={onSelectGame}
    />
  );
}

function GameDetail({
  game,
  source,
  isFavorite,
  onCancelPreview,
  onSaveAi,
  onToggleFavorite,
}: {
  game?: GameItem;
  source: GameSource;
  isFavorite: boolean;
  onCancelPreview: () => void;
  onSaveAi: (game: GameItem) => void;
  onToggleFavorite: () => void;
}) {

  if (!game) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400">
        <LayoutGrid className="mb-3 h-12 w-12 opacity-30" />
        <p className="text-sm font-semibold">请选择一个游戏查看详情</p>
      </div>
    );
  }

  const origin = getGameOrigin(game);
  const isCustom = origin === 'custom';
  const isAiGenerated = origin === 'ai';
  const isBuiltIn = origin === 'seed';
  const durationDisplay = game.metrics.estimated_duration_min > 0 ? `${game.metrics.estimated_duration_min} min` : '—';


  return (
    <div className="space-y-4 pb-20 [transform:translateZ(0)]">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[260px] flex-1">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-2xl font-black leading-tight text-slate-950">{game.title}</h2>
              {isAiGenerated && <Badge className="rounded-md bg-amber-500 text-white">AI 生成</Badge>}
              {isCustom && <Badge className="rounded-md bg-emerald-600 text-white">自建</Badge>}
            </div>
            <p className="text-sm leading-6 text-slate-600">{game.brief_description || <EmptyHint />}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelPreview}
              className="h-7 gap-1 rounded-md border-slate-300 px-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              title="取消预览"
            >
              <X className="h-3.5 w-3.5" />
              取消预览
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFavorite}
              className={cn(
                'h-7 gap-1 rounded-md px-2 text-xs font-bold',
                isFavorite
                  ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'border-slate-300 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
              )}
              title={isFavorite ? '取消收藏' : '收藏'}
            >
              <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-rose-500')} />
              {isFavorite ? '已收藏' : '收藏'}
            </Button>
            <Badge variant="outline" className="h-7 rounded-md border-slate-300 px-2.5 text-slate-600">{game.id}</Badge>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="text-[11px] font-bold text-slate-400">时长</div><div className="text-base font-black text-slate-900">{durationDisplay}</div></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="text-[11px] font-bold text-slate-400">强度</div><div className="text-base font-black text-slate-900">{game.metrics.intensity_level}</div></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="text-[11px] font-bold text-slate-400">心率区间</div><div className="text-base font-black text-slate-900">{game.metrics.heart_rate_zone}</div></div>
        </div>
      </div>

      <InfoBlock title="核心标签" className="!p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <TagList items={game.tags.targets} tone="teal" />
          <TagList items={game.tags.space_type} />
          <TagList items={game.tags.group_size} tone="amber" />
          <TagList items={[game.tags.equipment_level, ...game.tags.age_groups]} />
        </div>
      </InfoBlock>

      <div className="grid grid-cols-[6fr_4fr] gap-4">
        <InfoBlock title="玩法步骤 (Execution)">
          <p className="mb-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{game.execution.organization_strategy}</p>
          <ol className="space-y-2">
            {game.execution.rules_steps.map((step, index) => (
              <li key={step} className="flex gap-2 text-sm leading-6 text-slate-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </InfoBlock>
        <InfoBlock title="场地与器材 (Setup)">
          <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{game.setup.layout_instructions}</div>
          <ul className="space-y-2">
            {game.setup.equipment_list.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />{item}</li>)}
          </ul>
        </InfoBlock>
      </div>

      <section className="rounded-lg border-2 border-red-300 bg-red-50 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-red-700"><AlertTriangle className="h-5 w-5" /><h3 className="text-sm font-black">安全警示 safety_warnings</h3></div>
        <div className="space-y-2">
          {game.execution.safety_warnings.map((warning) => <div key={warning} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-red-700">{warning}</div>)}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <InfoBlock title="提高难度"><p className="text-sm leading-6 text-slate-700">{game.coaching_adjustments.progression_harder}</p></InfoBlock>
        <InfoBlock title="降低难度"><p className="text-sm leading-6 text-slate-700">{game.coaching_adjustments.regression_easier}</p></InfoBlock>
      </div>

      {source === 'ai' && (
        <div className="sticky bottom-0 -mx-5 border-t border-amber-200 bg-white px-5 py-3 shadow-[0_-2px_8px_rgba(15,23,42,0.06)]">
          <Button onClick={() => onSaveAi(game)} className="h-10 w-full rounded-lg bg-amber-500 text-sm font-black text-white hover:bg-amber-600">
            <Star className="h-4 w-4 fill-white" />
            查看我的游戏库记录
          </Button>
        </div>
      )}
    </div>
  );
}

export function GameLibraryWorkbench() {
  const { generate } = useAIProvider();
  const { providers, activeProviderId } = useAppStore();
  const activeProvider = providers[activeProviderId];
  const [storedViewState] = useState(() => readStoredWorkbenchViewState());
  const hiddenSeedGameIdsRef = useRef<string[]>([]);
  const [libraryGames, setLibraryGames] = useState<GameItem[]>(librarySeed);
  const [favoriteGames, setFavoriteGames] = useState<GameItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabMode>(storedViewState.activeTab);
  const [libraryView, setLibraryView] = useState<GameListViewState>(storedViewState.library);
  const [favoritesView, setFavoritesView] = useState<GameListViewState>(storedViewState.favorites);
  const selectedGameId = useAppStore((s) => s.selectedGameId);
  const selectedSource = useAppStore((s) => s.selectedGameSource) as GameSource;
  const setSelectedGameId = useAppStore((s) => s.setSelectedGameId);
  const setSelectedGameSource = useAppStore((s) => s.setSelectedGameSource);
  const [aiForm, setAiForm] = useState<AiFormState>({ groupSize: '', spaceType: '', equipment: '', target: '', context: '' });
  const [aiGames, setAiGames] = useState<GameItem[]>([]);
  const [aiViewMode, setAiViewMode] = useState<AiViewMode>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRound, setGenerationRound] = useState(1);
  const [generationError, setGenerationError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const libraryFilterOptions = useMemo(() => ({
    targets: uniqueValues('targets', libraryGames),
    space_type: uniqueValues('space_type', libraryGames),
    group_size: uniqueValues('group_size', libraryGames),
  }), [libraryGames]);

  const favoriteFilterOptions = useMemo(() => ({
    targets: uniqueValues('targets', favoriteGames),
    space_type: uniqueValues('space_type', favoriteGames),
    group_size: uniqueValues('group_size', favoriteGames),
  }), [favoriteGames]);

  const filteredLibraryGames = useMemo(() => {
    const keyword = libraryView.searchTerm.trim().toLowerCase();
    return libraryGames.filter((game) => {
      const searchable = [game.title, game.brief_description, game.tags.targets.join(' '), game.tags.space_type.join(' '), game.tags.group_size.join(' '), game.tags.age_groups.join(' ')].join(' ').toLowerCase();
      return (!keyword || searchable.includes(keyword)) && hasEverySelected(game.tags.targets, libraryView.selectedTargets) && hasEverySelected(game.tags.space_type, libraryView.selectedSpaces) && hasEverySelected(game.tags.group_size, libraryView.selectedGroups);
    });
  }, [libraryGames, libraryView.searchTerm, libraryView.selectedGroups, libraryView.selectedSpaces, libraryView.selectedTargets]);

  const filteredFavoriteGames = useMemo(() => {
    const keyword = favoritesView.searchTerm.trim().toLowerCase();
    return favoriteGames.filter((game) => {
      const searchable = [game.title, game.brief_description, game.tags.targets.join(' '), game.tags.space_type.join(' '), game.tags.group_size.join(' '), game.tags.age_groups.join(' ')].join(' ').toLowerCase();
      return (!keyword || searchable.includes(keyword)) && hasEverySelected(game.tags.targets, favoritesView.selectedTargets) && hasEverySelected(game.tags.space_type, favoritesView.selectedSpaces) && hasEverySelected(game.tags.group_size, favoritesView.selectedGroups);
    });
  }, [favoriteGames, favoritesView.searchTerm, favoritesView.selectedGroups, favoritesView.selectedSpaces, favoritesView.selectedTargets]);

  const selectedGame = useMemo(() => {
    if (!selectedGameId) return undefined;
    const knownGames = [...aiGames, ...libraryGames, ...favoriteGames];
    return knownGames.find((game) => game.id === selectedGameId);
  }, [aiGames, favoriteGames, libraryGames, selectedGameId]);

  const libraryFilterCount = libraryView.selectedTargets.length + libraryView.selectedSpaces.length + libraryView.selectedGroups.length + (libraryView.searchTerm.trim() ? 1 : 0);
  const favoriteFilterCount = favoritesView.selectedTargets.length + favoritesView.selectedSpaces.length + favoritesView.selectedGroups.length + (favoritesView.searchTerm.trim() ? 1 : 0);
  const isSelectedFavorite = Boolean(selectedGame && favoriteGames.some((game) => game.id === selectedGame.id));
  const isLibraryPreview = Boolean(activeTab === 'library' && selectedGame && libraryGames.some((game) => game.id === selectedGame.id));
  const isFavoritesPreview = Boolean(activeTab === 'favorites' && selectedGame && favoriteGames.some((game) => game.id === selectedGame.id));

  const resolveFavoriteSource = (game: GameItem): GameSource => game.id.startsWith('ai_') ? 'ai' : 'local';

  useEffect(() => {
    writeStoredWorkbenchViewState({
      activeTab,
      library: libraryView,
      favorites: favoritesView,
    });
  }, [activeTab, favoritesView, libraryView]);

  useEffect(() => {
    let alive = true;
    Promise.all([loadUserGamesFromStorage(), loadFavoriteGamesFromStorage(), loadHiddenSeedGameIdsFromStorage()]).then(([userGames, favorites, hiddenIds]) => {
      if (!alive) return;
      hiddenSeedGameIdsRef.current = hiddenIds;
      setLibraryGames(mergeLibraryWithUserGames(librarySeed, userGames, hiddenIds));
      setFavoriteGames(favorites);
    });
    return () => {
      alive = false;
    };
  }, []);

  const updateLibraryView = (patch: Partial<GameListViewState>) => {
    setLibraryView((current) => ({ ...current, ...patch }));
  };

  const updateFavoritesView = (patch: Partial<GameListViewState>) => {
    setFavoritesView((current) => ({ ...current, ...patch }));
  };

  const resetLibraryFilters = () => {
    setLibraryView((current) => ({
      ...current,
      searchTerm: '',
      selectedTargets: [],
      selectedSpaces: [],
      selectedGroups: [],
      scrollTop: 0,
    }));
  };

  const resetFavoriteFilters = () => {
    setFavoritesView((current) => ({
      ...current,
      searchTerm: '',
      selectedTargets: [],
      selectedSpaces: [],
      selectedGroups: [],
      scrollTop: 0,
    }));
  };

  const openTab = (tab: TabMode) => {
    setActiveTab(tab);
    setSaveMessage('');
    if (tab === 'library') {
      setSelectedGameId('');
      setSelectedGameSource('local');
    }
    if (tab === 'favorites') {
      setSelectedGameId('');
      setSelectedGameSource('local');
    }
    if (tab === 'ai') {
      setSelectedGameId('');
      setSelectedGameSource('ai');
      setAiViewMode(aiGames.length > 0 ? 'result' : 'form');
    }
  };

  const handleGenerate = async () => {
    setActiveTab('ai');
    setAiViewMode('result');
    setIsGenerating(true);
    setGenerationError('');
    setSaveMessage('');
    const loadingStartedAt = Date.now();

    try {
      const latestState = useAppStore.getState();
      const latestProvider = latestState.providers[latestState.activeProviderId];
      if (!latestProvider) {
        throw new Error('未找到当前 AI 模型配置，请先在设置中选择模型。');
      }
      if (latestState.activeProviderId !== 'gemini' && !latestProvider.apiKey) {
        throw new Error(`当前使用 ${latestProvider.name}，但尚未配置 API Key。请在右上角“设置 > AI 模型”中填写。`);
      }
      if (latestState.activeProviderId === 'gemini' && !latestProvider.apiKey && !process.env.GEMINI_API_KEY) {
        throw new Error('当前使用 Google Gemini，但尚未配置 API Key。请在右上角“设置 > AI 模型”中填写，或配置 GEMINI_API_KEY。');
      }

      const { systemPrompt, userPrompt } = buildGameGenerationPrompt(aiForm);
      const text = await generate(systemPrompt, userPrompt);
      if (!text.trim()) {
        throw new Error(`${latestProvider.name} 没有返回内容，请检查模型名称、API Key 或 Base URL。`);
      }
      const elapsed = Date.now() - loadingStartedAt;
      if (elapsed < 3000) {
        await new Promise((resolve) => window.setTimeout(resolve, 3000 - elapsed));
      }

      const generatedGames = extractJsonArray(text);
      if (generatedGames.length !== 4) {
        throw new Error(`AI 返回了 ${generatedGames.length} 个游戏，结果页要求固定展示 4 个，请重新生成。`);
      }
      const nextRound = generationRound + 1;
      const nextGames = generatedGames.map((game, index) => ({
        ...game,
        id: game.id.startsWith('ai_') ? `${game.id}_${nextRound}` : `ai_game_${nextRound}_${index + 1}`,
      }));
      setGenerationRound(nextRound);
      setAiGames(nextGames);
      setSelectedGameId('');
      setSelectedGameSource('ai');
      setAiViewMode('result');
    } catch (error: any) {
      setGenerationError(error?.message || 'AI 生成失败，请检查 API 设置后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAiGame = (aiGame: GameItem) => {
    if (!aiGame || getGameOrigin(aiGame) !== 'ai') return;
    if (libraryGames.some((game) => game.id === aiGame.id || (game as GameItem & { source_ai_game_id?: string }).source_ai_game_id === aiGame.id)) {
      setActiveTab('library');
      setSaveMessage('这个 AI 游戏已经自动记录在我的游戏库。');
      window.setTimeout(() => setSaveMessage(''), 3600);
      return;
    }
    const savedGame = { ...aiGame, id: `saved_${Date.now()}`, source_ai_game_id: aiGame.id };
    setLibraryGames((current) => {
      const next = [savedGame, ...current];
      void persistUserGames(next, seedIds);
      return next;
    });
    setSelectedGameId(savedGame.id);
    setSelectedGameSource('local');
    setActiveTab('library');
    setSaveMessage('已加入游戏库，并保存到本地 JSON 库。');
    window.setTimeout(() => setSaveMessage(''), 3600);
  };

  const handleCreateGame = (game: GameItem) => {
    setLibraryGames((current) => {
      const next = [game, ...current];
      void persistUserGames(next, seedIds);
      return next;
    });
    setSelectedGameId(game.id);
    setSelectedGameSource('local');
    setActiveTab('library');
    setSaveMessage('游戏已创建并保存到本地 JSON 库。');
    window.setTimeout(() => setSaveMessage(''), 3600);
  };

  const deleteLibraryGame = (game: GameItem) => {
    const isSeedGame = seedIds.has(game.id);
    if (isSeedGame && !window.confirm(`"${game.title}"是内置游戏。删除后会从我的游戏库隐藏，并同步移出收藏库。是否继续？`)) return;
    if (!isSeedGame && !window.confirm(`确定要删除游戏"${game.title}"吗？此操作会同步移出收藏库。`)) return;
    if (isSeedGame) {
      const nextHiddenIds = Array.from(new Set([...hiddenSeedGameIdsRef.current, game.id]));
      hiddenSeedGameIdsRef.current = nextHiddenIds;
      void persistHiddenSeedGameIds(nextHiddenIds);
    }
    setLibraryGames((current) => {
      const next = current.filter((item) => item.id !== game.id);
      void persistUserGames(next, seedIds);
      return next;
    });
    setFavoriteGames((current) => {
      const next = current.filter((item) => item.id !== game.id);
      if (next.length !== current.length) {
        void persistFavoriteGames(next);
      }
      return next;
    });
    setAiGames((current) => current.filter((item) => item.id !== game.id));
    if (selectedGameId === game.id) {
      setSelectedGameId('');
    }
    setSaveMessage('游戏已删除。');
    window.setTimeout(() => setSaveMessage(''), 2400);
  };

  const unfavoriteGame = (game: GameItem) => {
    setFavoriteGames((current) => {
      const next = current.filter((item) => item.id !== game.id);
      void persistFavoriteGames(next);
      return next;
    });
    if (activeTab === 'favorites' && selectedGameId === game.id) {
      setSelectedGameId('');
    }
    setSaveMessage('已取消收藏。');
    window.setTimeout(() => setSaveMessage(''), 2400);
  };

  const pickGame = (game: GameItem, source: GameSource) => {
    setSelectedGameId(game.id);
    setSelectedGameSource(source);
    setSaveMessage('');
  };

  const handleCancelPreview = () => {
    setSelectedGameId('');
    setSaveMessage('');
  };

  const toggleSelectedFavorite = () => {
    if (!selectedGame) return;
    const wasFavorite = isSelectedFavorite;
    setFavoriteGames((current) => {
      const exists = current.some((game) => game.id === selectedGame.id);
      const next = exists ? current.filter((game) => game.id !== selectedGame.id) : [selectedGame, ...current];
      void persistFavoriteGames(next);
      return next;
    });
    if (wasFavorite && activeTab === 'favorites') {
      setSelectedGameId('');
    }
    setSaveMessage(wasFavorite ? '已取消收藏。' : '已加入游戏收藏库。');
    window.setTimeout(() => setSaveMessage(''), 2400);
  };

  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 shadow-sm">
      <aside className="min-h-0 w-[25%] shrink-0 overflow-hidden border-r border-slate-200 bg-white">
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-4 custom-scrollbar">
          <SidebarNavButton
            active={activeTab === 'ai'}
            icon={<Sparkles className="h-4 w-4 shrink-0 text-amber-500" />}
            label="AI生成游戏"
            count={aiGames.length}
            tone="amber"
            onClick={() => openTab('ai')}
          />
          <SidebarNavButton
            active={activeTab === 'library'}
            icon={<BookOpen className="h-4 w-4 shrink-0 text-primary-500" />}
            label="我的游戏库"
            count={libraryGames.length}
            tone="primary"
            onClick={() => openTab('library')}
          />
          <SidebarNavButton
            active={activeTab === 'favorites'}
            icon={<Heart className="h-4 w-4 shrink-0 text-rose-500" />}
            label="游戏收藏库"
            count={favoriteGames.length}
            tone="rose"
            onClick={() => openTab('favorites')}
          />
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-hidden bg-white">
        {activeTab === 'ai' && (
          aiViewMode === 'form' && !isGenerating ? (
            <AiGeneratePanel
              activeProvider={activeProvider}
              activeProviderId={activeProviderId}
              aiForm={aiForm}
              generationError={generationError}
              hasGeneratedGames={aiGames.length > 0}
              onAiFormChange={setAiForm}
              onGenerate={handleGenerate}
              onViewResults={aiGames.length > 0 ? () => {
                setSelectedGameId('');
                setSelectedGameSource('ai');
                setAiViewMode('result');
              } : undefined}
            />
          ) : (
            <AiLandingPanel
              games={aiGames}
              selectedGame={selectedGame}
              selectedSource={selectedSource}
              isGenerating={isGenerating}
              saveMessage={saveMessage}
              isFavorite={isSelectedFavorite}
              onSelectGame={(game) => pickGame(game, 'ai')}
              onCancelPreview={handleCancelPreview}
              onSaveAi={saveAiGame}
              onToggleFavorite={toggleSelectedFavorite}
              renderForm={() => (
                <AiGeneratePanel
                  activeProvider={activeProvider}
                  activeProviderId={activeProviderId}
                  aiForm={aiForm}
                  generationError={generationError}
                  hasGeneratedGames={aiGames.length > 0}
                  onAiFormChange={setAiForm}
                  onGenerate={handleGenerate}
                  onViewResults={aiGames.length > 0 ? () => {
                    setSelectedGameId('');
                    setSelectedGameSource('ai');
                    setAiViewMode('result');
                  } : undefined}
                />
              )}
              onOpenForm={() => {
                setSelectedGameId('');
                setAiViewMode('form');
              }}
              onViewResults={() => {
                setSelectedGameId('');
                setSelectedGameSource('ai');
                setAiViewMode('result');
              }}
            />
          )
        )}

        {activeTab === 'library' && (
          isLibraryPreview && selectedGame ? (
            <FullGameDetail
              game={selectedGame}
              source={selectedSource}
              isFavorite={isSelectedFavorite}
              saveMessage={saveMessage}
              onCancelPreview={handleCancelPreview}
              onSaveAi={saveAiGame}
              onToggleFavorite={toggleSelectedFavorite}
            />
          ) : (
            <GameGridPanel
              title="我的游戏库"
              description={libraryView.searchTerm.trim() ? `搜索“${libraryView.searchTerm.trim()}”，找到 ${filteredLibraryGames.length} 个 / 共 ${libraryGames.length} 个` : `共 ${libraryGames.length} 个游戏，点击卡片进入详情页`}
              icon={<BookOpen className="h-5 w-5 text-primary-500" />}
              games={filteredLibraryGames}
              source="local"
              emptyIcon={<Search className="h-12 w-12 text-slate-200" />}
              emptyTitle={libraryView.searchTerm.trim() || libraryFilterCount > 0 ? '没有匹配的体育游戏' : '暂无游戏数据'}
              scrollTop={libraryView.scrollTop}
              headerControls={
                <LibrarySearchControls
                  searchTerm={libraryView.searchTerm}
                  selectedTargets={libraryView.selectedTargets}
                  selectedSpaces={libraryView.selectedSpaces}
                  selectedGroups={libraryView.selectedGroups}
                  filterOptions={libraryFilterOptions}
                  activeFilterCount={libraryFilterCount}
                  compact
                  onSearchTermChange={(searchTerm) => updateLibraryView({ searchTerm, scrollTop: 0 })}
                  onSelectedTargetsChange={(selectedTargets) => updateLibraryView({ selectedTargets, scrollTop: 0 })}
                  onSelectedSpacesChange={(selectedSpaces) => updateLibraryView({ selectedSpaces, scrollTop: 0 })}
                  onSelectedGroupsChange={(selectedGroups) => updateLibraryView({ selectedGroups, scrollTop: 0 })}
                  onResetFilters={resetLibraryFilters}
                  onCreateGame={handleCreateGame}
                />
              }
              getCardAction={(game) => ({
                label: '删除',
                icon: <Trash2 className="h-3.5 w-3.5" />,
                tone: 'danger',
                onAction: () => deleteLibraryGame(game),
              })}
              onScroll={(scrollTop) => updateLibraryView({ scrollTop })}
              onSelectGame={(game) => pickGame(game, 'local')}
            />
          )
        )}

        {activeTab === 'favorites' && (
          isFavoritesPreview && selectedGame ? (
            <FullGameDetail
              game={selectedGame}
              source={selectedSource}
              isFavorite={isSelectedFavorite}
              saveMessage={saveMessage}
              onCancelPreview={handleCancelPreview}
              onSaveAi={saveAiGame}
              onToggleFavorite={toggleSelectedFavorite}
            />
          ) : (
            <GameGridPanel
              title="游戏收藏库"
              description={favoritesView.searchTerm.trim() ? `搜索“${favoritesView.searchTerm.trim()}”，找到 ${filteredFavoriteGames.length} 个 / 共 ${favoriteGames.length} 个` : `共 ${favoriteGames.length} 个收藏游戏，点击卡片进入详情页`}
              icon={<Heart className="h-5 w-5 text-rose-500" />}
              games={filteredFavoriteGames}
              source={resolveFavoriteSource}
              emptyIcon={<Heart className="h-12 w-12 text-rose-200" />}
              emptyTitle={favoritesView.searchTerm.trim() || favoriteFilterCount > 0 ? '没有匹配的收藏游戏' : '暂无收藏的游戏'}
              emptyDescription="在游戏详情页点击收藏即可添加"
              scrollTop={favoritesView.scrollTop}
              headerControls={
                <LibrarySearchControls
                  searchTerm={favoritesView.searchTerm}
                  selectedTargets={favoritesView.selectedTargets}
                  selectedSpaces={favoritesView.selectedSpaces}
                  selectedGroups={favoritesView.selectedGroups}
                  filterOptions={favoriteFilterOptions}
                  activeFilterCount={favoriteFilterCount}
                  compact
                  onSearchTermChange={(searchTerm) => updateFavoritesView({ searchTerm, scrollTop: 0 })}
                  onSelectedTargetsChange={(selectedTargets) => updateFavoritesView({ selectedTargets, scrollTop: 0 })}
                  onSelectedSpacesChange={(selectedSpaces) => updateFavoritesView({ selectedSpaces, scrollTop: 0 })}
                  onSelectedGroupsChange={(selectedGroups) => updateFavoritesView({ selectedGroups, scrollTop: 0 })}
                  onResetFilters={resetFavoriteFilters}
                  onCreateGame={handleCreateGame}
                />
              }
              getCardAction={(game) => ({
                label: '取消收藏',
                icon: <Heart className="h-3.5 w-3.5 fill-rose-500" />,
                tone: 'rose',
                onAction: () => unfavoriteGame(game),
              })}
              onScroll={(scrollTop) => updateFavoritesView({ scrollTop })}
              onSelectGame={(game) => pickGame(game, resolveFavoriteSource(game))}
            />
          )
        )}
      </main>
    </div>
  );
}
