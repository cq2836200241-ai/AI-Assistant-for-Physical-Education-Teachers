import { useState, useMemo, useCallback, useRef } from 'react';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  CURRICULUM_DATA,
  GRADE_GROUPS,
  SEM_LABELS,
  type CurriculumUnit,
  type ObjectiveDetail,
  type ObjectiveItem,
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

/* ── 左侧色条颜色（跟随第一个运动领域） ── */
const accentColorForArea: Record<string, string> = {
  'tag-run':   '#993C1D',
  'tag-jump':  '#185FA5',
  'tag-throw': '#854F0B',
  'tag-gym':   '#534AB7',
  'tag-ball':  '#3B6D11',
  'tag-dance': '#993556',
  'tag-swim':  '#0F6E56',
};

/* ── helpers ── */
function isDetailObj(obj: ObjectiveItem): obj is ObjectiveDetail {
  return typeof obj === 'object' && obj !== null && 'title' in obj;
}

function getObjTitle(obj: ObjectiveItem): string {
  return isDetailObj(obj) ? obj.title : obj;
}

function hasExpandableContent(obj: ObjectiveItem): boolean {
  if (!isDetailObj(obj)) return false;
  const d = obj;
  return Boolean(
    (d.keyPoints && d.keyPoints.length > 0) ||
    (d.teachingTips && d.teachingTips.length > 0) ||
    (d.commonMistakes && d.commonMistakes.length > 0) ||
    (d.criteria && d.criteria.length > 0) ||
    (d.activities && d.activities.length > 0),
  );
}

/* ────────────────── Detail Section ────────────────── */
function DetailSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="text-[12px] leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

/* ────────────────── Expanded Panel ────────────────── */
function ObjectiveExpanded({ detail, accentColor }: { detail: ObjectiveDetail; accentColor: string }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="overflow-hidden"
    >
      <div
        className="ml-3 mt-2 mb-1 rounded-lg bg-slate-50/80 py-3 pl-4 pr-3"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        {detail.keyPoints && detail.keyPoints.length > 0 && (
          <DetailSection icon="🎯" title="动作要领">
            <ul className="space-y-0.5">
              {detail.keyPoints.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                  {p}
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {detail.teachingTips && detail.teachingTips.length > 0 && (
          <DetailSection icon="📋" title="教学建议">
            <ul className="space-y-0.5">
              {detail.teachingTips.map((t, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                  {t}
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {detail.commonMistakes && detail.commonMistakes.length > 0 && (
          <DetailSection icon="⚠️" title="常见错误">
            <ul className="space-y-1">
              {detail.commonMistakes.map((m, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px]">
                  <span className="mt-0.5 shrink-0 text-red-400">✗</span>
                  <span>
                    <span className="text-red-600/80">{m.mistake}</span>
                    <span className="mx-1 text-slate-300">→</span>
                    <span className="text-emerald-700/80">{m.correction}</span>
                  </span>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {detail.criteria && detail.criteria.length > 0 && (
          <DetailSection icon="✅" title="达标参考">
            <ul className="space-y-0.5">
              {detail.criteria.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0 text-emerald-500 text-[10px]">●</span>
                  {c}
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {detail.activities && detail.activities.length > 0 && (
          <DetailSection icon="🎮" title="推荐练习">
            <div className="flex flex-wrap gap-1.5">
              {detail.activities.map((a, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200 shadow-sm"
                >
                  {a}
                </span>
              ))}
            </div>
          </DetailSection>
        )}
      </div>
    </motion.div>
  );
}

/* ────────────────── Objective Item ────────────────── */
function ObjectiveRow({
  obj,
  index,
  isExpanded,
  onToggle,
  accentColor,
}: {
  obj: ObjectiveItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  const title = getObjTitle(obj);
  const expandable = hasExpandableContent(obj);

  const rowRef = useRef<HTMLLIElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const iconWrapRef = useRef<HTMLSpanElement>(null);

  const { contextSafe } = useGSAP({ scope: rowRef });

  const handleHover = contextSafe((isHover: boolean) => {
    if (!expandable) return;
    
    gsap.to(btnRef.current, {
      backgroundColor: isHover ? `${accentColor}15` : '',
      duration: 0.2,
      ease: 'power1.out',
    });

    gsap.to(textRef.current, {
      color: isHover ? '#0f172a' : '',
      x: isHover ? 4 : 0,
      duration: 0.2,
      ease: 'power1.out',
    });

    gsap.to(iconWrapRef.current, {
      color: isHover ? accentColor : '',
      x: isHover ? 3 : 0,
      duration: 0.3,
      ease: 'back.out(1.7)',
    });
  });

  return (
    <li
      ref={rowRef}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={expandable ? onToggle : undefined}
        className={`flex w-full items-start gap-2 rounded-md px-1 py-1 text-left text-[12.5px] leading-relaxed ${
          expandable
            ? 'cursor-pointer text-slate-700'
            : 'cursor-default text-slate-600'
        } ${isExpanded ? 'bg-slate-50/60' : ''}`}
      >
        {expandable ? (
          <motion.span
            ref={iconWrapRef}
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="mt-0.5 shrink-0 text-slate-400"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.span>
        ) : (
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
        )}
        <span ref={textRef} className={expandable && isExpanded ? 'font-medium text-slate-800' : ''}>
          {title}
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && expandable && isDetailObj(obj) && (
          <ObjectiveExpanded detail={obj} accentColor={accentColor} />
        )}
      </AnimatePresence>
    </li>
  );
}

/* ────────────────── Card ────────────────── */
function CurriculumCard({ item }: { item: CurriculumUnit }) {
  const badge = gradeBadgeStyles[item.gradeClass] ?? { bg: '#f1f5f9', color: '#475569' };
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
  const accentColor = item.areas[0]
    ? accentColorForArea[item.areas[0].colorClass] ?? '#64748b'
    : '#64748b';

  const toggleObj = useCallback((idx: number) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const cardRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: cardRef });

  const onMouseEnter = contextSafe(() => {
    gsap.to(cardRef.current, {
      y: -4,
      boxShadow: `0px 12px 24px -4px ${accentColor}40`,
      borderColor: accentColor,
      duration: 0.3,
      ease: 'power2.out'
    });
  });

  const onMouseLeave = contextSafe(() => {
    gsap.to(cardRef.current, {
      y: 0,
      boxShadow: '',
      borderColor: '',
      duration: 0.4,
      ease: 'power2.out'
    });
  });

  return (
    <div 
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="group rounded-xl border border-slate-200/80 bg-white"
    >
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
        <ul className="mt-1.5 space-y-0.5">
          {item.objs.map((obj, i) => (
            <ObjectiveRow
              key={i}
              obj={obj}
              index={i}
              isExpanded={expandedSet.has(i)}
              onToggle={() => toggleObj(i)}
              accentColor={accentColor}
            />
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
      <div className="sticky top-0 z-10 bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-4 shadow-md">
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
                    ? 'border-primary-500 bg-primary-500 text-white shadow-sm'
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
