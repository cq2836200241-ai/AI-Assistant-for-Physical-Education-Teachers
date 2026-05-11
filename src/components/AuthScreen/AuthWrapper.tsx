import React, { useEffect, useState, useRef } from 'react';
import { AuthScreen } from './AuthScreen';
import { useAppStore, LessonPlan } from '../../store/appStore';
import { Button } from '@/components/ui/button';
import { LogOut, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => sessionStorage.getItem('currentUser'));
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isLocked, setIsLocked] = useState(() => sessionStorage.getItem('isLocked') === 'true');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const store = useAppStore();

  useEffect(() => {
    if (username) {
      const historyStr = localStorage.getItem(`history_${username}`);
      if (historyStr) {
        useAppStore.setState({ history: JSON.parse(historyStr) });
      } else {
        useAppStore.setState({ history: [] });
      }
    } else {
      useAppStore.setState({ history: [] });
    }
  }, [username]);

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

  const handleLogin = (user: string) => {
    sessionStorage.setItem('currentUser', user);
    setUsername(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLocked');
    setUsername(null);
    setMenuOpen(false);
    setConfirmLogout(false);
    setIsLocked(false);
  };

  const handleLock = () => {
    sessionStorage.setItem('isLocked', 'true');
    setIsLocked(true);
    setMenuOpen(false);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    if (!username) return;
    
    const users = JSON.parse(localStorage.getItem('localUsers') || '{}');
    if (users[username] && users[username].password === unlockPassword) {
      sessionStorage.removeItem('isLocked');
      setIsLocked(false);
      setUnlockPassword('');
    } else {
      setUnlockError('密码错误');
    }
  };

  if (!username) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (isLocked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 relative z-[9999]">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
            🦊
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">账号已锁定</h2>
          <p className="text-sm text-slate-500 mb-6">欢迎回来，{username}。请输入密码解锁。</p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2 text-left">
              <Input
                type="password"
                placeholder="请输入密码"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                autoFocus
              />
              {unlockError && <div className="text-sm text-red-500">{unlockError}</div>}
            </div>
            <Button type="submit" className="w-full bg-primary-600 hover:bg-primary-700">
              解锁
            </Button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                切换账号或退出
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}

export const saveToHistory = async (plan: LessonPlan) => {
  const currentUser = sessionStorage.getItem('currentUser');
  if (!currentUser) return;
  
  const historyKey = `history_${currentUser}`;
  const historyStr = localStorage.getItem(historyKey);
  const history: LessonPlan[] = historyStr ? JSON.parse(historyStr) : [];
  
  const existingIndex = history.findIndex(h => h.id === plan.id);
  if (existingIndex >= 0) {
    history[existingIndex] = plan;
  } else {
    history.unshift(plan);
  }
  
  localStorage.setItem(historyKey, JSON.stringify(history));
};

export const deleteFromHistory = async (id: string) => {
  const currentUser = sessionStorage.getItem('currentUser');
  if (!currentUser) return;
  
  const historyKey = `history_${currentUser}`;
  const historyStr = localStorage.getItem(historyKey);
  if (!historyStr) return;
  
  const history: LessonPlan[] = JSON.parse(historyStr);
  const updatedHistory = history.filter(h => h.id !== id);
  localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
};
