import { useState } from 'react';
import { DownloadCloud, Lock, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePWAInstall } from '@/src/hooks/usePWAInstall';
import { getCurrentUser, lockAccount, logout } from '../../lib/session';

export function AccountModal({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { isInstallable, installPWA } = usePWAInstall();
  const username = getCurrentUser() || '用户';

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmLogout(false);
    }
    onOpenChange?.(nextOpen);
  };

  const handleLock = async () => {
    await lockAccount();
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="h-5 w-5 text-primary-500" />
            账户管理
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 text-xl font-bold text-white shadow-sm">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">{username}</p>
              <p className="text-xs text-slate-400">当前登录账户</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
            {isInstallable && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-slate-200 text-xs text-slate-600"
                onClick={() => {
                  installPWA();
                }}
              >
                <DownloadCloud className="h-3.5 w-3.5" />
                安装应用
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-slate-200 text-xs text-slate-600"
              onClick={handleLock}
            >
              <Lock className="h-3.5 w-3.5" />
              锁定
            </Button>
            {!confirmLogout ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-slate-200 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => setConfirmLogout(true)}
              >
                <LogOut className="h-3.5 w-3.5" />
                退出登录
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-slate-500"
                  onClick={() => setConfirmLogout(false)}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={logout}
                >
                  确认退出
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
