import { useAppStore } from '../../store/appStore';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from 'motion/react';
import { Play, Dices, Layers, Tag, Loader2, Sliders, Sun, CloudRain, ChevronDown, ChevronUp, BookmarkCheck, History } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAIProvider } from '../../hooks/useAIProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { getGradesByLevel } from '../../constants/education';

const ABILITY_LEVELS = [
  { id: '基础班', icon: '🔵', desc: '强调基础动作规范，降低难度' },
  { id: '普通班', icon: '🟡', desc: '按照大纲常规要求进行教学' },
  { id: '提高班', icon: '🔴', desc: '增加拓展性练习与体能挑战' }
];

const accordionItemClassName =
  'overflow-hidden rounded-[28px] border border-white/14 bg-white/12 shadow-[0_10px_28px_rgba(4,44,85,0.18)] backdrop-blur-md transition-all duration-300 hover:border-white/24 hover:bg-white/15 data-[state=open]:bg-white/16 data-[state=open]:shadow-[0_14px_34px_rgba(4,44,85,0.2)] data-[state=open]:hover:border-white/30';

const accordionTriggerClassName =
  'rounded-[28px] border border-transparent bg-transparent px-4 py-3.5 text-left text-white hover:no-underline hover:bg-white/8 data-[state=open]:rounded-b-[22px] data-[state=open]:border-white/0 data-[state=open]:bg-white/10';

const accordionPanelClassName =
  'px-4 pb-4 pt-2 space-y-4 rounded-[24px] border-t border-white/14 bg-white/94 text-slate-900';

const panelActionCardBaseClassName =
  'group flex w-full items-center justify-between gap-3 rounded-[26px] border px-4 py-4 text-left shadow-[0_12px_28px_rgba(4,44,85,0.18)] backdrop-blur-md transition-all duration-300';

const panelActionCardIconBaseClassName =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-300';

type ConfigPanelProps = {
  onGenerate: (isRegeneration?: boolean) => void;
  showAdopted?: boolean;
  showHistory?: boolean;
  onToggleAdopted?: () => void;
  onToggleHistory?: () => void;
};

