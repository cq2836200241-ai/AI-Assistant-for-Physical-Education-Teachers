import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Eye, Heart, MapPin, RefreshCw, Target, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  addFavorite,
  removeFavorite,
  isFavorite,
  type LessonPlanV2,
} from '../../utils/lessonPlanStorageV2';

interface RightPanelProps {
  plan: LessonPlanV2 | null;
  showLibrary: boolean;
  showFavorites: boolean;
  plans: LessonPlanV2[];
  favorites: LessonPlanV2[];
  totalPlans: number;
  searchQuery: string;
  loading: boolean;
  libraryScrollTop: number;
  onSelectPlan: (plan: LessonPlanV2) => void;
  onCancelPreview: () => void;
  onLibraryScroll: (scrollTop: number) => void;
  onFavoriteToggled: () => void;
}

/** 扁平化教学过程的每一行 */
interface FlatRow {
  phase: string;       // 环节（如：开始部分）
  step: string;        // 内容/步骤（如：1.1 课堂常规）
  content: string;     // 教学内容
  teacher: string;     // 教师活动
  student: string;     // 学生活动
  safety: string;      // 安全与提示
}

/** 将嵌套的教学过程拍平成表格行 */
function flattenProcess(process: Record<string, any>): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const [phaseKey, phase] of Object.entries(process)) {
    const phaseLabel = phaseKey.replace(/^\d+\.\d+\s*/, '');
    for (const [stepKey, step] of Object.entries(phase as Record<string, any>)) {
      const stepLabel = stepKey.replace(/^\d+\.\d+\s*/, '');
      rows.push({
        phase: phaseLabel,
        step: stepLabel,
        content: step.教学内容 ?? '',
        teacher: step.教师活动 ?? '',
        student: step.学生活动 ?? '',
        safety: step['安全与提示'] ?? '',
      });
    }
  }
  return rows;
}

