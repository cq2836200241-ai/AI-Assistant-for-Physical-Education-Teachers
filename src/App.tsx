import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { useAIProvider } from './hooks/useAIProvider';
import { buildPrompt } from './utils/promptBuilder';
import { ConfigPanel } from './components/ConfigPanel/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel/PreviewPanel';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { ClassReminderWatcher } from './components/ClassReminderWatcher/ClassReminderWatcher';
import { AuthWrapper, saveToHistory } from './components/AuthScreen/AuthWrapper';
import { UserMenu } from './components/UserMenu/UserMenu';
import { Home, ChevronLeft, ChevronRight, Menu, Calendar, Activity, ChevronUp, ChevronDown, BookmarkCheck, History, LibraryBig, FileText } from 'lucide-react';
import Lottie from 'lottie-react';
import welcomeAnimation from './assets/animations/Welcome.json';
import { initializeSeedDataV2 } from './utils/lessonPlanStorageV2';

import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // 当右侧功能界面任意一个展开时，自动折叠左侧工具栏
  useEffect(() => {
    const anyPanelOpen = showSchedule || showGameLibrary || showMovement || showHistory || showAdopted || showLessonPlanV2;
    if (anyPanelOpen) {
      setIsConfigCollapsed(true);
    }
  }, [showSchedule, showGameLibrary, showMovement, showHistory, showAdopted, showLessonPlanV2]);

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

  // 初始化 V2 种子数据（仅首次打开时写入 localStorage）
  useEffect(() => {
    initializeSeedDataV2();
  }, []);

  // 已移除 beforeunload 事件拦截 — 该事件在 EXE/Electron 环境中会静默阻止窗口关闭，
  // 导致关闭按钮失效。应用使用 Zustand persist 自动保存数据，无需此保护。

  const handleGenerate = async (isRegeneration: boolean = false) => {
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
    store.setGenerationProgress(0);

    const { systemPrompt, userPrompt } = buildPrompt(store.form, isRegeneration, store.educationLevel);

    
    let generatedText = '';
    
    let lastUpdateTime = 0;
    
    try {
      await generateStream(systemPrompt, userPrompt, (text) => {
        generatedText = text;
        const now = Date.now();
        // Throttle React state updates to ~6 fps (every 150ms) to prevent markdown rendering from freezing the browser
        if (now - lastUpdateTime > 150) {
          store.setCurrentPlanContent(text);
          let progress = Math.min(Math.floor(100 * (1 - Math.exp(-text.length / 2500))), 99);
          store.setGenerationProgress(progress);
          lastUpdateTime = now;
        }
      });
      
      // Flush the remaining text and finalize progress
      store.setCurrentPlanContent(generatedText);
      
      if (!useAppStore.getState().isGenerating) {
         // User stopped generation, don't save to history or trigger confetti
         store.setCurrentPlanContent(prev => prev + '\n\n*(生成已中止)*');
         return;
      }
      
      store.setGenerationProgress(100);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Save to history
      const newPlan = {
        id: Date.now().toString(),
        title: store.form.courseName,
        date: new Date().toISOString(),
        content: generatedText,
        tags: [store.form.courseType, store.form.ability, ...store.form.grades],
        summary: generatedText.slice(0, 100).replace(/#/g, '') + '...',
        grades: store.form.grades
      };
      // Optimistically update local store
      store.addHistory(newPlan);
      // Save to localStorage
      await saveToHistory(newPlan);
      
    } catch (error: any) {
      console.error("Generate error:", error);
      store.setCurrentPlanContent(prev => prev + `\n\n❌ **生成失败**: ${error.message}`);
    } finally {
      store.setIsGenerating(false);
      store.setGenerationProgress(0);
    }
  };

  const renderConfigPanel = () => (
    <div className="w-full h-full">
      <ConfigPanel onGenerate={handleGenerate} />
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="shrink-0 h-[64px] bg-gradient-to-r from-primary-500 to-secondary-500 border-b border-white/20 flex items-center justify-between px-4 sm:px-6 z-30 shadow-md">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-2.5 text-white tracking-tight sm:pr-4 sm:border-r sm:border-white/20 h-8">
            <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center overflow-hidden -ml-4 sm:-ml-6">
              <Lottie animationData={welcomeAnimation} loop={true} className="w-full h-full" />
            </div>
            
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* 移动端：配置按钮 */}
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-[13px] h-8 sm:h-9 px-2.5 rounded-full border-white/30 bg-white/10 hover:bg-white/20 text-white transition-all"
                onClick={() => setMobileDrawerOpen(true)}
              >
                <Menu className="h-4 w-4" />
                <span className="text-[13px] font-bold">配置</span>
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[12px] sm:text-[13px] h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border-white/25 shadow-none bg-transparent hover:bg-white/15 hover:border-white/40 transition-all text-white/90"
              onClick={() => {
                // 收起所有功能面板
                setShowSchedule(false);
                setShowGameLibrary(false);
                setShowMovement(false);
                setShowHistory(false);
                setShowAdopted(false);
                setShowLessonPlanV2(false);
                setSettingsOpen(false);
                // 清空 AI 生成的教案预览内容
                store.setCurrentPlanContent('');
                store.setPreviewedHistoryPlan(null);
                // 展开左侧工具栏
                setIsConfigCollapsed(false);
              }}
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5 text-white/90" />
              <span className="hidden sm:inline text-[16px]">主页</span>
            </Button>
            
            <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 运动拆解 按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowGameLibrary(!showGameLibrary);
              setShowMovement(false);
              setShowSchedule(false);
              setShowHistory(false);
              setShowAdopted(false);
              setShowLessonPlanV2(false);
            }}
            className={`h-8 sm:h-9 px-2 sm:px-3 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all shadow-none ${
              showGameLibrary
                ? 'bg-white/20 border-white/60 text-white shadow-sm'
                : 'bg-transparent border-white/25 text-white/90 hover:bg-white/15 hover:border-white/40'
            }`}
          >
            <LibraryBig className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">游戏库</span>
            {showGameLibrary ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowMovement(!showMovement);
              setShowGameLibrary(false);
              setShowSchedule(false);
              setShowHistory(false);
              setShowAdopted(false);
              setShowLessonPlanV2(false);
            }}
            className={`h-8 sm:h-9 px-2 sm:px-3 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all shadow-none ${
              showMovement
                ? 'bg-white/20 border-white/60 text-white shadow-sm'
                : 'bg-transparent border-white/25 text-white/90 hover:bg-white/15 hover:border-white/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">运动拆解</span>
            {showMovement ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
          </Button>

          {/* 智能课表 按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowSchedule(!showSchedule);
              setShowGameLibrary(false);
              setShowMovement(false);
              setShowHistory(false);
              setShowAdopted(false);
              setShowLessonPlanV2(false);
            }}
            className={`h-8 sm:h-9 px-2 sm:px-3 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all shadow-none ${
              showSchedule
                ? 'bg-white/20 border-white/60 text-white shadow-sm'
                : 'bg-transparent border-white/25 text-white/90 hover:bg-white/15 hover:border-white/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">智能课表</span>
            {showSchedule ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
          </Button>

          {/* 已上教案记录 按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAdopted(!showAdopted);
              setShowHistory(false);
              setShowGameLibrary(false);
              setShowMovement(false);
              setShowSchedule(false);
              setShowLessonPlanV2(false);
            }}
            className={`h-8 sm:h-9 px-2 sm:px-3 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all shadow-none ${
              showAdopted
                ? 'bg-white/20 border-white/60 text-white shadow-sm'
                : 'bg-transparent border-white/25 text-white/90 hover:bg-white/15 hover:border-white/40'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">已上教案</span>
            {showAdopted ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
          </Button>

          {/* 教案记录库 按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowHistory(!showHistory);
              setShowAdopted(false);
              setShowGameLibrary(false);
              setShowMovement(false);
              setShowSchedule(false);
              setShowLessonPlanV2(false);
            }}
            className={`h-8 sm:h-9 px-2 sm:px-3 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all shadow-none ${
              showHistory
                ? 'bg-white/20 border-white/60 text-white shadow-sm'
                : 'bg-transparent border-white/25 text-white/90 hover:bg-white/15 hover:border-white/40'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">教案库</span>
            {showHistory ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
          </Button>

          {/* 教案生成 (V2) 按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowLessonPlanV2(!showLessonPlanV2);
              setShowHistory(false);
              setShowAdopted(false);
              setShowGameLibrary(false);
              setShowMovement(false);
              setShowSchedule(false);
            }}
            className={`h-8 sm:h-9 px-2 sm:px-3 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all shadow-none ${
              showLessonPlanV2
                ? 'bg-white/20 border-white/60 text-white shadow-sm'
                : 'bg-transparent border-white/25 text-white/90 hover:bg-white/15 hover:border-white/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">教案生成 (V2)</span>
            {showLessonPlanV2 ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
          </Button>
        </div>


      </header>

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
              className="w-[420px] h-full overflow-y-auto pr-2 custom-scrollbar p-0 shrink-0 bg-white shadow-sm border border-slate-200 rounded-2xl flex flex-col"
            >
               {renderConfigPanel()}
            </motion.div>

            {/* Collapse/Expand Toggle Button */}
            <AnimatePresence>
              {showCollapseButton && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsConfigCollapsed(!isConfigCollapsed)}
                  className={`fixed top-1/2 -translate-y-1/2 z-50 bg-amber-400 border border-amber-500 shadow-[0_4px_12px_rgba(0,0,0,0.15)] rounded-full flex items-center justify-center text-white hover:bg-amber-500 hover:border-amber-600 transition-all duration-300 overflow-visible`}
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
          <SheetContent side="left" className="w-[90vw] max-w-[420px] p-0 pt-10 bg-gradient-to-b from-primary-600 to-secondary-500">
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
            onToggleSchedule={() => { setShowSchedule(!showSchedule); setShowGameLibrary(false); setShowMovement(false); setShowHistory(false); setShowAdopted(false); setShowLessonPlanV2(false); }}
            onToggleGameLibrary={() => { setShowGameLibrary(!showGameLibrary); setShowMovement(false); setShowSchedule(false); setShowHistory(false); setShowAdopted(false); setShowLessonPlanV2(false); }}
            onToggleMovement={() => { setShowMovement(!showMovement); setShowGameLibrary(false); setShowSchedule(false); setShowHistory(false); setShowAdopted(false); setShowLessonPlanV2(false); }}
            onToggleHistory={() => { setShowHistory(!showHistory); setShowAdopted(false); setShowGameLibrary(false); setShowMovement(false); setShowSchedule(false); setShowLessonPlanV2(false); }}
            onToggleAdopted={() => { setShowAdopted(!showAdopted); setShowHistory(false); setShowGameLibrary(false); setShowMovement(false); setShowSchedule(false); setShowLessonPlanV2(false); }}
          />

        </section>
      </main>

      <ClassReminderWatcher />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={
        <AuthWrapper>
          <MainApp />
        </AuthWrapper>
      } />
    </Routes>
  );
}
