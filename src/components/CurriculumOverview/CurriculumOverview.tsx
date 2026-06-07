import { useState, useMemo } from 'react';
import { GraduationCap } from 'lucide-react';
import {
  CURRICULUM_DATA,
  GRADE_GROUPS,
  SEM_LABELS,
  type CurriculumUnit,
} from '../../data/curriculumData';

type FilterType = 'all' | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 's1' | 's2';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'g1', label: '一年级' },
  { key: 'g2', label: '二年级' },
  { key: 'g3', label: '三年级' },
  { key: 'g4', label: '四年级' },
  { key: 'g5', label: '五年级' },
  { key: 'g6', label: '六年级' },
  { key: 's1', label: '上学期' },
  { key: 's2', label: '下学期' },
];

/* ── 运动领域标签色 ── */
const areaColorStyles: Record<string, { bg: string; color: string }> = {
  'tag-run':   { bg: '#FAECE7', color: '#993C1D' },
  'tag-jump':  { bg: '#E6F1FB', color: '#185FA5' },
  'tag-throw': { bg: '#FAEEDA', color: '#854F0B' },
  'tag-gym':   { bg: '#EEEDFE', color: '#534AB7' },
  'tag-ball':  { bg: '#EAF3DE', color: '#3B6D11' },
  'tag-dance': { bg: '#FBEAF0', color: '#993556' },
  'tag-swim':  { bg: '#E1F5EE', color: '#0F6E56' },
};

/* ── 年级 badge 色 ── */
const gradeBadgeStyles: Record<string, { bg: string; color: string }> = {
  g1: { bg: '#E1F5EE', color: '#0F6E56' },
  g2: { bg: '#E1F5EE', color: '#0F6E56' },
  g3: { bg: '#E6F1FB', color: '#185FA5' },
  g4: { bg: '#E6F1FB', color: '#185FA5' },
  g5: { bg: '#FAEEDA', color: '#854F0B' },
  g6: { bg: '#FAEEDA', color: '#854F0B' },
};

/* ────────────────── Card ────────────────── */
function CurriculumCard({ item }: { item: CurriculumUnit }) {
  const badge = gradeBadgeStyles[item.gradeClass] ?? { bg: '#f1f5f9', color: '#475569' };

  return (
    <div className="group rounded-xl border border-slate-200/80 bg-white transition-all hover:border-slate-300 hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{ background: badge.bg, color: badge.color }}
        >
          {item.gradeLabel}
        </span>
        <span className="min-w-0 truncate text-[14px] font-semibold text-slate-800">
          {item.skillName}
        </span>
        <span className="ml-auto shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">
          {SEM_LABELS[item.sem]}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {/* Area tags */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {item.areas.map((a) => {
            const c = areaColorStyles[a.colorClass] ?? { bg: '#f1f5f9', color: '#475569' };
            return (
              <span
                key={a.label}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: c.bg, color: c.color }}
              >
                {a.label}
              </span>
            );
          })}
        </div>

        {/* Objectives */}
        <div className="mt-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          学习目标
        </div>
        <ul className="mt-1.5 space-y-1">
          {item.objs.map((obj, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-600">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
              {obj}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ────────────────── Main ────────────────── */
export function CurriculumOverview() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const groupedData = useMemo(() => {
    return GRADE_GROUPS.map((grp) => {
      const items = CURRICULUM_DATA.filter((d) => grp.grades.includes(d.grade));
      const filtered = items.filter((d) => {
        if (activeFilter === 'all') return true;
        if (activeFilter.startsWith('g')) return `g${d.grade}` === activeFilter;
        if (activeFilter.startsWith('s')) return `s${d.sem}` === activeFilter;
        return true;
      });
      return { ...grp, items: filtered };
    }).filter((grp) => grp.items.length > 0);
  }, [activeFilter]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-white" />
          <h2 className="text-xl font-black text-white">运动技能课程总览</h2>
          <span className="rounded-full bg-white/20 px-3 py-0.5 text-sm font-medium text-white">
            {CURRICULUM_DATA.length} 单元
          </span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Filter bar */}
        <div className="sticky top-0 z-[5] border-b border-slate-100 bg-white/95 px-6 py-3 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] text-slate-500">筛选：</span>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`rounded-full border px-3.5 py-1 text-[12px] font-medium transition-all ${
                  activeFilter === f.key
                    ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-8 px-6 py-5 pb-12">
          {groupedData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <GraduationCap className="mb-3 h-12 w-12 opacity-30" />
              <p>没有匹配的课程单元</p>
            </div>
          )}

          {groupedData.map((grp) => (
            <div key={grp.label}>
              {/* Section header */}
              <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-2">
                <span className="text-[14px] font-semibold text-slate-700">{grp.label}</span>
                <span className="text-[12px] text-slate-400">{grp.sub}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                  {grp.items.length} 单元
                </span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {grp.items.map((item) => (
                  <CurriculumCard key={`${item.grade}-${item.sem}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
