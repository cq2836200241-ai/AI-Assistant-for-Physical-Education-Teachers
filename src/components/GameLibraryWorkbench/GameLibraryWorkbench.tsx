import { useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Clock3,
  Download,
  Gauge,
  LayoutGrid,
  Loader2,
  MapPin,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  Users,
  X,
} from 'lucide-react';
import gameData from '../../date/large_class_games.json';
import { CreateGameDialog } from './CreateGameDialog';
import type { GameItem } from '../../types/gameItem';
import { loadUserGamesFromStorage, mergeLibraryWithUserGames, persistUserGames } from '../../utils/gameLibraryStorage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { useAIProvider } from '../../hooks/useAIProvider';
import { useAppStore } from '../../store/appStore';

type FilterKey = 'targets' | 'space_type' | 'group_size';
type GameSource = 'local' | 'ai';
type TabMode = 'library' | 'ai';

const librarySeed = gameData as GameItem[];
const seedIds = new Set(librarySeed.map((game) => game.id));

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

function GameCard({ game, active, source, onClick }: { game: GameItem; active: boolean; source: GameSource; onClick: () => void }) {
  const isCustom = game.id.startsWith('custom_');
  const durationLabel = game.metrics.estimated_duration_min > 0 ? `${game.metrics.estimated_duration_min} 分钟` : '—';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex min-h-[168px] flex-col rounded-lg border bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg',
        active ? 'border-primary-300 ring-2 ring-primary-100' : 'border-slate-200',
        isCustom && 'border-emerald-200'
      )}
    >
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
        <TagList items={game.tags.targets.slice(0, 2)} tone={source === 'ai' ? 'amber' : 'teal'} />
        {source === 'ai' && <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 text-[11px] font-bold text-amber-700">AI</span>}
        {isCustom && <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-[11px] font-bold text-emerald-700">自建</span>}
      </div>
    </button>
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

function GameDetail({ game, source, onSaveAi }: { game?: GameItem; source: GameSource; onSaveAi: () => void }) {
  const detailRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  if (!game) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400">
        <LayoutGrid className="mb-3 h-12 w-12 opacity-30" />
        <p className="text-sm font-semibold">请选择一个游戏查看详情</p>
      </div>
    );
  }

  const isCustom = game.id.startsWith('custom_');
  const durationDisplay = game.metrics.estimated_duration_min > 0 ? `${game.metrics.estimated_duration_min} min` : '—';

  const handleScreenshot = async () => {
    if (!detailRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      if (window.desktopCapture?.saveElementScreenshot) {
        const rect = detailRef.current.getBoundingClientRect();
        await window.desktopCapture.saveElementScreenshot({
          filename: `${game.title}.png`,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        });
        return;
      }

      // 第一步：先弹出另存为对话框（必须在用户手势上下文中调用）
      let fileHandle: any = null;
      if ('showSaveFilePicker' in window) {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: `${game.title}.png`,
          types: [{
            description: 'PNG 图片',
            accept: { 'image/png': ['.png'] },
          }],
        });
      }

      // 第二步：截图（不设固定宽高，让 html2canvas 自动适配元素实际尺寸）
      const canvas = await html2canvas(detailRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas 转 Blob 失败'));
        }, 'image/png');
      });

      // 第三步：写入文件
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // 降级方案：自动下载
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${game.title}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error: any) {
      // 用户取消保存（AbortError）不做处理
      if (error?.name === 'AbortError') return;
      console.error('截图保存失败:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div ref={detailRef} className="space-y-4 pb-20">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-2xl font-black leading-tight text-slate-950">{game.title}</h2>
              {source === 'ai' && <Badge className="rounded-md bg-amber-500 text-white">AI 生成</Badge>}
              {isCustom && <Badge className="rounded-md bg-emerald-600 text-white">自建</Badge>}
            </div>
            <p className="text-sm leading-6 text-slate-600">{game.brief_description || <EmptyHint />}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScreenshot}
              disabled={isCapturing}
              className="h-7 gap-1 rounded-md border-slate-300 px-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              title="保存为图片"
            >
              <Download className="h-3.5 w-3.5" />
              {isCapturing ? '截图中...' : '截图'}
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
        <div className="sticky bottom-0 -mx-5 border-t border-amber-200 bg-white/95 px-5 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
          <Button onClick={onSaveAi} className="h-10 w-full rounded-lg bg-amber-500 text-sm font-black text-white hover:bg-amber-600">
            <Star className="h-4 w-4 fill-white" />
            加入游戏库
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
  const [libraryGames, setLibraryGames] = useState<GameItem[]>(librarySeed);
  const [activeTab, setActiveTab] = useState<TabMode>('library');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedGameId, setSelectedGameId] = useState(librarySeed[0]?.id ?? '');
  const [selectedSource, setSelectedSource] = useState<GameSource>('local');
  const [aiForm, setAiForm] = useState<AiFormState>({ groupSize: '', spaceType: '', equipment: '', target: '', context: '' });
  const [aiGames, setAiGames] = useState<GameItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRound, setGenerationRound] = useState(1);
  const [generationError, setGenerationError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const filterOptions = useMemo(() => ({
    targets: uniqueValues('targets', libraryGames),
    space_type: uniqueValues('space_type', libraryGames),
    group_size: uniqueValues('group_size', libraryGames),
  }), [libraryGames]);

  const filteredGames = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return libraryGames.filter((game) => {
      const searchable = [game.title, game.brief_description, game.tags.targets.join(' '), game.tags.space_type.join(' '), game.tags.group_size.join(' '), game.tags.age_groups.join(' ')].join(' ').toLowerCase();
      return (!keyword || searchable.includes(keyword)) && hasEverySelected(game.tags.targets, selectedTargets) && hasEverySelected(game.tags.space_type, selectedSpaces) && hasEverySelected(game.tags.group_size, selectedGroups);
    });
  }, [libraryGames, searchTerm, selectedGroups, selectedSpaces, selectedTargets]);

  const selectedGame = useMemo(() => {
    const sourceList = selectedSource === 'ai' ? aiGames : libraryGames;
    return sourceList.find((game) => game.id === selectedGameId) ?? (selectedSource === 'ai' ? aiGames[0] : filteredGames[0]) ?? libraryGames[0];
  }, [aiGames, filteredGames, libraryGames, selectedGameId, selectedSource]);

  const activeFilterCount = selectedTargets.length + selectedSpaces.length + selectedGroups.length + (searchTerm.trim() ? 1 : 0);

  useEffect(() => {
    let alive = true;
    loadUserGamesFromStorage().then((userGames) => {
      if (!alive) return;
      if (userGames.length > 0) {
        setLibraryGames(mergeLibraryWithUserGames(librarySeed, userGames));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTargets([]);
    setSelectedSpaces([]);
    setSelectedGroups([]);
  };

  const handleGenerate = async () => {
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
      const nextRound = generationRound + 1;
      const nextGames = generatedGames.map((game, index) => ({
        ...game,
        id: game.id.startsWith('ai_') ? `${game.id}_${nextRound}` : `ai_game_${nextRound}_${index + 1}`,
      }));
      setGenerationRound(nextRound);
      setAiGames(nextGames);
      setSelectedGameId(nextGames[0].id);
      setSelectedSource('ai');
    } catch (error: any) {
      setGenerationError(error?.message || 'AI 生成失败，请检查 API 设置后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAiGame = () => {
    if (!selectedGame || selectedSource !== 'ai') return;
    const savedGame = { ...selectedGame, id: `saved_${Date.now()}` };
    setLibraryGames((current) => {
      const next = [savedGame, ...current];
      void persistUserGames(next, seedIds);
      return next;
    });
    setSelectedGameId(savedGame.id);
    setSelectedSource('local');
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
    setSelectedSource('local');
    setActiveTab('library');
    setSaveMessage('游戏已创建并保存到本地 JSON 库。');
    window.setTimeout(() => setSaveMessage(''), 3600);
  };

  const pickGame = (game: GameItem, source: GameSource) => {
    setSelectedGameId(game.id);
    setSelectedSource(source);
    setSaveMessage('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-100 text-slate-900">

      <div className="grid min-h-0 flex-1 overflow-hidden grid-cols-[40fr_60fr]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50">
          <div className="shrink-0 border-b border-slate-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              <button onClick={() => setActiveTab('library')} className={cn('h-9 rounded-md text-sm font-black transition-all', activeTab === 'library' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>📚 我的游戏库</button>
              <button onClick={() => setActiveTab('ai')} className={cn('h-9 rounded-md text-sm font-black transition-all', activeTab === 'ai' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>✨ AI 灵感引擎</button>
            </div>

            {activeTab === 'library' ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[260px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜索游戏名称、描述、目标或场地..." className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-9 text-sm focus-visible:bg-white" />
                </div>
                <FilterDropdown label="目标筛选" icon={<Target className="h-4 w-4 text-primary-600" />} options={filterOptions.targets} selected={selectedTargets} onChange={setSelectedTargets} />
                <FilterDropdown label="场地筛选" icon={<MapPin className="h-4 w-4 text-sky-600" />} options={filterOptions.space_type} selected={selectedSpaces} onChange={setSelectedSpaces} />
                <FilterDropdown label="人数筛选" icon={<Users className="h-4 w-4 text-amber-600" />} options={filterOptions.group_size} selected={selectedGroups} onChange={setSelectedGroups} />
                {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 px-3 text-slate-500 hover:text-rose-600"><X className="h-4 w-4" />重置</Button>}
                <CreateGameDialog onCreate={handleCreateGame} />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-bold">当前 API：{activeProvider?.name || '未选择'} / {activeProvider?.model || '未设置模型'}</span>
                  <span className={cn('font-bold', activeProviderId === 'gemini' || activeProvider?.apiKey ? 'text-emerald-600' : 'text-red-600')}>
                    {activeProviderId === 'gemini' || activeProvider?.apiKey ? '已读取配置' : '缺少 API Key'}
                  </span>
                </div>
                <SelectField label="人数" value={aiForm.groupSize} options={selectOptions.groupSize} onChange={(value) => setAiForm((current) => ({ ...current, groupSize: value }))} />
                <SelectField label="场地" value={aiForm.spaceType} options={selectOptions.spaceType} onChange={(value) => setAiForm((current) => ({ ...current, spaceType: value }))} />
                <SelectField label="器材情况" value={aiForm.equipment} options={selectOptions.equipment} onChange={(value) => setAiForm((current) => ({ ...current, equipment: value }))} />
                <SelectField label="主要训练目标" value={aiForm.target} options={selectOptions.target} onChange={(value) => setAiForm((current) => ({ ...current, target: value }))} />
                <label className="col-span-2 block">
                  <span className="mb-1.5 block text-xs font-black text-slate-600">特殊情境补充说明</span>
                  <Textarea value={aiForm.context} onChange={(event) => setAiForm((current) => ({ ...current, context: event.target.value }))} placeholder="例如：雨后地面较滑、班级注意力容易分散、需要低器材高密度..." className="min-h-20 resize-none border-slate-200 bg-white" />
                </label>
                <Button onClick={handleGenerate} disabled={isGenerating} className="col-span-2 h-10 rounded-lg bg-slate-900 text-sm font-black text-white hover:bg-slate-800">
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  🚀 调用 AI 生成游戏
                </Button>
                {generationError && (
                  <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold leading-6 text-red-700">
                    {generationError}
                  </div>
                )}
                {aiGames.length > 0 && !isGenerating && (
                  <Button onClick={handleGenerate} variant="outline" className="col-span-2 h-9 rounded-lg border-amber-200 bg-amber-50 text-sm font-black text-amber-700 hover:bg-amber-100">
                    <RefreshCcw className="h-4 w-4" />
                    不满意，重新生成
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'library' ? (
              filteredGames.length === 0 ? (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
                  <Search className="mb-3 h-10 w-10 opacity-40" />
                  <p className="text-sm font-semibold">没有匹配的体育游戏</p>
                  <button className="mt-2 text-xs font-bold text-primary-600 hover:underline" onClick={resetFilters}>清空筛选条件</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
                  {filteredGames.map((game) => <GameCard key={game.id} game={game} source="local" active={selectedSource === 'local' && game.id === selectedGame?.id} onClick={() => pickGame(game, 'local')} />)}
                </div>
              )
            ) : isGenerating ? (
              <SkeletonResults />
            ) : aiGames.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
                {aiGames.map((game) => <GameCard key={game.id} game={game} source="ai" active={selectedSource === 'ai' && game.id === selectedGame?.id} onClick={() => pickGame(game, 'ai')} />)}
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-amber-200 bg-white text-center text-slate-400">
                <Sparkles className="mb-3 h-12 w-12 text-amber-300" />
                <p className="text-sm font-bold text-slate-500">填写条件后生成 4 个课堂游戏灵感</p>
                <p className="mt-1 text-xs text-slate-400">生成结果会出现在这里，点击任意卡片可在右侧查看详情。</p>
              </div>
            )}
          </div>
        </div>

        <aside className="min-h-0 min-w-0 overflow-y-auto bg-white p-5 custom-scrollbar">
          {saveMessage && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{saveMessage}</div>}
          <GameDetail game={selectedGame} source={selectedSource} onSaveAi={saveAiGame} />
        </aside>
      </div>
    </div>
  );
}
