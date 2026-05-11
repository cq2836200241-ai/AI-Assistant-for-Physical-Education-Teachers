import { useAppStore, LessonPlan, AdoptedPlan } from '../../store/appStore';
import { Button } from '@/components/ui/button';
import { RotateCcw, X, Edit2, Check, Calendar, ChevronDown, ChevronUp, CheckCircle2, Copy, LayoutGrid, Activity, FileText, FileDown, Printer, BookmarkCheck, History as HistoryIcon, Trash2, Folder, Download, Upload, Search, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LessonPlanViewer } from '../LessonPlanViewer/LessonPlanViewer';
import { useRef, useState, useEffect, useMemo } from 'react';
import { saveAs } from 'file-saver';
import { exportMarkdownToWord } from '../../utils/markdownToDocx';
import { downloadLessonPlanPdf } from '../../utils/exportPdf';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { deleteFromHistory, saveToHistory } from '../AuthScreen/AuthWrapper';

import { TimetableTable } from '../TimetableTable/TimetableTable';
import { MovementDecompositionTable } from '../MovementDecompositionTable/MovementDecompositionTable';

interface PreviewPanelProps {
  onGenerate?: (isRegeneration?: boolean) => void;
  showSchedule?: boolean;
  showMovement?: boolean;
  showHistory?: boolean;
  showAdopted?: boolean;
  onToggleSchedule?: () => void;
  onToggleMovement?: () => void;
  onToggleHistory?: () => void;
  onToggleAdopted?: () => void;
}

