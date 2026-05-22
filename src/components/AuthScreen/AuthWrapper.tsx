import React, { useEffect, useState } from 'react';
import { LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
import { AuthScreen } from './AuthScreen';
import { useAppStore, LessonPlan } from '../../store/appStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { initializeSession, setCurrentUser, unlockAccount } from '../../lib/session';
import { readDesktopUserStore, writeDesktopUserStore } from '../../lib/desktopStorage';
import { hydrateDesktopAppState, startDesktopAppPersistence } from '../../store/desktopAppPersistence';

const HISTORY_KEY = 'history';

type AuthWrapperProps = {
  children: React.ReactNode;
  desktopTitleBar?: React.ReactNode;
};

function AuthBackdrop() {
  const theme = useAppStore((state) => state.theme);

  return (
    <>
      {theme === 'insight-grid' && <div className="insight-grid-backdrop fixed inset-0 z-0" />}
      <div className="auth-shell-backdrop absolute inset-0 z-0 overflow-hidden">
        <div className="auth-shell-orb auth-shell-orb-primary" />
        <div className="auth-shell-orb auth-shell-orb-secondary" />
        <div className="auth-shell-orb auth-shell-orb-tertiary" />
      </div>
      {(theme === 'aurora' || theme === 'insight-grid') && (
        <div
          className={`fixed bottom-0 left-0 right-0 h-[3px] z-[2] pointer-events-none ${
            theme === 'aurora' ? 'aurora-stripe' : 'insight-grid-stripe'
          }`}
        />
      )}
    </>
  );
}

function AuthShell({
  desktopTitleBar,
  children,
}: {
  desktopTitleBar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <AuthBackdrop />
      <div className="relative z-[1] flex h-full flex-col">
        {desktopTitleBar ?? null}
        <div className="auth-shell-scroll min-h-0 flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function AuthStatusScreen({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full w-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="auth-status-card relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-border/70 bg-card/90 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="border-b border-border/70 bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-5 text-primary-foreground">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/15">
              {icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-white/80">{description}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-6 sm:px-7">{children}</div>
      </div>
    </div>
  );
}

export function AuthWrapper({ children, desktopTitleBar }: AuthWrapperProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      try {
        await hydrateDesktopAppState();
        startDesktopAppPersistence();
        document.documentElement.setAttribute('data-theme', useAppStore.getState().theme);
      } catch (error) {
        console.error('恢复桌面应用状态失败', error);
      }

      try {
        const session = await initializeSession();
        if (!alive) return;
        setUsername(session.currentUser);
        setIsLocked(session.locked);
      } finally {
        if (alive) setIsReady(true);
      }
    };

    void bootstrap();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!username) {
      useAppStore.setState({ history: [], previewedHistoryPlan: null });
      return;
    }

    let alive = true;
    readDesktopUserStore<LessonPlan[]>(username, HISTORY_KEY, [])
      .then((history) => {
        if (!alive) return;
        useAppStore.setState({
          history: Array.isArray(history) ? history : [],
          previewedHistoryPlan: null,
        });
      })
      .catch(() => {
        if (alive) {
          useAppStore.setState({ history: [], previewedHistoryPlan: null });
        }
      });

    return () => {
      alive = false;
    };
  }, [isReady, username]);

  const handleLogin = async (user: string) => {
    await setCurrentUser(user);
    setUsername(user);
    setIsLocked(false);
  };

  const handleLogout = async () => {
    await window.desktopSession?.clear();
    setUsername(null);
    setIsLocked(false);
    setUnlockPassword('');
    useAppStore.setState({ history: [], previewedHistoryPlan: null });
  };

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setUnlockError('');
    if (!username) return;

    const result = await window.desktopAuth?.unlock({ username, password: unlockPassword });
    if (result?.ok) {
      await unlockAccount();
      setIsLocked(false);
      setUnlockPassword('');
    } else {
      setUnlockError('密码错误');
    }
  };

  if (!isReady) {
    return (
      <AuthShell desktopTitleBar={desktopTitleBar}>
        <AuthStatusScreen
          icon={<ShieldCheck className="h-6 w-6" />}
          title="正在读取本地数据"
          description="请稍候，系统正在恢复你的账户状态和本地工作区。"
        >
          <div className="space-y-4">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="auth-status-loading-bar h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500" />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              这一步会读取当前登录账户、锁屏状态以及本地教案历史。
            </p>
          </div>
        </AuthStatusScreen>
      </AuthShell>
    );
  }

  if (!username) {
    return (
      <AuthShell desktopTitleBar={desktopTitleBar}>
        <AuthScreen onLogin={handleLogin} />
      </AuthShell>
    );
  }

  if (isLocked) {
    return (
      <AuthShell desktopTitleBar={desktopTitleBar}>
        <AuthStatusScreen
          icon={<LockKeyhole className="h-6 w-6" />}
          title="账户已锁定"
          description={`欢迎回来，${username}。输入密码即可恢复到刚才的工作区。`}
        >
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="请输入密码"
                value={unlockPassword}
                onChange={(event) => setUnlockPassword(event.target.value)}
                autoFocus
                className="h-10 rounded-xl border-border/70 bg-background/75 px-3 text-sm shadow-sm"
              />
              {unlockError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  {unlockError}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-primary-600 text-sm font-semibold shadow-sm hover:bg-primary-700"
            >
              解锁
            </Button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/75 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              切换账户或退出
            </button>
          </form>
        </AuthStatusScreen>
      </AuthShell>
    );
  }

  return <>{children}</>;
}

export const saveToHistory = async (plan: LessonPlan) => {
  const currentUser = await window.desktopSession?.get();
  const username = currentUser?.currentUser;
  if (!username) return;

  const history = await readDesktopUserStore<LessonPlan[]>(username, HISTORY_KEY, []);
  const safeHistory = Array.isArray(history) ? history : [];
  const existingIndex = safeHistory.findIndex((item) => item.id === plan.id);
  if (existingIndex >= 0) {
    safeHistory[existingIndex] = plan;
  } else {
    safeHistory.unshift(plan);
  }

  await writeDesktopUserStore(username, HISTORY_KEY, safeHistory);
};

export const deleteFromHistory = async (id: string) => {
  const currentUser = await window.desktopSession?.get();
  const username = currentUser?.currentUser;
  if (!username) return;

  const history = await readDesktopUserStore<LessonPlan[]>(username, HISTORY_KEY, []);
  const updatedHistory = Array.isArray(history) ? history.filter((item) => item.id !== id) : [];
  await writeDesktopUserStore(username, HISTORY_KEY, updatedHistory);
};

export const updateHistoryPlan = async (plan: LessonPlan) => {
  await saveToHistory(plan);
};
