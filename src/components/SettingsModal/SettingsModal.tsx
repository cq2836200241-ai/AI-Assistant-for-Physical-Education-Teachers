import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAIProvider } from '../../hooks/useAIProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Eye, EyeOff, Check, Bot, Palette, ToggleLeft, Sparkles, GraduationCap, RotateCcw, Bell, Code2, BookOpen } from 'lucide-react';
import { ProviderGuide } from './ProviderGuide';
import { requestNotificationPermission } from '../../utils/classReminder';
import { EDUCATION_LEVELS, getGradesByLevel } from '../../constants/education';

type SettingsTab = 'ai' | 'theme' | 'education' | 'features' | 'developer' | 'guide';

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  { id: 'ai', label: 'AI 模型', icon: <Bot className="w-4 h-4" /> },
  { id: 'theme', label: '外观主题', icon: <Palette className="w-4 h-4" /> },
  { id: 'education', label: '班级设置', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'features', label: '功能开关', icon: <ToggleLeft className="w-4 h-4" /> },
  { id: 'developer', label: '开发者', icon: <Code2 className="w-4 h-4" /> },
  { id: 'guide', label: '使用指南', icon: <BookOpen className="w-4 h-4" /> },
];

export function SettingsModal({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { 
    providers, activeProviderId, setActiveProviderId, updateProvider, 
    theme, setTheme, 
    autoMist, setAutoMist, isTimetableEditMode, setTimetableEditMode,
    classReminderEnabled, setClassReminderEnabled,
    educationLevel, setEducationLevel, classCounts, setClassCount, resetClassCounts 
  } = useAppStore();
  const [showKey, setShowKey] = useState(false);
  const [isTestSuccess, setIsTestSuccess] = useState<boolean | null>(null);
  const [providersExpanded, setProvidersExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

  const activeProvider = providers[activeProviderId];

  const { testConnection } = useAIProvider();

  const handleClassReminderToggle = useCallback(async () => {
    if (!classReminderEnabled) {
      if (!('Notification' in window)) {
        globalThis.alert('当前环境不支持系统通知，请使用 Electron 桌面版或支持通知的浏览器。');
        return;
      }
      const granted = await requestNotificationPermission();
      if (!granted) {
        globalThis.alert('未获得通知权限，请在系统设置中允许本应用发送通知后重试。');
        return;
      }
      setClassReminderEnabled(true);
      return;
    }
    setClassReminderEnabled(false);
  }, [classReminderEnabled, setClassReminderEnabled]);

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

  const currentGrades = getGradesByLevel(educationLevel);
  const currentLevel = EDUCATION_LEVELS.find(l => l.id === educationLevel);
  const classNum = currentLevel ? classCounts[currentLevel.grades[0]] || 6 : 6;

  const handleSwitchToAITab = useCallback(() => {
    setActiveTab('ai');
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0" style={{ height: '420px' }}>
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-500" />
            设置
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0" style={{ minHeight: 0 }}>
          {/* 左侧导航栏 */}
          <nav className="w-[180px] shrink-0 border-r border-slate-100 bg-slate-50/50 p-3 flex flex-col gap-1 overflow-y-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                  ${activeTab === tab.id
                    ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-800 border border-transparent'
                  }
                `}
              >
                <span className={`${activeTab === tab.id ? 'text-primary-500' : 'text-slate-400'}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* 右侧内容区 */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* AI 模型 */}
            {activeTab === 'ai' && (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-[140px] shrink-0">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">选择提供商</h4>
                  <div className="flex flex-col gap-1">
                    {Object.values(providers).map((p) => (
                      <Button
                        key={p.id}
                        variant={activeProviderId === p.id ? "secondary" : "ghost"}
                        className="justify-start text-left w-full h-9 text-sm"
                        onClick={() => setActiveProviderId(p.id)}
                      >
                        <span className="truncate">{p.name}</span>
                        {activeProviderId === p.id && <Check className="h-3.5 w-3.5 ml-auto text-primary-500" />}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary-500" />
                      {activeProvider.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">配置信息仅保存在本地设备中。</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="apiKey" className="text-xs font-semibold text-slate-600">API Key</Label>
                    <div className="relative">
                      <Input 
                        id="apiKey"
                        type={showKey ? "text" : "password"} 
                        value={activeProvider.apiKey || ''}
                        onChange={(e) => updateProvider(activeProvider.id, { apiKey: e.target.value })}
                        placeholder={activeProvider.id === 'gemini' ? '留空则使用环境变量的 KEY' : '输入你的 API Key'}
                        className="pr-9 h-9 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-9 w-9 text-muted-foreground"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? <EyeOff className="h-3.5 w-3.5"/> : <Eye className="h-3.5 w-3.5"/>}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">模型名称 (Model)</Label>
                    <Input 
                      value={activeProvider.model || ''}
                      onChange={(e) => updateProvider(activeProvider.id, { model: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>

                  {activeProvider.baseUrl !== undefined && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">API Base URL</Label>
                      <Input 
                        value={activeProvider.baseUrl || ''}
                        onChange={(e) => updateProvider(activeProvider.id, { baseUrl: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Temperature: {activeProvider.temperature}</Label>
                    <input 
                      type="range" 
                      min="0.1" max="1.5" step="0.1" 
                      value={activeProvider.temperature || 0.7}
                      onChange={(e) => updateProvider(activeProvider.id, { temperature: parseFloat(e.target.value) })}
                      className="w-full h-1.5 accent-primary-500"
                    />
                    <p className="text-[11px] text-slate-400">数值越大发散能力越强，越小越严谨。</p>
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    <Button onClick={handleTest} variant="secondary" size="sm" className="h-8 text-xs gap-1.5">
                      测试连接
                    </Button>
                    {isTestSuccess === true && <span className="text-xs text-green-600 font-medium">✓ 连接成功</span>}
                    {isTestSuccess === false && <span className="text-xs text-red-600 font-medium">✗ 连接失败</span>}
                  </div>
                </div>
              </div>
            )}

            {/* 外观主题 */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary-500" />
                    选择主题
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">选择你喜欢的界面皮肤风格。</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'ocean', label: '海蓝微风', sub: 'Ocean', from: 'from-[#0d9488]', to: 'to-[#10b981]', border: 'border-[#0d9488]' },
                    { id: 'sunset', label: '夕阳暖日', sub: 'Sunset', from: 'from-[#ea580c]', to: 'to-[#f43f5e]', border: 'border-[#ea580c]' },
                    { id: 'cyan-blue', label: '青蓝之翼', sub: 'Cyan Blue', from: 'from-cyan-500', to: 'to-blue-600', border: 'border-[#06b6d4]' },
                    { id: 'minimal', label: '极简纯粹', sub: 'Minimal', from: 'from-[#0f172a]', to: 'to-[#334155]', border: 'border-[#0f172a]' },
                  ].map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`
                        border-2 rounded-xl p-3 cursor-pointer transition-all relative overflow-hidden
                        ${theme === t.id ? `${t.border} shadow-md` : 'border-slate-200 hover:border-slate-300'}
                      `}
                    >
                      <div className={`h-16 w-full rounded-lg bg-gradient-to-br ${t.from} ${t.to} mb-2.5`} />
                      <h4 className="font-bold text-center text-sm text-slate-800">{t.label}</h4>
                      <p className="text-[10px] text-slate-400 text-center">{t.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 班级设置 */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary-500" />
                    班级设置
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">选择学段，设置各年级的班级数量。</p>
                </div>

                {/* 学段选择 */}
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-2 block">学段选择</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {EDUCATION_LEVELS.map((level) => (
                      <div
                        key={level.id}
                        onClick={() => setEducationLevel(level.id)}
                        className={`
                          border-2 rounded-xl p-3.5 cursor-pointer transition-all text-center
                          ${educationLevel === level.id 
                            ? 'border-primary-500 bg-primary-50 shadow-sm' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                          }
                        `}
                      >
                        <div className="text-2xl mb-1">
                          {level.id === 'primary' ? '🏫' : level.id === 'junior' ? '📚' : level.id === 'senior' ? '🎓' : '🏛️'}
                        </div>
                        <h4 className={`font-bold text-sm ${educationLevel === level.id ? 'text-primary-700' : 'text-slate-700'}`}>
                          {level.label}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{level.grades.length}个年级</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-semibold text-slate-600">
                      {currentLevel?.label} — 各年级班级数设置
                    </Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs text-slate-400 hover:text-primary-600 gap-1"
                      onClick={resetClassCounts}
                    >
                      <RotateCcw className="w-3 h-3" />
                      重置默认
                    </Button>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                    {currentGrades.map((grade) => (
                      <div key={grade} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm font-medium text-slate-700">{grade}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => {
                              const current = classCounts[grade] || 6;
                              if (current > 1) setClassCount(grade, current - 1);
                            }}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm font-bold text-primary-700">
                            {classCounts[grade] || 6}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => {
                              const current = classCounts[grade] || 6;
                              if (current < 20) setClassCount(grade, current + 1);
                            }}
                          >
                            +
                          </Button>
                          <span className="text-xs text-slate-400 w-8">个班</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 功能开关 */}
            {activeTab === 'features' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <ToggleLeft className="w-4 h-4 text-primary-500" />
                    功能设置
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">开关应用的各种功能特性。</p>
                </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-200">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-semibold text-slate-800 text-sm">自动雾化已结课程</h4>
                      <p className="text-xs text-slate-500 mt-0.5">依据北京时间，将已过去的课表格子模糊化，帮助聚焦当前工作。</p>
                    </div>
                    <div 
                      onClick={() => setAutoMist(!autoMist)}
                      className={`w-11 h-5.5 rounded-full transition-all relative cursor-pointer shrink-0 ${autoMist ? 'bg-primary-600' : 'bg-slate-300'}`}
                      style={{ borderRadius: '9999px', width: '44px', height: '22px' }}
                    >
                      <div className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full transition-all shadow-sm ${autoMist ? 'left-[24px]' : 'left-[1px]'}`} style={{ top: '2px' }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-primary-500" />
                        上课提醒
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        依据智能课表（北京时间），每节课开始前 5 分钟在电脑右下角弹出通知，提示班级与上课时间。
                      </p>
                    </div>
                    <div
                      onClick={handleClassReminderToggle}
                      className={`w-11 h-5.5 rounded-full transition-all relative cursor-pointer shrink-0 ${classReminderEnabled ? 'bg-primary-600' : 'bg-slate-300'}`}
                      style={{ borderRadius: '9999px', width: '44px', height: '22px' }}
                    >
                      <div className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full transition-all shadow-sm ${classReminderEnabled ? 'left-[24px]' : 'left-[1px]'}`} style={{ top: '2px' }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-semibold text-slate-800 text-sm">编辑课表</h4>
                      <p className="text-xs text-slate-500 mt-0.5">开启后可直接在课表上点击添加、修改或删除课程安排。</p>
                    </div>
                    <div 
                      onClick={() => setTimetableEditMode(!isTimetableEditMode)}
                      className={`w-11 h-5.5 rounded-full transition-all relative cursor-pointer shrink-0 ${isTimetableEditMode ? 'bg-primary-600' : 'bg-slate-300'}`}
                      style={{ borderRadius: '9999px', width: '44px', height: '22px' }}
                    >
                      <div className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full transition-all shadow-sm ${isTimetableEditMode ? 'left-[24px]' : 'left-[1px]'}`} style={{ top: '2px' }} />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 使用指南 */}
            {activeTab === 'guide' && (
              <ProviderGuide onSwitchToAITab={handleSwitchToAITab} />
            )}

            {/* 开发者 */}
            {activeTab === 'developer' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-primary-500" />
                    开发者信息
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">关于本应用的相关信息。</p>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600">版本号</span>
                    <span className="text-sm font-semibold text-slate-800">version1.0</span>
                  </div>
                  <div className="border-t border-slate-100" />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600">创作者</span>
                    <span className="text-sm font-semibold text-slate-800">程老师</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
