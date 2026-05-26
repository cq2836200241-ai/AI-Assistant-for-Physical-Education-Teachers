import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { useAIProvider } from './hooks/useAIProvider';
import { buildPrompt } from './utils/promptBuilder';
import { ConfigPanel } from './components/ConfigPanel/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel/PreviewPanel';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { AccountModal } from './components/AccountModal/AccountModal';
import { DesktopAuthTitleBar, DesktopTitleBar } from './components/DesktopTitleBar/DesktopTitleBar';
import { TopBarMeteorBackdrop } from './components/TopBarMeteorBackdrop/TopBarMeteorBackdrop';
import { ClassReminderWatcher } from './components/ClassReminderWatcher/ClassReminderWatcher';
import { AuthWrapper, saveToHistory } from './components/AuthScreen/AuthWrapper';
import { UserMenu } from './components/UserMenu/UserMenu';
import { Home, ChevronLeft, ChevronRight, Menu, Calendar, Activity, ChevronUp, ChevronDown, LibraryBig, FileText, MoreHorizontal, Settings, User } from 'lucide-react';
import Lottie from 'lottie-react';
import logoAnimation from './assets/animations/Awesome.json';
import { initializeSeedDataV2 } from './utils/lessonPlanStorageV2';
import { standardizeLessonPlanProcess } from './utils/lessonPlanProcessStandard';
import { extractLessonPlanJson, renderLessonPlanToMarkdown } from './utils/lessonPlanMarkdown';
import { validateSportsLessonTopic } from './utils/sportsLessonTopicValidation';

import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const isDesktop =
  import.meta.env.VITE_APP_PLATFORM === 'desktop' ||
  (typeof window !== 'undefined' && Boolean(window.desktopWindow));