export function ConfigPanel({
  onGenerate,
  showAdopted = false,
  showHistory = false,
  onToggleAdopted,
  onToggleHistory,
}: ConfigPanelProps) {
  const { form, setForm, isGenerating, history, currentPlanContent, educationLevel } = useAppStore();
  const gradeOptions = getGradesByLevel(educationLevel);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [isGeneratingFocus, setIsGeneratingFocus] = useState(false);
  const [resourceExpanded, setResourceExpanded] = useState(false);
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  
  const { generate } = useAIProvider();

  const handleStartProcess = () => {
    const hasDuplicate = history.some(plan => 
      plan.title === form.courseName && 
      plan.grades.length === form.grades.length && 
      plan.grades.every(g => form.grades.includes(g))
    );

    if (hasDuplicate) {
      setShowDuplicateWarning(true);
    } else {
      handleStartPreview();
    }
  };

  const handleDuplicateConfirm = () => {
    setShowDuplicateWarning(false);
    handleStartPreview();
  };

  const handleStartPreview = () => {
    setShowPreviewModal(true);
    setCountdown(4);
  };

  useEffect(() => {
    if (showPreviewModal) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            setShowPreviewModal(false);
            onGenerate();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showPreviewModal, onGenerate]);

  useEffect(() => {
    if (showAdopted || showHistory) {
      setResourceExpanded(true);
    }
  }, [showAdopted, showHistory]);

  const handleCancel = () => {
    setShowPreviewModal(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const handleConfirm = () => {
    setShowPreviewModal(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    onGenerate();
  };

  const handleRandom = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsGeneratingTopic(true);
      const systemPrompt = "你是一个体育网课教师助手。请随机推荐一个合适中小学体育课的单节课课题名称，只需输出课题名称本身（不要带任何标点、废话，比如'前滚翻'，'篮球运球'）。";
      const topic = await generate(systemPrompt, "请给我一个随体的体育课课题");
      setForm({ courseName: topic.trim() });
    } catch(err) {
      console.error('API Random Topic error', err);
      // fallback
      const randomTopics = ['前滚翻', '立定跳远', '篮球行进间运球', '50米快速跑', '花样跳绳', '足球脚内侧传接球'];
      setForm({ courseName: randomTopics[Math.floor(Math.random() * randomTopics.length)] });
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const handleRandomFocus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsGeneratingFocus(true);
      const systemPrompt = "你是一个优秀的体育老师。请根据给出的课题名称（如果没有提供，则随机想一个体育课题），给出该课题的一句话“教学重点”和一句话“教学难点”。\n输出格式必须严格如下（直接输出，不要多余解释）：\n重点：xxx\n难点：yyy";
      const userPrompt = form.courseName ? `课题是：${form.courseName}` : "请随机选择一个课题并给出重难点";
      const focus = await generate(systemPrompt, userPrompt);
      setForm({ teachingFocus: focus.trim() });
    } catch(err) {
      console.error('API Random Focus error', err);
      // fallback
      const defaultFocus = [
        '重点：动作规范。\n难点：协调发力。',
        '重点：掌握基本动作要领。\n难点：动作的连贯性和流畅性。',
        '重点：正确认知发力点。\n难点：身体各部位和谐配合。'
      ];
      setForm({ teachingFocus: defaultFocus[Math.floor(Math.random() * defaultFocus.length)] });
    } finally {
      setIsGeneratingFocus(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full bg-gradient-to-b from-[#0b82ad] via-[#1478c4] to-[#1d63d8] p-3 sm:p-5 rounded-3xl shadow-[0_18px_46px_rgba(6,42,84,0.22)] border border-white/12">
      <TooltipProvider>
        <Accordion {...({ type: "single", defaultValue: "basic-info" } as any)} className="w-full space-y-3.5">
          
          {/* Section 1: 年级与基础信息 */}
          <AccordionItem value="basic-info" className={accordionItemClassName}>
            <AccordionTrigger className={accordionTriggerClassName}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/18 bg-white/13 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-300 group-hover/accordion-trigger:scale-105 group-hover/accordion-trigger:bg-white/18 group-aria-expanded/accordion-trigger:border-white/28 group-aria-expanded/accordion-trigger:bg-white/18">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[16px] font-bold text-white sm:text-[17px]">
                    <span>年级与基础设置</span>
                    <span className="text-[12px] text-emerald-200">*</span>
                  </div>
                  <div className="text-[12px] text-white/72">设置年级、能力、课题与基础课堂信息</div>
                </div>
              </div>
            </AccordionTrigger>
             <AccordionContent className={accordionPanelClassName}>
               
               <div className="space-y-2 mt-2">
                 <Label className="text-[14px] font-bold text-slate-500">年级选择 <span className="text-red-500">*</span></Label>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 text-[13px] sm:text-[14px]">
                   {gradeOptions.map((g) => (
                     <Toggle 
                       key={g}
                       pressed={form.grades.includes(g)}
                       onPressedChange={(pressed) => { if (pressed) setForm({ grades: [g] }) }}
                       variant="outline"
                       className={`px-2 py-2 h-auto rounded-lg transition-all duration-300 ${
                         form.grades.includes(g) 
                           ? '!bg-[#1d5398] !text-[#fff] scale-[1.08] border-[#1d5398] font-bold shadow-lg ring-2 ring-primary-500/50 ring-offset-1 data-[state=on]:!bg-[#1d5398] data-[state=on]:!text-[#fff]' 
                           : 'text-[14px] border-slate-200 text-slate-600 hover:bg-slate-50'
                       }`}
                     >
                       {g}
                     </Toggle>
                   ))}
                 </div>
               </div>

               <div className="space-y-2">
                 <Label className="text-[14px] font-bold text-slate-500">学生能力水平 <span className="text-red-500">*</span></Label>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                   {ABILITY_LEVELS.map((level) => (
                      <Tooltip key={level.id}>
                       <TooltipTrigger
                         render={
                           <Toggle 
                             pressed={form.ability === level.id}
                             onPressedChange={(pressed) => { if (pressed) setForm({ ability: level.id }) }}
                             variant="outline"
                             className={`w-full px-2 py-2 h-auto flex items-center justify-center gap-1 rounded-lg transition-all duration-300 ${
                               form.ability === level.id
                                 ? '!bg-[#1c428d] !text-[#fff] scale-[1.05] border-[#1c428d] font-bold shadow-lg ring-2 ring-primary-500/50 ring-offset-1 data-[state=on]:!bg-[#1c428d] data-[state=on]:!text-[#fff]'
                                 : 'text-[14px] border-slate-200 text-slate-600 hover:bg-slate-50'
                             }`}
                           >
                             <span className="mr-0.5">{level.icon}</span> {level.id}
                           </Toggle>
                         }
                       />
                       <TooltipContent>
                         <p className="text-[13px]">{level.desc}</p>
                       </TooltipContent>
                     </Tooltip>
                   ))}
                 </div>
               </div>

               <div className="border-t border-slate-100 pt-4"></div>

               <div className="space-y-1.5">
                 <div className="flex justify-between items-center mb-1">
                   <Label className="text-[13px] text-slate-500">课程名称 (课题) <span className="text-red-500">*</span></Label>
                   <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[12px] text-slate-500 hover:text-primary-600" onClick={handleRandom} disabled={isGeneratingTopic}>
                     {isGeneratingTopic ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Dices className="w-4 h-4 mr-1" />}
                     随机推荐
                   </Button>
                 </div>
                 <Input 
                   className="h-auto px-3 py-2.5 text-[14px] rounded-lg border-slate-200 focus:border-primary-600"
                   placeholder="如：前滚翻、跳绳" 
                   value={form.courseName || ''}
                   onChange={e => setForm({ courseName: e.target.value })}
                 />
               </div>

               <div className="flex gap-3">
                 <div className="space-y-1.5 flex-1">
                   <Label className="text-[13px] text-slate-500 block mb-1">课时时长</Label>
                   <Select value={form.duration || '40分钟'} onValueChange={v => setForm({duration: v})}>
                     <SelectTrigger className="h-auto px-3 py-2.5 text-[14px] rounded-lg border-slate-200 focus:border-primary-600">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="35分钟">35分钟</SelectItem>
                       <SelectItem value="40分钟">40分钟 (推荐)</SelectItem>
                       <SelectItem value="45分钟">45分钟</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-1.5 w-28">
                   <Label className="text-[13px] text-slate-500 block mb-1">班级人数</Label>
                   <Input type="number" min={10} max={80} value={form.studentCount || 40} onChange={e => setForm({studentCount: parseInt(e.target.value)||40})} className="h-auto px-3 py-2.5 text-[14px] rounded-lg border-slate-200 focus:border-primary-600" />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                   <Label className="text-[13px] text-slate-500 block mb-1">教学场地</Label>
                   <Input 
                     className="h-auto px-3 py-2.5 text-[14px] rounded-lg border-slate-200 focus:border-primary-600"
                     placeholder="如：操场,体育馆"
                     value={form.venue || ''}
                     onChange={e => setForm({ venue: e.target.value })}
                   />
                 </div>
                 <div className="space-y-1.5">
                   <Label className="text-[13px] text-slate-500 block mb-1">教具器材</Label>
                   <Input 
                     className="h-auto px-3 py-2.5 text-[14px] rounded-lg border-slate-200 focus:border-primary-600"
                     placeholder="如：足球,跳绳"
                     value={(form.equipments || []).join(',')}
                     onChange={e => setForm({ equipments: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })}
                   />
                 </div>
               </div>

             </AccordionContent>
           </AccordionItem>

          {/* Section 3: 风格与目标 */}
          <AccordionItem value="teaching-style" className={accordionItemClassName}>
            <AccordionTrigger className={accordionTriggerClassName}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/18 bg-white/13 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-300 group-hover/accordion-trigger:scale-105 group-hover/accordion-trigger:bg-white/18 group-aria-expanded/accordion-trigger:border-white/28 group-aria-expanded/accordion-trigger:bg-white/18">
                  <Tag className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[16px] font-bold text-white sm:text-[17px]">教案风格与目标</div>
                  <div className="text-[12px] text-white/72">控制课型、重难点和教学导向</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className={accordionPanelClassName}>
              
              <div className="space-y-1.5 mt-2">
                <Label className="text-[15px] text-slate-500 block mb-1">课型</Label>
                <Select value={form.courseType || ''} onValueChange={v => setForm({courseType: v})}>
                  <SelectTrigger className="font-bold h-auto px-3 py-2.5 text-[14px] rounded-lg border-slate-200 focus:border-primary-600">
                    <SelectValue placeholder="选择课型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="新授课">新授课</SelectItem>
                    <SelectItem value="复习课">复习课</SelectItem>
                    <SelectItem value="考核课">考核课</SelectItem>
                    <SelectItem value="游戏活动课">游戏活动课</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-[15px] text-slate-500">教学重点与难点</Label>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[14px] text-slate-500 hover:text-primary-600" onClick={handleRandomFocus} disabled={isGeneratingFocus}>
                    {isGeneratingFocus ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Dices className="w-4 h-4 mr-1" />}
                    随机推荐
                  </Button>
                </div>
                <Textarea 
                  placeholder="选填，例如：重点发力，难点协调。" 
                  value={form.teachingFocus || ''}
                  onChange={e => setForm({teachingFocus: e.target.value})}
                  className="h-[114px] resize-none text-[14px] px-3 py-2.5 rounded-lg border-slate-200 focus:border-primary-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="cursor-pointer text-[13px] font-normal" htmlFor="skill-switch">含技能训练</Label>
                <Switch id="skill-switch" checked={form.hasSkillTraining ?? true} onCheckedChange={v => setForm({hasSkillTraining: v})} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="cursor-pointer text-[13px] font-normal" htmlFor="match-switch">含比赛环节</Label>
                <Switch id="match-switch" checked={form.hasMatch ?? false} onCheckedChange={v => setForm({hasMatch: v})} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="cursor-pointer text-[13px] font-normal" htmlFor="fitness-switch">含体能训练</Label>
                <Switch id="fitness-switch" checked={form.hasFitness ?? true} onCheckedChange={v => setForm({hasFitness: v})} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="cursor-pointer text-[13px] font-normal" htmlFor="game-switch">含游戏环节</Label>
                <Switch id="game-switch" checked={form.hasGame ?? true} onCheckedChange={v => setForm({hasGame: v})} />
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <Label className="text-[13px] text-slate-500 block mb-1">情感目标</Label>
                <Select value={form.emotionTarget || ''} onValueChange={v => setForm({emotionTarget: v})}>
                  <SelectTrigger className="h-auto px-3 py-2.5 text-[14px] rounded-lg border-slate-200 focus:border-primary-600">
                    <SelectValue placeholder="选择导向" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="团队合作与互助">团队合作与互助</SelectItem>
                    <SelectItem value="坚韧意志与拼搏">坚韧意志与拼搏</SelectItem>
                    <SelectItem value="规则意识与公平">规则意识与公平</SelectItem>
                    <SelectItem value="健康习惯与终身体育">健康习惯与终身体育</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </AccordionContent>
          </AccordionItem>

          {/* Section 4: 专业教案细节定制 */}
          <AccordionItem value="professional-details" className={accordionItemClassName}>
            <AccordionTrigger className={accordionTriggerClassName}>
              <div className="flex min-w-0 w-full items-center gap-3 pr-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/18 bg-white/13 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-300 group-hover/accordion-trigger:scale-105 group-hover/accordion-trigger:bg-white/18 group-aria-expanded/accordion-trigger:border-white/28 group-aria-expanded/accordion-trigger:bg-white/18">
                  <Sliders className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-bold text-white sm:text-[17px]">专业教案细节定制</div>
                  <div className="text-[12px] text-white/72">按需开启课时、天气和板块定制</div>
                </div>
                <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="ml-auto">
                  <Switch 
                    className="scale-90 data-[state=checked]:bg-[#35c84a]"
                    checked={form.customDetailsEnabled ?? false} 
                    onCheckedChange={v => setForm({customDetailsEnabled: v})} 
                  />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className={accordionPanelClassName}>
              <div className={`space-y-3 transition-opacity duration-300 ${!form.customDetailsEnabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <Label className="text-[14px] font-bold text-slate-700 block">上课天气情况</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={form.weather === '高温' ? 'default' : 'outline'} 
                    size="sm" 
                    className={`h-auto py-2 transition-all ${form.weather === '高温' ? 'bg-orange-500 hover:bg-orange-600 border-orange-500 text-white shadow-md' : 'text-slate-600 bg-slate-50'}`}
                    onClick={() => setForm({ weather: form.weather === '高温' ? '晴天' : '高温' })}
                  >
                    <div className="flex items-center gap-1.5">
                       <Sun className="w-4 h-4 text-amber-200" />
                       高温
                    </div>
                  </Button>
                  <Button 
                    variant={form.weather === '雨天' ? 'default' : 'outline'} 
                    size="sm" 
                    className={`h-auto py-2 transition-all ${form.weather === '雨天' ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white border-[#3b82f6] shadow-md' : 'text-slate-600 bg-slate-50'}`}
                    onClick={() => setForm({ weather: form.weather === '雨天' ? '晴天' : '雨天' })}
                  >
                    <CloudRain className="w-4 h-4 mr-1.5" /> 雨天
                  </Button>
                </div>
              </div>
              
              {form.customDetailsEnabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-slate-500 block mb-1">第几课时</Label>
                    <Input 
                      placeholder="例：第一课时、第2课时" 
                      className="h-auto px-3 py-2 text-[14px] rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all"
                      value={form.classPeriod || ''}
                      onChange={e => setForm({classPeriod: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-slate-500 block mb-1">反思</Label>
                    <Textarea 
                      placeholder="请输入上课后的反思，或预期的教学反思..." 
                      className="min-h-[80px] text-[13px] rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all resize-y"
                      value={form.reflection || ''}
                      onChange={e => setForm({reflection: e.target.value})}
                    />
                  </div>

                  <div className="space-y-4 pt-3 border-t border-slate-100">
                    <Label className="text-[14px] font-bold text-slate-700 block mb-2">教案板块定制</Label>
                    
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer text-[13px] text-slate-600 font-normal" htmlFor="include-equipment-switch">场地与器材</Label>
                      <Switch id="include-equipment-switch" checked={form.includeEquipment ?? true} onCheckedChange={v => setForm({includeEquipment: v})} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer text-[13px] text-slate-600 font-normal" htmlFor="include-teacher-activity-switch">教学过程中的教师活动</Label>
                      <Switch id="include-teacher-activity-switch" checked={form.includeTeacherActivity ?? true} onCheckedChange={v => setForm({includeTeacherActivity: v})} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer text-[13px] text-slate-600 font-normal" htmlFor="include-reflection-switch">课后反思板块</Label>
                      <Switch id="include-reflection-switch" checked={form.includeReflection ?? true} onCheckedChange={v => setForm({includeReflection: v})} />
                    </div>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </TooltipProvider>

      {!currentPlanContent && (
        <div className="mt-2 shrink-0">
          <Button 
             size="lg" 
             className={`${panelActionCardBaseClassName} h-auto border-emerald-200/35 bg-linear-to-r from-[#35c84a]/95 via-[#2fbd44]/95 to-[#239c35]/95 text-white hover:-translate-y-0.5 hover:border-emerald-100/60 hover:shadow-[0_18px_42px_rgba(35,156,53,0.28)] disabled:translate-y-0 disabled:border-emerald-200/35 disabled:bg-linear-to-r disabled:from-[#35c84a]/95 disabled:via-[#2fbd44]/95 disabled:to-[#239c35]/95 disabled:text-white disabled:opacity-100`}
             onClick={handleStartProcess}
             disabled={isGenerating || form.grades.length === 0 || !form.courseName}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`${panelActionCardIconBaseClassName} border-white/22 bg-white/18 text-white group-hover:scale-105 group-hover:bg-white/24`}>
                <Play className="h-5 w-5 fill-current transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="min-w-0">
                <div className="text-[17px] font-extrabold tracking-[0.01em] sm:text-[18px]">
                  {isGenerating ? (
                    <div className="flex items-center gap-[1px]">
                      {"正在制作教案...".split('').map((char, i) => (
                        <motion.span
                          key={i}
                          initial={{ scale: 1 }}
                          animate={{ scale: [1, 1.18, 1] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.08,
                            ease: "easeInOut"
                          }}
                          className="inline-block"
                        >
                          {char}
                        </motion.span>
                      ))}
                    </div>
                  ) : (
                    '开始制作教案'
                  )}
                </div>
                <div className="text-[12px] text-white/82">生成新的体育教案，并进入预览确认流程</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-white/88">
              {!isGenerating && <span className="hidden text-[12px] font-semibold sm:inline">立即开始</span>}
              <ChevronDown className="h-4 w-4 -rotate-90 transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>
          </Button>
        </div>
      )}

      <div className="shrink-0 overflow-hidden rounded-[26px] border border-white/16 bg-white/12 shadow-[0_12px_28px_rgba(4,44,85,0.16)] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setResourceExpanded((prev) => !prev)}
          className={`${panelActionCardBaseClassName} rounded-none border-0 bg-transparent px-4 py-4 text-white shadow-none hover:bg-white/8`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className={`${panelActionCardIconBaseClassName} border-white/18 bg-white/13 text-white group-hover:scale-105 group-hover:bg-white/18`}>
              <History className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[16px] font-bold text-white">教案资源</div>
              <div className="text-[12px] text-white/75">展开查看已上教案和教案库</div>
            </div>
          </div>
          {resourceExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-white/85" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-white/85" />
          )}
        </button>

        {resourceExpanded && (
          <div className="border-t border-white/14 px-3 pb-3 pt-3">
            <div className="grid grid-cols-1 gap-2 rounded-[22px] bg-white/8 p-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onToggleAdopted}
                className={`h-auto justify-start rounded-2xl border px-3 py-3 text-left transition-all hover:bg-white/15 ${
                  showAdopted
                    ? 'border-white/40 bg-white/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/85'
                }`}
              >
                <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <BookmarkCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">已上教案</div>
                  <div className="text-[12px] text-current/75">打开当前已上教案界面</div>
                </div>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={onToggleHistory}
                className={`h-auto justify-start rounded-2xl border px-3 py-3 text-left transition-all hover:bg-white/15 ${
                  showHistory
                    ? 'border-white/40 bg-white/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/85'
                }`}
              >
                <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <History className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">教案库</div>
                  <div className="text-[12px] text-current/75">打开当前教案库界面</div>
                </div>
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showPreviewModal} onOpenChange={(open) => {
        if (!open) handleCancel();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">教案配置预览</DialogTitle>
            <DialogDescription>
              请核对您的教案配置信息，<span className="font-bold text-primary-600 text-base">{countdown}秒</span> 后将自动开始生成教案。
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-lg text-[14px] space-y-2.5 border border-slate-100 text-slate-700">
            <p><span className="font-semibold text-slate-900">课题：</span> {form.courseName || '未指定'}</p>
            <p><span className="font-semibold text-slate-900">教学场地：</span> {form.venue || '未指定'}</p>
            <p><span className="font-semibold text-slate-900">适用年级：</span> {form.grades.join('、') || '未指定'}</p>
            <p><span className="font-semibold text-slate-900">学生水平：</span> {form.ability || '普通班'}</p>
            <p><span className="font-semibold text-slate-900">课型：</span> {form.courseType || '新授课'} ({form.duration})</p>
            <p><span className="font-semibold text-slate-900">包含内容：</span> 
              {[
                form.hasSkillTraining ? '技能训练' : '', 
                form.hasMatch ? '比赛环节' : '', 
                form.hasFitness ? '体能训练' : '', 
                form.hasGame ? '游戏环节' : ''
              ].filter(Boolean).join('、') || '无特定设置'}
            </p>
            {form.customDetailsEnabled && (
              <>
                <div className="my-2 border-t border-slate-200"></div>
                <p><span className="font-semibold text-slate-900">启用定制细节</span></p>
                {form.classPeriod && <p><span className="font-semibold text-slate-900">课时：</span> {form.classPeriod}</p>}
                <p><span className="font-semibold text-slate-900">包含板块：</span> 
                  {[
                    form.includeEquipment ? '场地与器材' : '', 
                    form.includeTeacherActivity ? '教师活动列' : '', 
                    form.includeReflection ? '课后反思' : ''
                  ].filter(Boolean).join('、') || '无'}
                </p>
              </>
            )}
          </div>
          <DialogFooter className="sm:justify-between flex-row gap-2 mt-2">
            <Button variant="outline" className="w-1/2" onClick={handleCancel}>取消 ({countdown}s)</Button>
            <Button className="w-1/2 bg-primary-600 hover:bg-primary-700 text-white" onClick={handleConfirm}>立即生成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 教案重复警告 Modal */}
      <Dialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-rose-600">教案已存在</DialogTitle>
            <DialogDescription className="pt-2">
              系统检索到教案库中已经存在名称为 <span className="font-bold text-slate-800">“{form.courseName}”</span> 且年级相同的教案。
            </DialogDescription>
          </DialogHeader>
          <div className="bg-rose-50 p-3 rounded-lg text-[14px] border border-rose-100 text-rose-800 mb-2">
            继续生成将产生一份新的教案，内容可能会有所不同。请问是否确认继续生成同名教案？
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end mt-2">
            <Button variant="outline" onClick={() => setShowDuplicateWarning(false)}>取消并返回</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDuplicateConfirm}>确认二次生成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