export function PreviewPanel({ onGenerate, showSchedule = false, showMovement = false, showHistory = false, showAdopted = false, onToggleSchedule, onToggleMovement, onToggleHistory, onToggleAdopted }: PreviewPanelProps) {
  const {
    currentPlanContent, isGenerating, form, generationStatus, generationProgress,
    previewedHistoryPlan, setPreviewedHistoryPlan,
    schedule, updateSchedule,
    addAdoptedPlan,
    history, removeHistory,
    adoptedPlans, removeAdoptedPlan, clearAdoptedPlansByClass
  } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showSuccessMsg, setShowSuccessMsg] = useState('');
  const [isRegenConfirmOpen, setIsRegenConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const days = ['星期一', '星期二', '星期三', '星期四', '星期五'];
  const periods = ['第一节', '第二节', '第三节', '第四节', '第五节', '第六节', '第七节', '第八节'];

  const displayContent = isEditing ? editedContent : (previewedHistoryPlan ? previewedHistoryPlan.content : currentPlanContent);
  const displayTitle = previewedHistoryPlan ? previewedHistoryPlan.title : form.courseName;
  const displayGrades = previewedHistoryPlan ? previewedHistoryPlan.grades : form.grades;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleAdoptPlan = (className: string) => {
    const contentToUse = isEditing ? editedContent : displayContent;
    if (!contentToUse) return;
    const planToAdopt = previewedHistoryPlan || {
      id: "generated-" + Date.now(),
      title: displayTitle || '教学活动',
      content: contentToUse,
      grades: displayGrades,
      summary: '',
      date: new Date().toISOString(),
      tags: []
    };
    
    const adoptedGrade = planToAdopt.grades?.[0] || '一年级';
    
    addAdoptedPlan({
      id: "adopted-" + Date.now(),
      planId: planToAdopt.id,
      title: planToAdopt.title,
      dateAdopted: new Date().toISOString(),
      grade: adoptedGrade,
      className,
      content: contentToUse
    });
    
    setIsPopoverOpen(false);
    setShowSuccessMsg(`已录入：${adoptedGrade} ${className}`);
    setTimeout(() => {
      setShowSuccessMsg('');
    }, 3000);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const targetWidth = 794 + 32;
        if (width < targetWidth) {
          setZoom(Math.max(0.5, (width - 16) / 794));
        } else {
          setZoom(1);
        }
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setShowSuccessMsg('已复制到剪贴板');
    setTimeout(() => setShowSuccessMsg(''), 2000);
  };

  const handlePrint = () => {
    console.log('[打印] 按钮被点击');
    window.print();
    console.log('[打印] window.print() 已返回');
  };

  const handleWord = async () => {
    const contentToExport = isEditing ? editedContent : displayContent;
    try {
      const blob = await exportMarkdownToWord(contentToExport, displayTitle || '体育教案');
      saveAs(blob, `${displayTitle || '体育教案'}.docx`);
    } catch (error) {
      console.error('Word 导出失败:', error);
      setShowSuccessMsg('导出失败，请重试');
      setTimeout(() => setShowSuccessMsg(''), 3000);
    }
  };

  const handlePdf = () => {
    window.print();
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedContent(displayContent);
      setIsEditing(true);
    } else {
      const store = useAppStore.getState();
      store.setCurrentPlanContent(editedContent);
      
      if (previewedHistoryPlan) {
        store.updateHistoryContent(previewedHistoryPlan.id, editedContent);
        const updatedPlan = { ...previewedHistoryPlan, content: editedContent, summary: editedContent.slice(0, 100).replace(/#/g, '') + '...' };
        const currentUser = sessionStorage.getItem('currentUser');
        if (currentUser) {
          const historyKey = `history_${currentUser}`;
          const historyStr = localStorage.getItem(historyKey);
          if (historyStr) {
            const history = JSON.parse(historyStr);
            const idx = history.findIndex((h: any) => h.id === previewedHistoryPlan.id);
            if (idx >= 0) {
              history[idx] = updatedPlan;
              localStorage.setItem(historyKey, JSON.stringify(history));
            }
          }
        }
        store.setPreviewedHistoryPlan(updatedPlan);
      } else {
        const generatedId = store.lastGeneratedPlanId;
        if (generatedId) {
          store.updateHistoryContent(generatedId, editedContent);
          const updatedPlan = { id: generatedId, content: editedContent, summary: editedContent.slice(0, 100).replace(/#/g, '') + '...' };
          const currentUser = sessionStorage.getItem('currentUser');
          if (currentUser) {
            const historyKey = `history_${currentUser}`;
            const historyStr = localStorage.getItem(historyKey);
            if (historyStr) {
              const history = JSON.parse(historyStr);
              const idx = history.findIndex((h: any) => h.id === generatedId);
              if (idx >= 0) {
                history[idx] = { ...history[idx], ...updatedPlan };
                localStorage.setItem(historyKey, JSON.stringify(history));
              }
            }
          }
        }
      }
      
      setIsEditing(false);
      setShowSuccessMsg('教案已保存（历史记录已同步更新）');
      setTimeout(() => setShowSuccessMsg(''), 2500);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className={`px-3 sm:px-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-primary-500 to-secondary-500 shrink-0 h-auto min-h-[48px] sm:h-[64px] py-2 sm:py-0 shadow-sm flex-wrap gap-y-1.5 ${(showMovement || showSchedule) ? 'hidden' : ''}`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="font-semibold text-white/90 flex items-center gap-2 truncate" style={{ fontSize: '13px' }}>
            {(!!displayContent || isGenerating || !!previewedHistoryPlan) && (
              <>
                <span className="hidden sm:inline">{previewedHistoryPlan ? '查看历史：' : '教案预览：'}</span>
                <span className="truncate">{displayTitle || '未命名教案'}</span>
                {displayGrades && displayGrades.length > 0 && <span className="font-normal px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-white/90 shrink-0 hidden sm:inline" style={{ fontSize: '13px' }}>{displayGrades.join(',')}</span>}
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 export-btn flex-shrink-0">
          {previewedHistoryPlan && (
            <Button variant="default" size="sm" onClick={() => setPreviewedHistoryPlan(null)} className="h-8 sm:h-auto py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[12px] bg-primary-600 hover:bg-primary-700 text-[#fff]" title="退出预览">
              退出预览
            </Button>
          )}
          {!!displayContent && !isGenerating && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 sm:h-auto py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[12px] border-slate-200 bg-white" title="复制">
                复制
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 sm:h-auto py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[12px] border-slate-200 bg-white hidden sm:inline-flex" title="打印/导出 PDF">
                <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                打印
              </Button>
              <Button variant="outline" size="sm" onClick={handlePdf} className="h-8 sm:h-auto py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[12px] border-slate-200 bg-white hidden sm:inline-flex" title="导出 PDF">
                <FileDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleWord} className="h-8 sm:h-auto py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-[12px] border-slate-200 bg-white hidden sm:inline-flex" title="导出 Word">
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                Word
              </Button>
              <Popover open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
                <PopoverTrigger render={
                  <Button variant="outline" size="sm" className="h-8 sm:hidden py-1 px-2 rounded-lg text-[11px] border-slate-200 bg-white" title="更多">
                    更多
                  </Button>
                } />
                <PopoverContent align="end" className="w-36 p-2 sm:hidden">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { handlePrint(); setMoreMenuOpen(false); }} className="justify-start text-[12px] h-8">打印/PDF</Button>
                    <Button variant="ghost" size="sm" onClick={() => { handlePdf(); setMoreMenuOpen(false); }} className="justify-start text-[12px] h-8">导出 PDF</Button>
                    <Button variant="ghost" size="sm" onClick={() => { handleWord(); setMoreMenuOpen(false); }} className="justify-start text-[12px] h-8">导出 Word</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>

      {showSchedule && (
        <div className="absolute inset-0 z-20 bg-white overflow-y-auto">
          <div className="px-4 py-6 sm:px-10 bg-slate-200/50 min-h-full">
            <div className="w-full space-y-4">
              <TimetableTable />
              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400" /> 五年级
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" /> 四年级
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-400" /> 三年级
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMovement && (
        <div className="absolute inset-0 z-20 bg-white overflow-y-auto">
          <div className="px-4 py-6 sm:px-10 bg-[#f8fafc] min-h-full">
            <div className="w-full">
              <MovementDecompositionTable />
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="absolute inset-0 z-20 bg-white overflow-y-auto">
          <HistoryPanelContent 
            history={history}
            onLoadPlan={(plan) => {
              setPreviewedHistoryPlan(plan);
              onToggleHistory?.();
            }}
            onDeletePlan={(id) => {
              removeHistory(id);
              deleteFromHistory(id);
            }}
          />
        </div>
      )}

      {showAdopted && (
        <div className="absolute inset-0 z-20 bg-white overflow-y-auto">
          <AdoptedPanelContent 
            adoptedPlans={adoptedPlans}
            onLoadPlan={(plan) => {
              setPreviewedHistoryPlan({
                id: plan.planId,
                title: plan.title,
                date: plan.dateAdopted,
                content: plan.content,
                tags: [plan.grade, plan.className],
                summary: '',
                grades: [plan.grade]
              });
              onToggleAdopted?.();
            }}
            onDeletePlan={(id) => removeAdoptedPlan(id)}
            onClearClass={(grade, className) => clearAdoptedPlansByClass(grade, className)}
          />
        </div>
      )}

      {isGenerating && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-md z-50 bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-primary-100 flex flex-col items-center">
           <div className="text-lg font-bold text-primary-700 mb-4 animate-pulse">AI 正在制作完美教案...</div>
           <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-300 ease-out" 
                style={{ width: `${generationProgress}%` }}
              />
           </div>
           <div className="mt-2 text-sm text-slate-500 font-medium w-full flex justify-between items-center">
             <span>{generationProgress}%</span>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => {
                 useAppStore.getState().setIsGenerating(false);
               }} 
               className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
             >
               停止生成
             </Button>
           </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-0 py-8 pb-24 relative bg-[#fdfeff] custom-scrollbar"
      >
        {(displayContent || isGenerating) ? (
          <div id="print-root" className={isGenerating && !displayContent ? 'opacity-30' : 'opacity-100'}>
            <LessonPlanViewer 
              content={displayContent} 
              title={displayTitle} 
              grades={displayGrades} 
              zoom={zoom} 
              editable={isEditing}
              onContentChange={(val) => setEditedContent(val)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-100 opacity-60">
            <Calendar className="w-16 h-16 mb-4 opacity-50" />
            <p>点击左侧"开始制作教案"或上方"智能课表"</p>
          </div>
        )}
      </div>

      {displayContent && !isGenerating && (
        <div className="absolute bottom-4 right-2 sm:bottom-8 sm:right-8 z-50 flex flex-col items-end gap-2 sm:gap-3">
          {showSuccessMsg && (
            <div className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full shadow-lg font-medium animate-in fade-in slide-in-from-right-4 mb-1 sm:mb-2">
              {showSuccessMsg}
            </div>
          )}
          {onGenerate && !previewedHistoryPlan && (
            <>
              <Button
                onClick={handleEditToggle}
                variant="outline"
                className={`shadow-lg sm:shadow-xl rounded-full px-3 sm:px-5 py-3 sm:py-5 gap-1.5 sm:gap-2 font-bold text-[12px] sm:text-[14px] transition-all hover:scale-105 active:scale-95 border-2 ${isEditing ? 'bg-primary-600 text-white border-primary-500 hover:bg-primary-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                {isEditing ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                {isEditing ? '完成编辑' : '编辑教案'}
              </Button>

              <Button
                onClick={() => setIsRegenConfirmOpen(true)}
                variant="outline"
                className="shadow-lg sm:shadow-xl rounded-full px-3 sm:px-5 py-3 sm:py-5 gap-1.5 sm:gap-2 bg-white text-slate-700 hover:bg-slate-50 font-bold text-[12px] sm:text-[14px] transition-transform hover:scale-105 active:scale-95 border border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                重新生成
              </Button>

              <Dialog open={isRegenConfirmOpen} onOpenChange={setIsRegenConfirmOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white border-slate-200 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-800">确认重新生成？</DialogTitle>
                    <DialogDescription className="text-slate-500 py-2">
                      当前生成的教案内容将被替换。系统将尝试采用不同的教学思路为您重新设计。
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
                    <Button
                      variant="outline"
                      className="rounded-xl border-slate-200 text-slate-600 flex-1 sm:flex-none"
                      onClick={() => setIsRegenConfirmOpen(false)}
                    >
                      取消
                    </Button>
                    <Button
                      className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex-1 sm:flex-none shadow-lg shadow-primary-100"
                      onClick={() => {
                        setIsRegenConfirmOpen(false);
                        onGenerate(true);
                      }}
                    >
                      确认生成
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger render={
              <Button className="shadow-xl sm:shadow-2xl rounded-full px-3 sm:px-5 py-4 sm:py-6 gap-1.5 sm:gap-2 bg-gradient-to-r from-secondary-500 to-primary-600 hover:from-secondary-600 hover:to-primary-700 text-white font-bold text-[13px] sm:text-[15px] transition-transform hover:scale-105 active:scale-95 border border-white/20">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                采用此教案
              </Button>
            } />
            <PopoverContent side="top" align="end" className="w-64 p-4 shadow-2xl border-slate-100 rounded-xl" sideOffset={10}>
              <div className="font-bold text-slate-800 mb-3 text-center">选择班级 (同步至记录)</div>
              <div className="grid grid-cols-3 gap-2">
                {['1班', '2班', '3班', '4班', '5班', '6班'].map((cls) => (
                  <Button
                    key={cls}
                    variant="outline"
                    className="w-full text-slate-700 border-slate-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors"
                    onClick={() => handleAdoptPlan(cls)}
                  >
                    {cls}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

function HistoryPanelContent({ 
  history, 
  onLoadPlan, 
  onDeletePlan 
}: { 
  history: LessonPlan[]; 
  onLoadPlan: (plan: LessonPlan) => void; 
  onDeletePlan: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const groupedHistory = useMemo(() => {
    const groups: Record<string, LessonPlan[]> = {};
    const ALL_GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '其他'];
    ALL_GRADES.forEach(g => groups[g] = []);
    
    const filtered = searchTerm 
      ? history.filter(p => p.title?.includes(searchTerm) || p.content?.includes(searchTerm))
      : history;
    
    filtered.forEach(plan => {
      if (!plan.grades || plan.grades.length === 0) {
        groups['其他'].push(plan);
      } else {
        plan.grades.forEach(g => {
          if (!groups[g]) groups[g] = [];
          groups[g].push(plan);
        });
      }
    });

    const result: Record<string, LessonPlan[]> = {};
    ALL_GRADES.forEach(g => {
      if (groups[g] && groups[g].length > 0) result[g] = groups[g];
    });
    Object.keys(groups).forEach(g => {
      if (!ALL_GRADES.includes(g) && groups[g].length > 0) result[g] = groups[g];
    });
    return result;
  }, [history, searchTerm]);

  const exportData = () => {
    const username = sessionStorage.getItem('currentUser') || 'anonymous';
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sports_lesson_plans_${username}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as LessonPlan[];
        if (Array.isArray(parsed)) {
          const existingIds = new Set(history.map(p => p.id));
          let importedCount = 0;
          for (const plan of parsed) {
            if (plan.id && plan.title && plan.content && !existingIds.has(plan.id)) {
              useAppStore.getState().addHistory(plan);
              await saveToHistory(plan);
              importedCount++;
            }
          }
          alert(`成功导入了 ${importedCount} 篇新教案！`);
        }
      } catch (error) {
        alert('文件格式错误或并非教案备份文件！');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-full bg-white">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-6 h-6 text-white" />
            <h2 className="text-xl font-black text-white">我的教案库</h2>
            <span className="bg-white/20 text-white text-sm px-3 py-0.5 rounded-full font-medium">{history.length}篇</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索教案..."
                className="w-48 bg-white/10 border border-white/20 rounded-lg py-2 pl-9 pr-3 text-white placeholder:text-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Upload className="w-4 h-4 mr-1" />导入
            </Button>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={importData} />
            <Button variant="outline" size="sm" onClick={exportData} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Download className="w-4 h-4 mr-1" />备份导出
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-slate-400 gap-3">
            <Folder className="w-16 h-16 opacity-30" />
            <p className="text-lg">记录库空空如也，快去生成你的第一篇教案吧！</p>
          </div>
        ) : (
          <Accordion defaultValue={Object.keys(groupedHistory)} className="w-full space-y-3">
            {Object.entries(groupedHistory).map(([grade, plans]) => (
              <AccordionItem key={grade} value={grade} className="border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden">
                <AccordionTrigger className="hover:no-underline px-4 py-3 data-[state=open]:border-b border-slate-200/60">
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-700">
                    <Folder className="w-5 h-5 text-amber-500 fill-amber-100" />
                    <span>{grade}</span>
                    <span className="bg-white text-amber-600 text-[12px] px-2 py-0.5 rounded-full border border-amber-100 font-medium ml-1">
                      {plans.length} 篇
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-white space-y-3">
                  {plans.map((plan) => (
                    <div key={plan.id} className="border border-slate-100 rounded-lg p-4 hover:shadow-md transition-shadow bg-card relative group">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <h4 className="font-medium text-[15px] text-slate-900 cursor-pointer hover:text-amber-600 leading-snug flex-1" onClick={() => onLoadPlan(plan)}>
                          {plan.title || '无标题教案'}
                        </h4>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" 
                          onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id); }}
                          title="删除记录"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5"/>
                          {(() => {
                            const d = new Date(plan.date);
                            return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                          })()}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-600 line-clamp-2 leading-relaxed">
                        {plan.summary && plan.summary.trim() !== '' ? plan.summary : plan.content.substring(0, 100).replace(/[#*`]/g, '') + '...'}
                      </p>
                      <div className="mt-3.5 flex justify-end">
                        <Button variant="outline" size="sm" className="h-auto py-1.5 px-3 text-[12px] border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200" onClick={() => onLoadPlan(plan)}>
                          载入预览
                        </Button>
                      </div>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}

const ADOPTED_GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
const ADOPTED_CLASSES = ['1班', '2班', '3班'];

function AdoptedPanelContent({ 
  adoptedPlans, 
  onLoadPlan, 
  onDeletePlan, 
  onClearClass 
}: { 
  adoptedPlans: AdoptedPlan[]; 
  onLoadPlan: (plan: AdoptedPlan) => void; 
  onDeletePlan: (id: string) => void;
  onClearClass: (grade: string, className: string) => void;
}) {
  return (
    <div className="min-h-full bg-white">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-secondary-500 to-purple-500 px-6 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <BookmarkCheck className="w-6 h-6 text-white" />
          <h2 className="text-xl font-black text-white">已上教案记录</h2>
          <span className="bg-white/20 text-white text-sm px-3 py-0.5 rounded-full font-medium">{adoptedPlans.length}篇</span>
        </div>
      </div>

      <div className="p-6">
        {adoptedPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-slate-400 gap-3">
            <BookmarkCheck className="w-16 h-16 opacity-30" />
            <p className="text-lg">暂无已上教案记录</p>
          </div>
        ) : (
          <Accordion defaultValue={ADOPTED_GRADES} className="w-full space-y-3">
            {ADOPTED_GRADES.map((grade) => {
              const plansForGrade = adoptedPlans.filter(p => p.grade === grade);
              if (plansForGrade.length === 0) return null;
              return (
                <AccordionItem value={grade} key={grade} className="border border-slate-100 bg-slate-50/50 rounded-xl overflow-hidden">
                  <AccordionTrigger className="hover:no-underline px-4 py-3 data-[state=open]:border-b border-slate-200/60">
                    <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-700">
                      <Folder className="w-5 h-5 text-secondary-500 fill-secondary-100" />
                      <span>{grade}</span>
                      <span className="bg-white text-secondary-600 text-[12px] px-2 py-0.5 rounded-full border border-secondary-100 font-medium ml-1">
                        {plansForGrade.length} 篇
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 bg-white space-y-3">
                    {ADOPTED_CLASSES.map((className) => {
                      const plansForClass = plansForGrade.filter(p => p.className === className);
                      if (plansForClass.length === 0) return null;
                      return (
                        <div key={className} className="border border-slate-100 rounded-lg p-4 hover:shadow-md transition-shadow bg-card relative group">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-[14px] text-slate-900 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-secondary-100 flex items-center justify-center text-xs text-secondary-600 font-bold">
                                {className.replace('班', '')}
                              </span>
                              {className}
                              <span className="text-[11px] text-slate-400 font-normal ml-1">({plansForClass.length}篇)</span>
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[11px] h-7 text-slate-400 hover:text-red-500"
                              onClick={() => onClearClass(grade, className)}
                            >
                              清空
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {plansForClass.map((plan) => (
                              <div key={plan.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group/item" onClick={() => onLoadPlan(plan)}>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] font-medium text-slate-700 truncate">{plan.title}</div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {new Date(plan.dateAdopted).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} 采用
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 shrink-0 ml-2"
                                  onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