export function RightPanel({
  plan,
  showLibrary,
  showFavorites,
  plans,
  favorites,
  totalPlans,
  searchQuery,
  loading,
  libraryScrollTop,
  onSelectPlan,
  onCancelPreview,
  onLibraryScroll,
  onFavoriteToggled,
}: RightPanelProps) {
  if (showLibrary) {
    return (
      <LibraryPanel
        plans={plans}
        totalPlans={totalPlans}
        searchQuery={searchQuery}
        loading={loading}
        libraryScrollTop={libraryScrollTop}
        onSelectPlan={onSelectPlan}
        onScroll={onLibraryScroll}
      />
    );
  }

  if (showFavorites) {
    return (
      <FavoritesPanel
        favorites={favorites}
        onSelectPlan={onSelectPlan}
      />
    );
  }

  if (!plan) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-slate-100 p-4">
          <BookOpen className="h-12 w-12 text-slate-300" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-500">请从左侧选择一个教案</p>
          <p className="mt-1 text-sm text-slate-400">
            点击教案列表中的任意一项，即可查看完整内容
          </p>
        </div>
      </div>
    );
  }

  const flatRows = flattenProcess(plan.教学过程);
  const [isFav, setIsFav] = useState(() => isFavorite(plan));

  const handleToggleFav = () => {
    if (isFav) {
      removeFavorite(plan);
      setIsFav(false);
    } else {
      addFavorite(plan);
      setIsFav(true);
    }
    onFavoriteToggled();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="sticky top-0 z-30 flex justify-end gap-2 px-6 pt-4">
        <Button
          variant="outline"
          size="sm"
          className={`h-9 gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-lg backdrop-blur transition-all ${
            isFav
              ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700'
              : 'border-slate-200 bg-white/95 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
          }`}
          onClick={handleToggleFav}
        >
          <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
          {isFav ? '已收藏' : '收藏'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-full border-slate-200 bg-white/95 px-3 text-xs font-semibold text-slate-600 shadow-lg backdrop-blur hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
          onClick={onCancelPreview}
        >
          <X className="h-3.5 w-3.5" />
          取消预览
        </Button>
      </div>

      {/* 顶部信息栏 */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">{plan.课题名称}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {plan.场地与器材.教学场地}
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            {plan.预计运动负荷.平均心率}
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            {plan.预计运动负荷.练习密度}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-6">
        {/* 教学目标 */}
        <MetaSection title="教学目标" icon={<Target className="h-4 w-4 text-blue-500" />}>
          <div className="grid grid-cols-3 gap-3">
            <MetaCard label="运动能力" text={plan.教学目标.运动能力} color="blue" />
            <MetaCard label="健康行为" text={plan.教学目标.健康行为} color="green" />
            <MetaCard label="体育品德" text={plan.教学目标.体育品德} color="amber" />
          </div>
        </MetaSection>

        {/* 教学重难点 */}
        <MetaSection title="教学重难点" icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}>
          <div className="grid grid-cols-2 gap-3">
            <MetaCard label="教学重点" text={plan.教学重难点.教学重点} color="rose" />
            <MetaCard label="教学难点" text={plan.教学重难点.教学难点} color="purple" />
          </div>
        </MetaSection>

        {/* 教学过程表格 */}
        <MetaSection title="教学过程" icon={<BookOpen className="h-4 w-4 text-primary-500" />}>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[80px] whitespace-nowrap text-xs font-bold text-slate-600">
                    环节
                  </TableHead>
                  <TableHead className="w-[100px] whitespace-nowrap text-xs font-bold text-slate-600">
                    内容
                  </TableHead>
                  <TableHead className="min-w-[160px] text-xs font-bold text-slate-600">
                    详细步骤
                  </TableHead>
                  <TableHead className="min-w-[140px] text-xs font-bold text-slate-600">
                    教练指导
                  </TableHead>
                  <TableHead className="min-w-[140px] text-xs font-bold text-slate-600">
                    学生活动
                  </TableHead>
                  <TableHead className="min-w-[120px] whitespace-nowrap text-xs font-bold text-red-600">
                    安全提示
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatRows.map((row, i) => {
                  const isFirstPhaseRow = i === 0 || row.phase !== flatRows[i - 1]?.phase;

                  return (
                  <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <TableCell className="whitespace-nowrap text-xs font-medium text-slate-700">
                      {isFirstPhaseRow ? row.phase : ''}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      {row.step}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {row.content || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {row.teacher || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {row.student || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-red-600">
                      {row.safety ? (
                        <span className="flex items-start gap-1">
                          <span className="mt-0.5 shrink-0">⚠</span>
                          <span>{row.safety}</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </MetaSection>

        {/* 器材 */}
        <MetaSection title="教具器材" icon={<Target className="h-4 w-4 text-slate-500" />}>
          <p className="text-sm text-slate-700">{plan.场地与器材.教具器材}</p>
        </MetaSection>

        {/* 安全措施 */}
        <MetaSection title="安全措施" icon={<AlertTriangle className="h-4 w-4 text-red-500" />}>
          <ul className="list-inside list-disc space-y-1">
            {plan.安全措施.map((item, i) => (
              <li key={i} className="text-sm text-red-700">
                {item}
              </li>
            ))}
          </ul>
        </MetaSection>

        {/* 课后反思 */}
        <MetaSection title="课后反思" icon={<RefreshCw className="h-4 w-4 text-slate-500" />}>
          <p className="text-sm leading-relaxed text-slate-700">{plan.课后反思}</p>
        </MetaSection>
      </div>
    </div>
  );
}

function LibraryPanel({
  plans,
  totalPlans,
  searchQuery,
  loading,
  libraryScrollTop,
  onSelectPlan,
  onScroll,
}: {
  plans: LessonPlanV2[];
  totalPlans: number;
  searchQuery: string;
  loading: boolean;
  libraryScrollTop: number;
  onSelectPlan: (plan: LessonPlanV2) => void;
  onScroll: (scrollTop: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = libraryScrollTop;
  }, [libraryScrollTop]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <BookOpen className="h-5 w-5 text-primary-500" />
              我的教案库 (V2)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {searchQuery.trim()
                ? `搜索“${searchQuery.trim()}”，找到 ${plans.length} 篇 / 共 ${totalPlans} 篇`
                : `共 ${totalPlans} 篇，点击任意教案即可预览`}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-6"
        onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            正在加载教案库...
          </div>
        ) : plans.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400">
            <BookOpen className="h-12 w-12 text-slate-200" />
            <p className="text-sm">{searchQuery ? '未找到匹配的教案' : '暂无教案数据'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {plans.map((plan, index) => (
              <button
                key={`${plan.课题名称}-${index}`}
                type="button"
                className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-md"
                onClick={() => onSelectPlan(plan)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-primary-700">
                      {plan.课题名称}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {plan.教学目标?.运动能力 || '暂无教学目标摘要'}
                    </p>
                  </div>
                  <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-500 group-hover:border-primary-200 group-hover:text-primary-700">
                    <Eye className="h-3.5 w-3.5" />
                    预览
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">
                    <MapPin className="h-3 w-3" />
                    {plan.场地与器材?.教学场地 || '未指定场地'}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                    {plan.预计运动负荷?.练习密度 || '未设置密度'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 收藏面板 ─── */

function FavoritesPanel({
  favorites,
  onSelectPlan,
}: {
  favorites: LessonPlanV2[];
  onSelectPlan: (plan: LessonPlanV2) => void;
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Heart className="h-5 w-5 text-rose-500" />
              教案收藏
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              共 {favorites.length} 篇，点击任意教案即可预览
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {favorites.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400">
            <Heart className="h-12 w-12 text-slate-200" />
            <p className="text-sm">暂无收藏的教案</p>
            <p className="text-xs text-slate-300">在教案详情页点击"收藏"按钮即可添加</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {favorites.map((plan, index) => (
              <button
                key={`fav-${plan.课题名称}-${index}`}
                type="button"
                className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-rose-200 hover:bg-rose-50/40 hover:shadow-md"
                onClick={() => onSelectPlan(plan)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-rose-700">
                      {plan.课题名称}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {plan.教学目标?.运动能力 || '暂无教学目标摘要'}
                    </p>
                  </div>
                  <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-500 group-hover:border-rose-200 group-hover:text-rose-700">
                    <Eye className="h-3.5 w-3.5" />
                    预览
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">
                    <MapPin className="h-3 w-3" />
                    {plan.场地与器材?.教学场地 || '未指定场地'}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                    {plan.预计运动负荷?.练习密度 || '未设置密度'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 内部小组件 ─── */

function MetaSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetaCard({
  label,
  text,
  color,
}: {
  label: string;
  text: string;
  color: 'blue' | 'green' | 'amber' | 'rose' | 'purple';
}) {
  const borderMap = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    rose: 'border-rose-200 bg-rose-50',
    purple: 'border-purple-200 bg-purple-50',
  };
  const dotMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className={`rounded-lg border p-3 ${borderMap[color]}`}>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <span className={`inline-block h-2 w-2 rounded-full ${dotMap[color]}`} />
        {label}
      </p>
      <p className="text-xs leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}
