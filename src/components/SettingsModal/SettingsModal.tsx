import { useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { useAIProvider } from '../../hooks/useAIProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Eye, EyeOff, Check, LogOut, Lock, DownloadCloud, User } from 'lucide-react';
import { getCurrentUser, lockAccount, logout } from '../../lib/session';
import { usePWAInstall } from '@/src/hooks/usePWAInstall';

export function SettingsModal() {
  const { providers, activeProviderId, setActiveProviderId, updateProvider, theme, setTheme, autoMist, setAutoMist, isTimetableEditMode, setTimetableEditMode } = useAppStore();
  const [showKey, setShowKey] = useState(false);
  const [isTestSuccess, setIsTestSuccess] = useState<boolean | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { isInstallable, installPWA } = usePWAInstall();
  const username = getCurrentUser() || '用户';

  const activeProvider = providers[activeProviderId];

  const { testConnection } = useAIProvider();

  const handleTest = useCallback(async () => {
    setIsTestSuccess(null);
    try {
      const result = await testConnection(activeProviderId, {
        apiKey: activeProvider.apiKey,
        baseUrl: activeProvider.baseUrl,
        model: activeProvider.model,
        temperature: activeProvider.temperature,
      });
      setIsTestSuccess(true);
    } catch(e) {
      console.error('Test connection failed:', e);
      setIsTestSuccess(false);
    }
  }, [activeProviderId, activeProvider.apiKey, activeProvider.baseUrl, activeProvider.model, activeProvider.temperature, testConnection]);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 text-[13px] h-9 px-4 rounded-full border-white/25 shadow-none bg-transparent hover:bg-white/15 hover:border-white/40 transition-all text-white/90">
            <Settings className="h-5 w-5 text-white/90" />
            <span className="hidden sm:inline text-[16px]">设置</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI 模型配置</DialogTitle>
          <DialogDescription>
            您可以配置 AI 提供商及接口参数，或更改应用界面的皮肤主题。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="mt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="ai">AI 模型配置</TabsTrigger>
            <TabsTrigger value="theme">外观与主题</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="flex flex-col md:flex-row gap-6 mt-0">
            <div className="md:w-1/3 border-r pr-4">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">选择提供商</h4>
              <div className="flex flex-col gap-1">
                {Object.values(providers).map((p) => (
                  <Button
                    key={p.id}
                    variant={activeProviderId === p.id ? "secondary" : "ghost"}
                    className="justify-start text-left w-full h-9"
                    onClick={() => setActiveProviderId(p.id)}
                  >
                    <span className="truncate">{p.name}</span>
                    {activeProviderId === p.id && <Check className="h-4 w-4 ml-auto" />}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="md:w-2/3 flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-medium">{activeProvider.name} 配置</h3>
                <p className="text-sm text-muted-foreground">设置在本地。当使用 Gemini 时默认可使用内置的环境变量密钥。</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input 
                    id="apiKey"
                    type={showKey ? "text" : "password"} 
                    value={activeProvider.apiKey || ''}
                    onChange={(e) => updateProvider(activeProvider.id, { apiKey: e.target.value })}
                    placeholder={activeProvider.id === 'gemini' ? '留空则使用环境变量的 KEY' : '输入你的 API Key'}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label autoCapitalize="none">模型名称 (Model)</Label>
                <Input 
                  value={activeProvider.model || ''}
                  onChange={(e) => updateProvider(activeProvider.id, { model: e.target.value })}
                />
              </div>

              {activeProvider.baseUrl !== undefined && (
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <Input 
                    value={activeProvider.baseUrl || ''}
                    onChange={(e) => updateProvider(activeProvider.id, { baseUrl: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Temperature: {activeProvider.temperature}</Label>
                <input 
                  type="range" 
                  min="0.1" max="1.5" step="0.1" 
                  value={activeProvider.temperature || 0.7}
                  onChange={(e) => updateProvider(activeProvider.id, { temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">数值越大代表发散能力越强，数值越小越严谨。</p>
              </div>

              <Button onClick={handleTest} variant="secondary" className="w-auto self-start mt-2">
                🔌 测试连接
              </Button>
              {isTestSuccess === true && <p className="text-sm text-green-600">连接成功！</p>}
              {isTestSuccess === false && <p className="text-sm text-red-600">连接失败，请检查配置</p>}
            </div>
          </TabsContent>

          <TabsContent value="theme" className="mt-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">功能与外观设置</h3>
                <p className="text-sm text-muted-foreground">配置应用的功能开关以及界面皮肤。</p>
              </div>

              {/* 功能开关区块 */}
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800">自动雾化已结课程</h4>
                    <p className="text-[13px] text-slate-500">依据北京时间，将已经过去的课程格子进行模糊化，帮助您聚焦当前工作。</p>
                  </div>
                  <div 
                    onClick={() => setAutoMist(!autoMist)}
                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${autoMist ? 'bg-primary-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${autoMist ? 'left-7' : 'left-1'}`} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-800">编辑课表</h4>
                    <p className="text-[13px] text-slate-500">开启后可直接在课表上点击添加、修改或删除课程安排。</p>
                  </div>
                  <div 
                    onClick={() => setTimetableEditMode(!isTimetableEditMode)}
                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${isTimetableEditMode ? 'bg-primary-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isTimetableEditMode ? 'left-7' : 'left-1'}`} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${theme === 'ocean' ? 'border-[#0d9488] bg-[#0d9488]/5 shadow-md' : 'border-slate-200 hover:border-[#0d9488]/50'}`}
                  onClick={() => setTheme('ocean')}
                >
                  <div className="h-20 w-full rounded-lg bg-gradient-to-br from-[#0d9488] to-[#10b981] mb-3"></div>
                  <h4 className="font-bold text-slate-800 text-center">海蓝微风 (Ocean)</h4>
                  <p className="text-xs text-slate-500 text-center mt-1">清新自然的经典主题</p>
                </div>
                
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${theme === 'sunset' ? 'border-[#ea580c] bg-[#ea580c]/5 shadow-md' : 'border-slate-200 hover:border-[#ea580c]/50'}`}
                  onClick={() => setTheme('sunset')}
                >
                  <div className="h-20 w-full rounded-lg bg-gradient-to-br from-[#ea580c] to-[#f43f5e] mb-3"></div>
                  <h4 className="font-bold text-slate-800 text-center">夕阳暖日 (Sunset)</h4>
                  <p className="text-xs text-slate-500 text-center mt-1">温暖活力的色彩搭配</p>
                </div>
                
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${theme === 'cyan-blue' ? 'border-[#06b6d4] bg-[#06b6d4]/5 shadow-md' : 'border-slate-200 hover:border-[#06b6d4]/50'}`}
                  onClick={() => setTheme('cyan-blue')}
                >
                  <div className="h-20 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 mb-3 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 -rotate-45 translate-x-8 -translate-y-8"></div>
                  </div>
                  <h4 className="font-bold text-slate-800 text-center">青蓝之翼 (Cyan Blue)</h4>
                  <p className="text-xs text-slate-500 text-center mt-1">深邃灵动的专业配色</p>
                </div>

                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${theme === 'minimal' ? 'border-[#0f172a] bg-[#0f172a]/5 shadow-md' : 'border-slate-200 hover:border-[#0f172a]/50'}`}
                  onClick={() => setTheme('minimal')}
                >
                  <div className="h-20 w-full rounded-lg bg-gradient-to-br from-[#0f172a] to-[#334155] mb-3"></div>
                  <h4 className="font-bold text-slate-800 text-center">极简纯粹 (Minimal)</h4>
                  <p className="text-xs text-slate-500 text-center mt-1">克制优雅的高级灰黑</p>
                </div>

                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${theme === 'dark' ? 'border-[#6366f1] bg-[#6366f1]/5 shadow-md' : 'border-slate-200 hover:border-[#6366f1]/50'}`}
                  onClick={() => setTheme('dark')}
                >
                  <div className="h-20 w-full rounded-lg bg-gradient-to-br from-[#09090b] to-[#18181b] border border-slate-700/50 mb-3 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7]"></div>
                  </div>
                  <h4 className="font-bold text-slate-800 text-center">暗夜星空 (Dark)</h4>
                  <p className="text-xs text-slate-500 text-center mt-1">炫酷深邃的暗黑模式</p>
                </div>

                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${theme === 'dream' ? 'border-[#7c3aed] bg-[#7c3aed]/5 shadow-md' : 'border-slate-200 hover:border-[#7c3aed]/50'}`}
                  onClick={() => setTheme('dream')}
                >
                  <div className="h-20 w-full rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#d946ef] mb-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 backdrop-blur-sm mix-blend-overlay"></div>
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/40 blur-xl rounded-full"></div>
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-[#d946ef]/40 blur-xl rounded-full"></div>
                  </div>
                  <h4 className="font-bold text-slate-800 text-center">绮梦幻境 (Dream)</h4>
                  <p className="text-xs text-slate-500 text-center mt-1">顶尖设计的浪漫紫</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 用户账户区域 */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                🦊
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{username}</p>
                <p className="text-[11px] text-slate-400">当前账户</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isInstallable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-slate-200 text-slate-600"
                  onClick={() => { installPWA(); }}
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  安装
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-slate-200 text-slate-600"
                onClick={() => { lockAccount(); logout(); }}
              >
                <Lock className="w-3.5 h-3.5" />
                锁定
              </Button>
              {!confirmLogout ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setConfirmLogout(true)}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  退出
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
