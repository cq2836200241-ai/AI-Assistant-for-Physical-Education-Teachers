import Lottie from 'lottie-react';
import {
  Home,
  Menu,
  Calendar,
  Activity,
  ChevronUp,
  BookmarkCheck,
  History,
  LibraryBig,
  FileText,
  MoreHorizontal,
  Settings,
} from 'lucide-react';
import logoAnimation from '../../assets/animations/Awesome.json';
import { SettingsModal } from '../SettingsModal/SettingsModal';
import { Button } from '@/components/ui/button';
import { WindowControls } from './WindowControls';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';

export type DesktopTitleBarProps = {
  isMobile: boolean;
  onOpenMobileDrawer: () => void;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  onGoHome: () => void;
  showGameLibrary: boolean;
  showMovement: boolean;
  showSchedule: boolean;
  showHistory: boolean;
  showAdopted: boolean;
  showLessonPlanV2: boolean;
  onToggleGameLibrary: () => void;
  onToggleMovement: () => void;
  onToggleSchedule: () => void;
  onToggleHistory: () => void;
  onToggleAdopted: () => void;
  onToggleLessonPlanV2: () => void;
};

const navBtnBase =
  'flex h-8 shrink-0 items-center gap-1 rounded-full border border-transparent bg-transparent px-2 text-[12px] font-bold whitespace-nowrap text-white/90 transition-all shadow-none hover:border-white/40 hover:bg-white/15 hover:text-white sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[13px]';

function navBtnActive(active: boolean) {
  return active
    ? 'border-white/60 bg-white/20 text-white shadow-sm'
    : '';
}

export function DesktopAuthTitleBar() {
  const handleTitleBarDoubleClick = () => {
    void window.desktopWindow?.maximize();
  };

  return (
    <header
      className="shrink-0 flex items-center justify-end bg-gradient-to-r from-primary-500 to-secondary-500 border-b border-white/20 z-30 shadow-md app-region-drag px-3 sm:px-4"
      style={{ height: 'var(--app-titlebar-row1-height)' }}
      onDoubleClick={handleTitleBarDoubleClick}
    >
      <div className="app-region-no-drag" onDoubleClick={(e) => e.stopPropagation()}>
        <WindowControls />
      </div>
    </header>
  );
}

export function DesktopTitleBar({
  isMobile,
  onOpenMobileDrawer,
  settingsOpen,
  onSettingsOpenChange,
  onGoHome,
  showGameLibrary,
  showMovement,
  showSchedule,
  showHistory,
  showAdopted,
  showLessonPlanV2,
  onToggleGameLibrary,
  onToggleMovement,
  onToggleSchedule,
  onToggleHistory,
  onToggleAdopted,
  onToggleLessonPlanV2,
}: DesktopTitleBarProps) {
  const handleTitleBarDoubleClick = () => {
    void window.desktopWindow?.maximize();
  };

  return (
    <header
      className="shrink-0 flex items-center bg-gradient-to-r from-primary-500 to-secondary-500 border-b border-white/20 z-30 shadow-md app-region-drag"
      style={{ height: 'var(--app-titlebar-row1-height)' }}
      onDoubleClick={handleTitleBarDoubleClick}
    >
      {/* 左侧：Logo + 主页 */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 pl-3 sm:pl-6 app-region-no-drag" onDoubleClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-white sm:pr-3 sm:border-r sm:border-white/20 shrink-0">
          <div className="w-[52px] h-[52px] flex items-center justify-center overflow-hidden shrink-0">
            <Lottie animationData={logoAnimation} loop className="w-full h-full" />
          </div>
        </div>

        {isMobile && (
          <Button
            variant="outline"
            size="sm"
            className={navBtnBase}
            onClick={onOpenMobileDrawer}
          >
            <Menu className="h-4 w-4" />
            <span className="text-[13px] font-bold">配置</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className={navBtnBase}
          onClick={onGoHome}
        >
          <Home className="h-4 w-4 sm:h-5 sm:w-5 text-white/90" />
          <span className="hidden sm:inline text-[16px]">主页</span>
        </Button>

      </div>

      <SettingsModal open={settingsOpen} onOpenChange={onSettingsOpenChange} />

      {/* 中间：弹性空间 */}
      <div className="flex-1 min-w-0" />

      {/* 右侧：功能按钮 + 窗口控制按钮 */}
      <div className="flex items-center h-full app-region-no-drag" onDoubleClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleGameLibrary}
            className={`${navBtnBase} ${navBtnActive(showGameLibrary)}`}
          >
            <LibraryBig className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">游戏库</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleMovement}
            className={`${navBtnBase} ${navBtnActive(showMovement)}`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">运动拆解</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSchedule}
            className={`${navBtnBase} ${navBtnActive(showSchedule)}`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">智能课表</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleLessonPlanV2}
            className={`${navBtnBase} ${navBtnActive(showLessonPlanV2)}`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">教案生成</span>
            <span className="hidden sm:inline lg:hidden">教案</span>
          </Button>

          {/* 更多按钮（Popover 下拉菜单） */}
          <Popover>
            <PopoverTrigger
              className={`${navBtnBase} cursor-pointer aria-expanded:border-white/60 aria-expanded:bg-white/20 aria-expanded:text-white aria-expanded:shadow-sm`}
            >
              <MoreHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">更多</span>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-44 p-1.5 bg-white rounded-xl shadow-xl border border-slate-200"
            >
              <button
                type="button"
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  showAdopted
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                onClick={onToggleAdopted}
              >
                <BookmarkCheck className="w-4 h-4 text-slate-500" />
                已上教案
                {showAdopted && <ChevronUp className="w-3 h-3 ml-auto opacity-60" />}
              </button>
              <button
                type="button"
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  showHistory
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                onClick={onToggleHistory}
              >
                <History className="w-4 h-4 text-slate-500" />
                教案库
                {showHistory && <ChevronUp className="w-3 h-3 ml-auto opacity-60" />}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                onClick={() => onSettingsOpenChange(true)}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                设置
              </button>
            </PopoverContent>
          </Popover>
        </div>
        <WindowControls />
      </div>
    </header>
  );
}
