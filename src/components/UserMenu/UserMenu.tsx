import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Lock, DownloadCloud } from 'lucide-react';
import { usePWAInstall } from '@/src/hooks/usePWAInstall';
import { getCurrentUser, lockAccount, logout } from '../../lib/session';

export function UserMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isInstallable, installPWA } = usePWAInstall();
  
  const username = getCurrentUser() || '用户';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setConfirmLogout(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLock = async () => {
    await lockAccount();
    window.location.reload();
  };

  return (
    <div className="relative text-slate-800" ref={menuRef}>
      <button 
        onClick={() => {
          setMenuOpen(!menuOpen);
          setConfirmLogout(false);
        }} 
        className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-[25px] hover:scale-105 transition-transform"
        title="用户菜单"
      >
        🦊
      </button>

      {menuOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
          {!confirmLogout ? (
            <>
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <span className="text-sm font-semibold text-slate-800 truncate block">
                  {username}
                </span>
              </div>
              
              {isInstallable && (
                <button 
                  onClick={() => {
                    installPWA();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600 rounded-lg transition-colors mb-1"
                >
                  <DownloadCloud className="w-4 h-4" />
                  安装桌面应用
                </button>
              )}
              
              <button 
                onClick={handleLock}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors mb-1"
              >
                <Lock className="w-4 h-4" />
                锁定账户
              </button>
              <button 
                onClick={() => setConfirmLogout(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-500 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出账户
              </button>
            </>
          ) : (
            <div className="p-2 flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-700 text-center">确定要退出吗？</span>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 h-8 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200" 
                  onClick={() => setConfirmLogout(false)}
                >
                  取消
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1 h-8 text-xs" 
                  onClick={logout}
                >
                  确认退出
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
