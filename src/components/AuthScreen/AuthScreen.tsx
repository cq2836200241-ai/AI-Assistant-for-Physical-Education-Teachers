import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

export function AuthScreen({ onLogin }: { onLogin: (username: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showExistingUsers, setShowExistingUsers] = useState(false);

  const getUsers = () => {

    try {
      return JSON.parse(localStorage.getItem('localUsers') || '{}');
    } catch {
      return {};
    }
  };
  const saveUsers = (users: any) => localStorage.setItem('localUsers', JSON.stringify(users));


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!username) {
      setError('请输入用户名');
      return;
    }

    const users = getUsers();

    if (mode === 'login') {
      if (!password) {
        setError('请输入密码');
        return;
      }
      const user = users[username];
      if (user && user.password === password) {
        onLogin(username);
      } else {
        setError('用户名或密码错误');
      }
    } else if (mode === 'register') {
      if (!password || !question || !answer) {
        setError('请填写所有必需字段');
        return;
      }
      if (users[username]) {
        setError('用户名已存在');
        return;
      }
      users[username] = { password, question, answer };
      saveUsers(users);
      onLogin(username);
    } else if (mode === 'forgot') {
      const user = users[username];
      if (!user) {
        setError('用户不存在');
        return;
      }
      if (!question) {
        // Step 1: Check username and load question
        setQuestion(user.question);
        setSuccess('请输入密保问题答案并设置新密码');
        return;
      } else {
        // Step 2: Check answer and reset password
        if (user.answer !== answer) {
          setError('密保问题答案不正确');
          return;
        }
        if (!newPassword) {
          setError('请输入新密码');
          return;
        }
        user.password = newPassword;
        saveUsers(users);
        setSuccess('密码重置成功，请登录');
        setMode('login');
        setPassword('');
        setQuestion('');
        setAnswer('');
        setNewPassword('');
      }
    }
  };

  const resetForm = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setPassword('');
    setQuestion('');
    setAnswer('');
    setNewPassword('');
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-2xl text-primary-600">
            🏃
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {mode === 'login' ? '登录教案系统' : mode === 'register' ? '注册新账号' : '找回密码'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            本地存储数据，保护您的教学隐私
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={mode === 'forgot' && question !== ''} // Lock username when answering question
            />
          </div>

          {mode === 'login' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <button
                  type="button"
                  onClick={() => resetForm('forgot')}
                  className="text-xs text-primary-600 hover:underline"
                >
                  忘记密码？
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {mode === 'register' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入您的密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="question">密保问题 (用于找回密码)</Label>
                <Input
                  id="question"
                  placeholder="例如：您的小学名字？"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="answer">密保答案</Label>
                <Input
                  id="answer"
                  placeholder="请输入密保答案"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <>
              {question === '' ? (
                // Initial forgot password step - just enter username
                <div className="text-sm text-slate-500">
                  请输入您的用户名，我们将通过密保问题帮助您重置密码。
                </div>
              ) : (
                // Username entered, show question and answer field
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">密保问题</Label>
                    <div className="font-medium text-slate-800">{question}</div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="answer">密保答案</Label>
                    <Input
                      id="answer"
                      placeholder="请输入正确的密保答案"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新密码</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="设定新密码"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {error && <div className="text-sm text-red-500">{error}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}

          <Button type="submit" className="w-full bg-primary-600 hover:bg-primary-700">
            {mode === 'login' ? '登录' : mode === 'register' ? '完成注册' : question === '' ? '下一步' : '重置密码'}
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-center text-sm text-slate-500">
          {mode !== 'login' && (
            <button
              onClick={() => resetForm('login')}
              className="text-primary-600 hover:underline"
            >
              返回登录
            </button>
          )}
          {mode !== 'register' && mode !== 'forgot' && (
            <span>
              没有账号？{' '}
              <button
                onClick={() => resetForm('register')}
                className="text-primary-600 hover:underline"
              >
                免费注册
              </button>
            </span>
          )}
          
          {/* 显示已注册用户列表 */}
          {mode === 'login' && (() => {
            const users = getUsers();
            const usernames = Object.keys(users);
            if (usernames.length === 0) return null;
            return (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExistingUsers(!showExistingUsers)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showExistingUsers ? '收起已注册账号' : `已有 ${usernames.length} 个注册账号，点击查看`}
                </button>
                {showExistingUsers && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {usernames.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => { setUsername(name); setShowExistingUsers(false); }}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-primary-100 hover:text-primary-700 rounded-full transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
