import { useEffect, useMemo, useRef, useState } from 'react';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import {
  getAllLessonPlansV2,
  getFavorites,
  deleteLessonPlanV2,
  type LessonPlanV2,
} from '../../utils/lessonPlanStorageV2';

/**
 * LessonPlanWorkbenchV2
 *
 * 全新教案工作台，左右分栏布局：
 * - 左侧 40%：生成新教案表单 + 我的教案库 列表
 * - 右侧 60%：选中教案的详情展示
 *
 * 完全独立于旧教案模块，不引用 appStore、ConfigPanel、PreviewPanel 等旧组件。
 */
export function LessonPlanWorkbenchV2({
  onFullscreenChange,
}: {
  onFullscreenChange?: (active: boolean) => void;
}) {
  const [currentSelectedPlan, setCurrentSelectedPlan] =
    useState<LessonPlanV2 | null>(null);
  const [plans, setPlans] = useState<LessonPlanV2[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<LessonPlanV2[]>([]);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const libraryScrollTopRef = useRef(0);

  const loadPlans = async () => {
    try {
      const data = await getAllLessonPlansV2();
      console.log('[教案库] 加载到教案数量:', data?.length ?? 0);
      setPlans(data ?? []);
    } catch (err) {
      console.error('[教案库] 加载失败:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const data = await getFavorites();
      setFavorites(data);
    } catch {
      setFavorites([]);
    }
  };

  useEffect(() => {
    loadPlans();
    loadFavorites();
  }, []);

  useEffect(() => {
    onFullscreenChange?.(fullscreenActive);
  }, [fullscreenActive, onFullscreenChange]);

  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return plans;
    const q = searchQuery.trim().toLowerCase();
    return plans.filter((plan) => {
      const nameMatch = plan.课题名称?.toLowerCase().includes(q) ?? false;
      const venueMatch = plan.场地与器材?.教学场地?.toLowerCase().includes(q) ?? false;
      return nameMatch || venueMatch;
    });
  }, [plans, searchQuery]);

  const handleToggleLibrary = () => {
    const next = !showLibrary;
    setShowLibrary(next);
    if (next) {
      setShowFavorites(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    libraryScrollTopRef.current = 0;
    setShowLibrary(true);
    setShowFavorites(false);
  };

  const handleRefresh = async () => {
    await loadPlans();
    setShowLibrary(true);
    setShowFavorites(false);
  };

  const handleSelectPlan = (plan: LessonPlanV2) => {
    setCurrentSelectedPlan(plan);
    setFullscreenActive(false);
    setShowLibrary(false);
    setShowFavorites(false);
  };

  const closePreview = () => {
    setCurrentSelectedPlan(null);
    setFullscreenActive(false);
    setShowLibrary(true);
    setShowFavorites(false);
  };

  const handleCancelPreview = () => {
    closePreview();
  };

  const handlePlanGenerated = async (plan: LessonPlanV2) => {
    await loadPlans();
    handleSelectPlan(plan);
  };

  const handleToggleFavorites = () => {
    const next = !showFavorites;
    setShowFavorites(next);
    if (next) {
      setShowLibrary(false);
      void loadFavorites();
    }
  };

  const handleFavoriteToggled = () => {
    void loadFavorites();
  };

  const handleDeletePlan = async (plan: LessonPlanV2) => {
    await deleteLessonPlanV2(plan);
    await loadPlans();
    await loadFavorites();
    // 如果当前正在预览被删除的教案，关闭预览
    if (currentSelectedPlan && currentSelectedPlan.课题名称 === plan.课题名称 && currentSelectedPlan.场地与器材?.教学场地 === plan.场地与器材?.教学场地) {
      closePreview();
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      {/* 左侧 25% (2.5:7.5) */}
      {!fullscreenActive && (
        <div className="min-h-0 w-[25%] shrink-0 overflow-hidden border-r border-slate-200 bg-white">
          <LeftPanel
            plansCount={plans.length}
            favoritesCount={favorites.length}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onRefresh={handleRefresh}
            onToggleLibrary={handleToggleLibrary}
            onPlanGenerated={handlePlanGenerated}
            onToggleFavorites={handleToggleFavorites}
          />
        </div>
      )}

      {/* 右侧 80% */}
      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        <RightPanel
          plan={currentSelectedPlan}
          showLibrary={showLibrary}
          showFavorites={showFavorites}
          plans={filteredPlans}
          favorites={favorites}
          totalPlans={plans.length}
          searchQuery={searchQuery}
          loading={loading}
          libraryScrollTop={libraryScrollTopRef.current}
          fullscreenActive={fullscreenActive}
          onSelectPlan={handleSelectPlan}
          onCancelPreview={handleCancelPreview}
          onLibraryScroll={(scrollTop) => {
            libraryScrollTopRef.current = scrollTop;
          }}
          onToggleFullscreenActive={() => {
            setFullscreenActive((prev) => !prev);
          }}
          onFavoriteToggled={handleFavoriteToggled}
          onDeletePlan={handleDeletePlan}
        />
      </div>
    </div>
  );
}
