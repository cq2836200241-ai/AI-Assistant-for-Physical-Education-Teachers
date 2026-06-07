import Lottie from 'lottie-react';
import {
  Home,
  Menu,
  Calendar,
  Activity,
  LibraryBig,
  FileText,
  MoreHorizontal,
  Settings,
  User,
  GraduationCap,
} from 'lucide-react';
import logoAnimation from '../../assets/animations/Awesome.json';
import { SettingsModal } from '../SettingsModal/SettingsModal';
import { AccountModal } from '../AccountModal/AccountModal';
import { TopBarMeteorBackdrop } from '../TopBarMeteorBackdrop/TopBarMeteorBackdrop';
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
  accountOpen: boolean;
  onAccountOpenChange: (open: boolean) => void;
  onGoHome: () => void;
  showCurriculumOverview: boolean;
  showGameLibrary: boolean;
  showMovement: boolean;
  showSchedule: boolean;
  showLessonPlanV2: boolean;
  onToggleCurriculumOverview: () => void;
  onToggleGameLibrary: () => void;
  onToggleMovement: () => void;
  onToggleSchedule: () => void;
  onToggleLessonPlanV2: () => void;
};

const navBtnBase =
  'flex h-8 shrink-0 items-center gap-1 rounded-full border border-transparent bg-transparent px-2 text-[12px] font-bold whitespace-nowrap text-white/90 transition-all shadow-none hover:border-white/40 hover:bg-white/15 hover:text-white sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[13px]';

function navBtnActive(active: boolean) {
  return active ? 'border-white/60 bg-white/20 text-white shadow-sm' : '';
}

export function DesktopAuthTitleBar() {
  const handleTitleBarDoubleClick = () => {
    void window.desktopWindow?.maximize();
  };

  return (
    <header
      className="app-region-drag topbar-meteor-surface z-30 flex shrink-0 items-center justify-end border-b border-white/20 shadow-md"
      style={{ height: 'var(--app-titlebar-row1-height)' }}
      onDoubleClick={handleTitleBarDoubleClick}
    >
      <TopBarMeteorBackdrop />
      <div className="app-region-no-drag relative z-[1] flex h-full items-center" onDoubleClick={(e) => e.stopPropagation()}>
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
  accountOpen,
  onAccountOpenChange,
  onGoHome,
  showCurriculumOverview,
  showGameLibrary,
  showMovement,
  showSchedule,
  showLessonPlanV2,
  onToggleCurriculumOverview,
  onToggleGameLibrary,
  onToggleMovement,
  onToggleSchedule,
  onToggleLessonPlanV2,
}: DesktopTitleBarProps) {
  const handleTitleBarDoubleClick = () => {
    void window.desktopWindow?.maximize();
  };

  return (
    <header
      className="app-region-drag topbar-meteor-surface z-30 flex shrink-0 items-center border-b border-white/20 shadow-md"
      style={{ height: 'var(--app-titlebar-row1-height)' }}
      onDoubleClick={handleTitleBarDoubleClick}
    >
      <TopBarMeteorBackdrop />
      <div
        className="app-region-no-drag relative z-[1] flex min-w-0 items-center gap-1 pl-3 sm:gap-2 sm:pl-6"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 text-white sm:border-r sm:border-white/20 sm:pr-3">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden">
            <Lottie animationData={logoAnimation} loop className="h-full w-full" />
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
          <Home className="h-4 w-4 text-white/90 sm:h-5 sm:w-5" />
          <span className="hidden text-[16px] sm:inline">主页</span>
        </Button>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={onSettingsOpenChange} />
      <AccountModal open={accountOpen} onOpenChange={onAccountOpenChange} />

      <div className="relative z-[1] flex-1 min-w-0" />

      <div
        className="app-region-no-drag relative z-[1] flex h-full items-center"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleCurriculumOverview}
            className={`${navBtnBase} ${navBtnActive(showCurriculumOverview)}`}
          >
            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">课程总览</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleGameLibrary}
            className={`${navBtnBase} ${navBtnActive(showGameLibrary)}`}
          >
            <LibraryBig className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">游戏库</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleMovement}
            className={`${navBtnBase} ${navBtnActive(showMovement)}`}
          >
            <Activity className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">运动拆解</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSchedule}
            className={`${navBtnBase} ${navBtnActive(showSchedule)}`}
          >
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">智能课表</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToggleLessonPlanV2}
            className={`${navBtnBase} ${navBtnActive(showLessonPlanV2)}`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">教案 MAX</span>
            <span className="hidden sm:inline lg:hidden">教案 MAX</span>
          </Button>

          <Popover>
            <PopoverTrigger
              className={`${navBtnBase} cursor-pointer aria-expanded:border-white/60 aria-expanded:bg-white/20 aria-expanded:text-white aria-expanded:shadow-sm`}
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
                onClick={() => onSettingsOpenChange(true)}
              >
                <Settings className="h-4 w-4 text-slate-500" />
                设置
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                onClick={() => onAccountOpenChange(true)}
              >
                <User className="h-4 w-4 text-slate-500" />
                账户
              </button>
            </PopoverContent>
          </Popover>
        </div>
        <WindowControls />
      </div>
    </header>
  );
}