function MainApp() {
  const store = useAppStore();
  const { generateStream } = useAIProvider();
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  const [hoveringAside, setHoveringAside] = useState(false);
  const [showCollapseButton, setShowCollapseButton] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showGameLibrary, setShowGameLibrary] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdopted, setShowAdopted] = useState(false);
  const [showLessonPlanV2, setShowLessonPlanV2] = useState(false);
  const [lessonPlanV2FullscreenActive, setLessonPlanV2FullscreenActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [configAccordionResetKey, setConfigAccordionResetKey] = useState(0);
  const [lastGeneratedFormFingerprint, setLastGeneratedFormFingerprint] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const lastGeneratedPlan = store.lastGeneratedPlanId
    ? store.history.find((plan) => plan.id === store.lastGeneratedPlanId) ?? null
    : null;
  const hasGeneratedResult = Boolean(
    lastGeneratedPlan &&
      lastGeneratedFormFingerprint &&
      lastGeneratedFormFingerprint === JSON.stringify(store.form),
  );

  // 为需要更多空间的工作区面板自动收起左侧工具栏。
  // 教案资源入口来自左侧工具栏，打开后应保留用户当前的工具栏状态。
  useEffect(() => {
    const shouldAutoCollapse = showSchedule || showGameLibrary || showMovement || showLessonPlanV2;
    if (shouldAutoCollapse) {
      setIsConfigCollapsed(true);
    }
  }, [showSchedule, showGameLibrary, showMovement, showLessonPlanV2]);

  // 检测窗口宽度判断是否为移动端
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // 当从移动端切换到桌面端时，重置折叠状态
  useEffect(() => {
    if (!isMobile) {
      setIsConfigCollapsed(false);
      setMobileDrawerOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    let timeoutId: number;
    if (hoveringAside || isConfigCollapsed) {
      setShowCollapseButton(true);
    } else {
      // 离开 3 秒后隐藏
      timeoutId = window.setTimeout(() => {
        setShowCollapseButton(false);
      }, 3000);
    }
    return () => clearTimeout(timeoutId);
  }, [hoveringAside, isConfigCollapsed]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', store.theme);
  }, [store.theme]);

  // 初始化 V2 种子数据（仅首次打开时写入桌面数据文件）
  useEffect(() => {
    void initializeSeedDataV2();
  }, []);

  // 已移除 beforeunload 事件拦截 — 该事件在 EXE/Electron 环境中会静默阻止窗口关闭，
  // 导致关闭按钮失效。应用使用 Zustand persist 自动保存数据，无需此保护。

  const getLessonPlanMarkdownOptions = () => {
    const isCustomEnabled = store.form.customDetailsEnabled;
    return {
      includeEquipment: isCustomEnabled ? store.form.includeEquipment : true,
      includeTeacherActivity: isCustomEnabled ? store.form.includeTeacherActivity : true,
      includeReflection: isCustomEnabled ? store.form.includeReflection : true,
    };
  };

  const handleGenerate = async (isRegeneration: boolean = false) => {
    const topicValidation = validateSportsLessonTopic(store.form.courseName || '');
    if (!topicValidation.isValid) {
      const message = topicValidation.message || '当前系统仅支持体育与健康类教案。';
      store.setIsGenerating(false);
      store.setGenerationProgress(0);
      store.setGenerationStatus(message);
      store.setCurrentPlanContent(`❌ **生成失败**: ${message}`);
      return;
    }

    // 收起所有功能面板
    setShowSchedule(false);
    setShowGameLibrary(false);
    setShowMovement(false);
    setShowHistory(false);
    setShowAdopted(false);
    setShowLessonPlanV2(false);
    store.setIsGenerating(true);
    store.setCurrentPlanContent('');
    store.setPreviewedHistoryPlan(null);
    store.setLastGeneratedPlanId(null);
    setLastGeneratedFormFingerprint(null);
    store.setGenerationProgress(0);
    store.setGenerationStatus('');

    const { systemPrompt, userPrompt } = buildPrompt(store.form, isRegeneration, store.educationLevel);

    
    let generatedText = '';
    
    let lastUpdateTime = 0;
    
    try {
      await generateStream(systemPrompt, userPrompt, (text) => {
        generatedText = text;
        const now = Date.now();
        // JSON is rendered into the existing Markdown preview only after the response is complete.
        if (now - lastUpdateTime > 150) {
          let progress = Math.min(Math.floor(100 * (1 - Math.exp(-text.length / 2500))), 99);
          store.setGenerationProgress(progress);
          lastUpdateTime = now;
        }
      });

      if (!useAppStore.getState().isGenerating) {
         // Keep currentPlanContent empty so the start button can reappear after stopping.
         store.setCurrentPlanContent('');
         store.setGenerationStatus('生成已中止');
         return;
      }
      
      const parsedPlan = extractLessonPlanJson(generatedText);
      if (!parsedPlan) {
        console.warn('[教案生成] 无法解析 AI 返回 JSON，原始返回前 500 字：', generatedText.slice(0, 500));
        throw new Error('AI 返回的数据格式不正确，无法解析为有效的教案 JSON。请重试。');
      }

      const structuredPlan = standardizeLessonPlanProcess(parsedPlan);
      const markdownContent = renderLessonPlanToMarkdown(
        structuredPlan,
        getLessonPlanMarkdownOptions(),
      );

      // Flush the rendered Markdown and finalize progress
      store.setCurrentPlanContent(markdownContent);
      
      store.setGenerationProgress(100);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Save to history
      const newPlan = {
        id: Date.now().toString(),
        title: structuredPlan.课题名称 || store.form.courseName,
        date: new Date().toISOString(),
        content: markdownContent,
        structuredPlan,
        tags: [store.form.courseType, store.form.ability, ...store.form.grades],
        summary: markdownContent.slice(0, 100).replace(/#/g, '') + '...',
        grades: store.form.grades
      };
      // Optimistically update local store
      store.addHistory(newPlan);
      store.setLastGeneratedPlanId(newPlan.id);
      setLastGeneratedFormFingerprint(JSON.stringify(useAppStore.getState().form));
      // Save to desktop user data
      await saveToHistory(newPlan);
      
    } catch (error: any) {
      console.error("Generate error:", error);
      store.setCurrentPlanContent(prev => prev + `\n\n❌ **生成失败**: ${error.message}`);
    } finally {
      store.setIsGenerating(false);
      store.setGenerationProgress(0);
    }
  };

  const closeAllPanels = () => {
    setShowSchedule(false);
    setShowGameLibrary(false);
    setShowMovement(false);
    setShowHistory(false);
    setShowAdopted(false);
    setShowLessonPlanV2(false);
    setLessonPlanV2FullscreenActive(false);
  };

  const handlePreviewGeneratedResult = () => {
    const state = useAppStore.getState();
    const generatedPlan = state.lastGeneratedPlanId
      ? state.history.find((plan) => plan.id === state.lastGeneratedPlanId)
      : null;

    if (!generatedPlan) return;

    closeAllPanels();
    setSettingsOpen(false);
    setAccountOpen(false);
    setMobileDrawerOpen(false);
    state.setPreviewedHistoryPlan(null);
    state.setCurrentPlanContent(generatedPlan.content);
  };

  const renderConfigPanel = () => (
    <div className="w-full h-full">
      <ConfigPanel
        onGenerate={handleGenerate}
        hasGeneratedResult={hasGeneratedResult}
        onPreviewGeneratedResult={handlePreviewGeneratedResult}
        showAdopted={showAdopted}
        showHistory={showHistory}
        onToggleAdopted={handleToggleAdopted}
        onToggleHistory={handleToggleHistory}
        accordionResetKey={configAccordionResetKey}
      />
    </div>
  );

  const handleGoHome = () => {
    closeAllPanels();
    setSettingsOpen(false);
    setAccountOpen(false);
    store.setCurrentPlanContent('');
    store.setPreviewedHistoryPlan(null);
    setIsConfigCollapsed(false);
    setConfigAccordionResetKey((prev) => prev + 1);
  };

  const handleToggleGameLibrary = () => {
    setLessonPlanV2FullscreenActive(false);
    setShowGameLibrary(!showGameLibrary);
    setShowMovement(false);
    setShowSchedule(false);
    setShowHistory(false);
    setShowAdopted(false);
    setShowLessonPlanV2(false);
  };

  const handleToggleMovement = () => {
    setLessonPlanV2FullscreenActive(false);
    setShowMovement(!showMovement);
    setShowGameLibrary(false);
    setShowSchedule(false);
    setShowHistory(false);
    setShowAdopted(false);
    setShowLessonPlanV2(false);
  };

  const handleToggleSchedule = () => {
    setLessonPlanV2FullscreenActive(false);
    setShowSchedule(!showSchedule);
    setShowGameLibrary(false);
    setShowMovement(false);
    setShowHistory(false);
    setShowAdopted(false);
    setShowLessonPlanV2(false);
  };

  const handleToggleAdopted = () => {
    setLessonPlanV2FullscreenActive(false);
    setShowAdopted(!showAdopted);
    setShowHistory(false);
    setShowGameLibrary(false);
    setShowMovement(false);
    setShowSchedule(false);
    setShowLessonPlanV2(false);
  };

  const handleToggleHistory = () => {
    setLessonPlanV2FullscreenActive(false);
    setShowHistory(!showHistory);
    setShowAdopted(false);
    setShowGameLibrary(false);
    setShowMovement(false);
    setShowSchedule(false);
    setShowLessonPlanV2(false);
  };

  const handleToggleLessonPlanV2 = () => {
    const next = !showLessonPlanV2;
    setShowLessonPlanV2(next);
    if (!next) {
      setLessonPlanV2FullscreenActive(false);
    }
    setShowHistory(false);
    setShowAdopted(false);
    setShowGameLibrary(false);
    setShowMovement(false);
    setShowSchedule(false);
  };

  const webHeader = (
    <header className="topbar-meteor-surface z-30 flex h-[64px] shrink-0 items-center justify-between border-b border-white/20 px-4 shadow-md sm:px-6">
      <TopBarMeteorBackdrop />
      <div className="relative z-[1] flex items-center gap-2 sm:gap-4">
        <div className="flex h-8 items-center gap-2 text-white tracking-tight sm:border-r sm:border-white/20 sm:pr-4">
          <div className="-ml-4 flex h-20 w-20 items-center justify-center overflow-hidden sm:-ml-6 sm:h-20 sm:w-20">
            <Lottie animationData={logoAnimation} loop className="h-full w-full" />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-white/30 bg-white/10 px-2.5 text-[13px] text-white transition-all hover:bg-white/20 sm:h-9"
              onClick={() => setMobileDrawerOpen(true)}
            >
              <Menu className="h-4 w-4" />
              <span className="text-[13px] font-bold">配置</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full border-white/25 bg-transparent px-2.5 text-[12px] text-white/90 shadow-none transition-all hover:border-white/40 hover:bg-white/15 sm:h-9 sm:px-3 sm:text-[13px]"
            onClick={handleGoHome}
          >
            <Home className="h-4 w-4 text-white/90 sm:h-5 sm:w-5" />
            <span className="hidden text-[16px] sm:inline">主页</span>
          </Button>

          <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
          <AccountModal open={accountOpen} onOpenChange={setAccountOpen} />
        </div>
      </div>

      <div className="relative z-[1] flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleGameLibrary}
          className={`flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-bold shadow-none transition-all sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[13px] ${
            showGameLibrary
              ? 'border-white/60 bg-white/20 text-white shadow-sm'
              : 'border-white/25 bg-transparent text-white/90 hover:border-white/40 hover:bg-white/15'
          }`}
        >
          <LibraryBig className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">游戏库</span>
          {showGameLibrary ? <ChevronUp className="h-3 w-3 opacity-70" /> : <ChevronDown className="h-3 w-3 opacity-70" />}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleMovement}
          className={`flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-bold shadow-none transition-all sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[13px] ${
            showMovement
              ? 'border-white/60 bg-white/20 text-white shadow-sm'
              : 'border-white/25 bg-transparent text-white/90 hover:border-white/40 hover:bg-white/15'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">运动拆解</span>
          {showMovement ? <ChevronUp className="h-3 w-3 opacity-70" /> : <ChevronDown className="h-3 w-3 opacity-70" />}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleSchedule}
          className={`flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-bold shadow-none transition-all sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[13px] ${
            showSchedule
              ? 'border-white/60 bg-white/20 text-white shadow-sm'
              : 'border-white/25 bg-transparent text-white/90 hover:border-white/40 hover:bg-white/15'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">智能课表</span>
          {showSchedule ? <ChevronUp className="h-3 w-3 opacity-70" /> : <ChevronDown className="h-3 w-3 opacity-70" />}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleLessonPlanV2}
          className={`flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-bold shadow-none transition-all sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[13px] ${
            showLessonPlanV2
              ? 'border-white/60 bg-white/20 text-white shadow-sm'
              : 'border-white/25 bg-transparent text-white/90 hover:border-white/40 hover:bg-white/15'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">教案生成</span>
          {showLessonPlanV2 ? <ChevronUp className="h-3 w-3 opacity-70" /> : <ChevronDown className="h-3 w-3 opacity-70" />}
        </Button>

        <Popover>
          <PopoverTrigger
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-white/25 bg-transparent px-2 text-[12px] font-bold text-white/90 shadow-none transition-all hover:border-white/40 hover:bg-white/15 hover:text-white aria-expanded:border-white/60 aria-expanded:bg-white/20 aria-expanded:text-white sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[13px]"
          >
            <MoreHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">更多</span>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 text-slate-500" />
              设置
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => setAccountOpen(true)}
            >
              <User className="h-4 w-4 text-slate-500" />
              账户
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      {isDesktop ? (
        <DesktopTitleBar
          isMobile={isMobile}
          onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
          settingsOpen={settingsOpen}
          onSettingsOpenChange={setSettingsOpen}
          accountOpen={accountOpen}
          onAccountOpenChange={setAccountOpen}
          onGoHome={handleGoHome}
          showGameLibrary={showGameLibrary}
          showMovement={showMovement}
          showSchedule={showSchedule}
          showLessonPlanV2={showLessonPlanV2}
          onToggleGameLibrary={handleToggleGameLibrary}
          onToggleMovement={handleToggleMovement}
          onToggleSchedule={handleToggleSchedule}
          onToggleLessonPlanV2={handleToggleLessonPlanV2}
        />
      ) : (
        webHeader
      )}

      {store.theme === 'insight-grid' && (
        <div className="insight-grid-backdrop fixed inset-0 z-0" />
      )}

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden p-2 sm:p-4 gap-2 sm:gap-6 border border-[#f7fbff] bg-[#ffffff] relative">
        {/* 桌面端：左侧面板 (>=1024px) */}
        {!isMobile && (
          <motion.div
            initial={false}
            animate={{
              width: isConfigCollapsed ? 0 : 420,
              marginRight: isConfigCollapsed ? -24 : 0,
            }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="relative flex shrink-0 h-full overflow-visible will-change-[width]"
            onMouseEnter={() => setHoveringAside(true)}
            onMouseLeave={() => setHoveringAside(false)}
          >
            <motion.div
              initial={false}
              animate={{
                x: isConfigCollapsed ? -420 : 0,
                opacity: isConfigCollapsed ? 0 : 1
              }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="config-panel-frame-surface custom-scrollbar flex h-full w-[420px] shrink-0 flex-col overflow-y-auto rounded-2xl border p-0 pr-2 shadow-sm"
            >
               {renderConfigPanel()}
            </motion.div>

            {/* Collapse/Expand Toggle Button */}
            <AnimatePresence>
              {showCollapseButton && !lessonPlanV2FullscreenActive && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsConfigCollapsed(!isConfigCollapsed)}
                  className="fixed top-1/2 -translate-y-1/2 z-50 flex items-center justify-center overflow-visible rounded-full border border-white/20 bg-[color:color-mix(in_srgb,var(--theme-p-500)_72%,var(--theme-s-500))] text-white shadow-[0_8px_22px_rgba(8,19,29,0.22),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-[color:color-mix(in_srgb,var(--theme-p-400)_76%,var(--theme-s-500))] hover:shadow-[0_12px_28px_rgba(8,19,29,0.28),inset_0_1px_0_rgba(255,255,255,0.24)]"
                  style={{
                    left: isConfigCollapsed ? '6px' : '428px',
                    width: '17px',
                    height: '78px'
                  }}
                  title={isConfigCollapsed ? "点击展开功能区" : "点击收起功能区"}
                >
                  {isConfigCollapsed ? (
                    <ChevronRight style={{ width: '23.2222px', height: '34px' }} className="shrink-0" />
                  ) : (
                    <ChevronLeft style={{ width: '23.2222px', height: '34px' }} className="shrink-0" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        
        {/* 移动端：抽屉式配置面板 */}
        <Sheet open={isMobile && mobileDrawerOpen} onOpenChange={(open) => setMobileDrawerOpen(open)}>
          <SheetContent side="left" className="config-panel-theme-gradient w-[90vw] max-w-[420px] p-0 pt-10">
            <SheetTitle className="sr-only">教案配置</SheetTitle>
            <SheetDescription className="sr-only">设置年级、课题、课型等教案参数</SheetDescription>
            <div className="h-full overflow-y-auto p-4 custom-scrollbar">
              {renderConfigPanel()}
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Right Panel */}
        <section className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col relative shadow-sm">
            <PreviewPanel 
            onGenerate={handleGenerate} 
            showSchedule={showSchedule}
            showGameLibrary={showGameLibrary}
            showMovement={showMovement}
            showHistory={showHistory}
            showAdopted={showAdopted}
            showLessonPlanV2={showLessonPlanV2}
            onLessonPlanV2FullscreenChange={setLessonPlanV2FullscreenActive}
            onToggleSchedule={() => { setShowSchedule(!showSchedule); setShowGameLibrary(false); setShowMovement(false); setShowHistory(false); setShowAdopted(false); setShowLessonPlanV2(false); }}
            onToggleGameLibrary={() => { setShowGameLibrary(!showGameLibrary); setShowMovement(false); setShowSchedule(false); setShowHistory(false); setShowAdopted(false); setShowLessonPlanV2(false); }}
            onToggleMovement={() => { setShowMovement(!showMovement); setShowGameLibrary(false); setShowSchedule(false); setShowHistory(false); setShowAdopted(false); setShowLessonPlanV2(false); }}
            onToggleHistory={() => { setShowHistory(!showHistory); setShowAdopted(false); setShowGameLibrary(false); setShowMovement(false); setShowSchedule(false); setShowLessonPlanV2(false); }}
            onToggleAdopted={() => { setShowAdopted(!showAdopted); setShowHistory(false); setShowGameLibrary(false); setShowMovement(false); setShowSchedule(false); setShowLessonPlanV2(false); }}
          />

        </section>
      </main>

      {/* 暗夜极光主题底部条纹 */}
      {store.theme === 'aurora' && (
        <div className="fixed bottom-0 left-0 right-0 h-[3px] z-[100] pointer-events-none aurora-stripe" />
      )}

      {store.theme === 'insight-grid' && (
        <div className="fixed bottom-0 left-0 right-0 h-[3px] z-[100] pointer-events-none insight-grid-stripe" />
      )}

      <ClassReminderWatcher />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={
        <AuthWrapper desktopTitleBar={isDesktop ? <DesktopAuthTitleBar /> : undefined}>
          <MainApp />
        </AuthWrapper>
      } />
    </Routes>
  );
}
