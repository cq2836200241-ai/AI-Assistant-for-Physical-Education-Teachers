import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  Sparkles,
  FileText,
  Target,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store/appStore';

type AuthMode = 'login' | 'register' | 'forgot';

const MODE_META: Record<
  AuthMode,
  {
    title: string;
    subtitle: string;
    icon: typeof ShieldCheck;
  }
> = {
  login: {
    title: '登录教案系统',
    subtitle: '继续进入你的教案工作台、历史记录和个人设置。',
    icon: ShieldCheck,
  },
  register: {
    title: '创建本地账户',
    subtitle: '注册后即可拥有独立的历史记录、配置和账号锁定能力。',
    icon: UserPlus,
  },
  forgot: {
    title: '找回密码',
    subtitle: '通过密保问题重设密码，不影响本地保存的教案数据。',
    icon: KeyRound,
  },
};

type AuthScreenProps = {
  onLogin: (username: string) => Promise<void> | void;
};

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showExistingUsers, setShowExistingUsers] = useState(false);
  const [existingUsers, setExistingUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modeMeta = MODE_META[mode];

  const heroItems = useMemo(
    () => [
      {
        icon: FileText,
        title: 'AI 写教案',
        description: '覆盖田径、球类、体操等全部项目，自动生成符合教学规范的完整教案结构。',
      },
      {
        icon: Target,
        title: '精准匹配',
        description: '根据年级、课时类型、场地条件智能调整教案内容，输出即用。',
      },
      {
        icon: Shield,
        title: '账户隔离',
        description: '每位教师独立账户，教案互不可见。支持密码锁定，离开工位一键锁屏。',
      },
    ],
    [],
  );

  const loadExistingUsers = async () => {
    const users = await window.desktopAuth?.listUsers();
    setExistingUsers(users ?? []);
  };

  useEffect(() => {
    void loadExistingUsers();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!username) {
      setError('请输入用户名');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!password) {
          setError('请输入密码');
          return;
        }

        const result = await window.desktopAuth?.login({ username, password });
        if (result?.ok) {
          await onLogin(username);
        } else {
          setError('用户名或密码错误');
        }
        return;
      }

      if (mode === 'register') {
        if (!password || !question || !answer) {
          setError('请填写所有必填字段');
          return;
        }

        try {
          const result = await window.desktopAuth?.register({ username, password, question, answer });
          if (result?.ok) {
            await loadExistingUsers();
            await onLogin(username);
          }
        } catch (registerError: any) {
          setError(registerError?.message || '注册失败，请重试');
        }
        return;
      }

      if (!question) {
        const result = await window.desktopAuth?.getSecurityQuestion(username);
        if (!result?.exists) {
          setError('用户不存在');
          return;
        }
        setQuestion(result.question || '');
        setSuccess('请输入密保答案，并设置一个新密码。');
        return;
      }

      if (!newPassword) {
        setError('请输入新密码');
        return;
      }

      const result = await window.desktopAuth?.resetPassword({ username, answer, newPassword });
      if (!result?.ok) {
        setError(result?.reason === 'answer' ? '密保答案不正确' : '密码重置失败，请重试');
        return;
      }

      setSuccess('密码重置成功，请使用新密码登录。');
      setMode('login');
      setPassword('');
      setQuestion('');
      setAnswer('');
      setNewPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setPassword('');
    setQuestion('');
    setAnswer('');
    setNewPassword('');
  };

  const ModeIcon = modeMeta.icon;

  return (
    <div className="relative flex min-h-full w-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="relative z-10 grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_420px] xl:gap-6">
        <section className="relative overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-br from-primary-100/60 via-card/90 to-background p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-300" />
          <div className="absolute -left-12 top-16 h-40 w-40 rounded-full bg-primary-300/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-secondary-500/20 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary-500" />
              AI 体育教案工作台
            </div>

            <div className="mt-6 max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                你的 AI 体育教学助手
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                从教案撰写到课堂活动设计，AI 辅助覆盖备课全流程。本地多账户支持，让每位教师拥有专属工作空间。
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {heroItems.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm backdrop-blur"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-3 text-sm font-semibold text-foreground">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-border/70 bg-background/75 px-4 py-3 text-sm leading-6 text-muted-foreground shadow-sm">
              初次使用，请前往设置查看使用指南，配置好 API 即可开启智能助手。
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card/90 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
          <div className="border-b border-border/70 bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-5 text-primary-foreground">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/15">
                <ModeIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{modeMeta.title}</h2>
                <p className="mt-1 text-sm text-white/80">{modeMeta.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-foreground/90">
                  用户名
                </Label>
                <Input
                  id="username"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={mode === 'forgot' && question !== ''}
                  className="h-10 rounded-xl border-border/70 bg-background/75 px-3 text-sm shadow-sm"
                />
              </div>

              {mode === 'login' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground/90">
                      密码
                    </Label>
                    <button
                      type="button"
                      onClick={() => resetForm('forgot')}
                      className="text-xs font-medium text-primary-600 transition-colors hover:text-primary-500"
                    >
                      忘记密码
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-10 rounded-xl border-border/70 bg-background/75 px-3 text-sm shadow-sm"
                  />
                </div>
              )}

              {mode === 'register' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground/90">
                      密码
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入你的密码"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-10 rounded-xl border-border/70 bg-background/75 px-3 text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="question" className="text-sm font-medium text-foreground/90">
                      密保问题
                    </Label>
                    <Input
                      id="question"
                      placeholder="例如：你的小学名字是什么？"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      className="h-10 rounded-xl border-border/70 bg-background/75 px-3 text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="answer" className="text-sm font-medium text-foreground/90">
                      密保答案
                    </Label>
                    <Input
                      id="answer"
                      placeholder="请输入密保答案"
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      className="h-10 rounded-xl border-border/70 bg-background/75 px-3 text-sm shadow-sm"
                    />
                  </div>
                </>
              )}

              {mode === 'forgot' && (
                <>
                  {question === '' ? (
                    <div className="rounded-2xl border border-border/70 bg-background/75 p-4 text-sm leading-6 text-muted-foreground shadow-sm">
                      输入用户名后，我们会先展示该账户的密保问题，再帮你设置一个新密码。
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
                        <div className="text-xs font-medium text-muted-foreground">密保问题</div>
                        <div className="mt-2 text-sm font-semibold leading-6 text-foreground">{question}</div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="answer" className="text-sm font-medium text-foreground/90">
                          密保答案
                        </Label>
                        <Input
                          id="answer"
                          placeholder="请输入正确的密保答案"
                          value={answer}
                          onChange={(event) => setAnswer(event.target.value)}
                          className="h-10 rounded-xl border-border/70 bg-background/75 px-3 text-sm shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-foreground/90">
                          新密码
                        </Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="设置新密码"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="h-10 rounded-xl border-border/70 bg-background/75 px-3 text-sm shadow-sm"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl bg-primary-600 text-sm font-semibold shadow-sm hover:bg-primary-700"
              >
                <span>
                  {mode === 'login'
                    ? '登录'
                    : mode === 'register'
                      ? '完成注册'
                      : question === ''
                        ? '下一步'
                        : '重置密码'}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                {mode !== 'login' && (
                  <button
                    type="button"
                    onClick={() => resetForm('login')}
                    className="font-medium text-primary-600 transition-colors hover:text-primary-500"
                  >
                    返回登录
                  </button>
                )}
                {mode === 'login' && (
                  <>
                    <span>还没有账号？</span>
                    <button
                      type="button"
                      onClick={() => resetForm('register')}
                      className="font-medium text-primary-600 transition-colors hover:text-primary-500"
                    >
                      免费注册
                    </button>
                  </>
                )}
              </div>

              {mode === 'login' && existingUsers.length > 0 && (
                <div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setShowExistingUsers((value) => !value)}
                    className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
                  >
                    <span>已有 {existingUsers.length} 个本地账户</span>
                    <span className="text-xs text-muted-foreground">
                      {showExistingUsers ? '收起' : '点击选择'}
                    </span>
                  </button>

                  <div
                    className={cn(
                      'grid overflow-hidden transition-[grid-template-rows,margin-top] duration-200',
                      showExistingUsers ? 'mt-3 grid-rows-[1fr]' : 'mt-0 grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-wrap gap-2">
                        {existingUsers.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setUsername(name);
                              setShowExistingUsers(false);
                            }}
                            className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
