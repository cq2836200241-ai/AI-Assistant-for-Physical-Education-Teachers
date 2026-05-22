import { useCallback, useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

type WindowControlsProps = {
  className?: string;
};

export function WindowControls({ className }: WindowControlsProps) {
  const [maximized, setMaximized] = useState(false);

  const refreshMaximized = useCallback(async () => {
    const result = await window.desktopWindow?.isMaximized();
    setMaximized(Boolean(result?.maximized));
  }, []);

  useEffect(() => {
    void refreshMaximized();
    const onResize = () => {
      void refreshMaximized();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [refreshMaximized]);

  const handleMinimize = () => {
    void window.desktopWindow?.minimize();
  };

  const handleMaximize = async () => {
    const result = await window.desktopWindow?.maximize();
    setMaximized(Boolean(result?.maximized));
  };

  const handleClose = () => {
    void window.desktopWindow?.close();
  };

  const btnClass =
    'inline-flex h-full w-14 min-w-14 items-center justify-center rounded-none border-0 bg-transparent p-0 text-white/90 transition-colors hover:bg-white/20 hover:text-white';

  return (
    <div className={`flex h-full shrink-0 items-center ${className ?? ''}`}>
      <button
        type="button"
        className={btnClass}
        onClick={handleMinimize}
        aria-label="最小化"
        title="最小化"
      >
        <Minus className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={() => void handleMaximize()}
        aria-label={maximized ? '还原' : '最大化'}
        title={maximized ? '还原' : '最大化'}
      >
        {maximized ? (
          <span className="relative block h-4 w-4">
            <span className="absolute bottom-0 left-0 h-3 w-3 rounded-[1px] border border-current" />
            <span className="absolute right-0 top-0 h-3 w-3 rounded-[1px] border border-current bg-gradient-to-br from-primary-500/30 to-secondary-500/30" />
          </span>
        ) : (
          <Square className="h-4 w-4" strokeWidth={1.9} />
        )}
      </button>
      <button
        type="button"
        className={`${btnClass} hover:bg-red-500/90 hover:text-white`}
        onClick={handleClose}
        aria-label="关闭"
        title="关闭"
      >
        <X className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </button>
    </div>
  );
}
