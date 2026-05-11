import React, { useState, useEffect, useRef } from 'react';
import { TIME_SLOTS } from '../../constants/timetable';
import { Clock, Zap, X, Info, Pencil, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, CourseEntry } from '../../store/appStore';

const GRADE_OPTIONS = ['一', '二', '三', '四', '五', '六'];
const CLASS_OPTIONS = ['1', '2', '3', '4', '5', '6'];

export function TimetableTable() {
  const { autoMist, setAutoMist, courseData, setCourseData, addCourseEntry, removeCourseEntry, isTimetableEditMode, setTimetableEditMode } = useAppStore();
  const days = ['周一', '周二', '周三', '周四', '周五'];
  const modalRef = useRef<HTMLDivElement>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [modalPos, setModalPos] = useState({ top: '50%', left: '50%' });
  const [currentTimeInfo, setCurrentTimeInfo] = useState<{ day: number, slotId: string | null, nextSlotId: string | null, timeStr: string }>({ 
    day: 0, 
    slotId: null, 
    nextSlotId: null,
    timeStr: '00:00' 
  });
  const [selectedCourse, setSelectedCourse] = useState<{ course: CourseEntry, slot: typeof TIME_SLOTS[0] } | null>(null);
  const [isEditingCourse, setIsEditingCourse] = useState(false);

  const isEditMode = isTimetableEditMode;
  const [editDay, setEditDay] = useState(1);
  const [editSlotId, setEditSlotId] = useState('');
  const [editGrade, setEditGrade] = useState('五');
  const [editClassName, setEditClassName] = useState('1');
  const [addingNew, setAddingNew] = useState(false);

  // Update modal position based on source button
  useEffect(() => {
    if (selectedCourse && sourceRect) {
      const headerHeight = 64;
      const margin = 20;
      const modalWidth = 384; 
      const modalHeight = 500;
      
      let left = sourceRect.right + 20;
      let top = sourceRect.top;

      if (left + modalWidth > window.innerWidth) {
        left = sourceRect.left - modalWidth - 20;
      }
      
      if (left < margin) {
        left = margin;
      }

      if (top < headerHeight + margin) {
        top = headerHeight + margin;
      }

      if (top + modalHeight > window.innerHeight) {
        top = window.innerHeight - modalHeight - margin;
      }

      setModalPos({ 
        top: `${top}px`, 
        left: `${left}px`
      });
    }
  }, [selectedCourse, sourceRect]);

  useEffect(() => {
    const updateCurrentSlot = () => {
      const now = new Date();
      const beijingTime = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);
      
      const day = beijingTime.getDay(); 
      const hour = beijingTime.getHours();
      const minute = beijingTime.getMinutes();
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      let currentSlotId: string | null = null;
      let nextSlotId: string | null = null;

      TIME_SLOTS.forEach(slot => {
        if (timeStr >= slot.startTime && timeStr <= slot.endTime) {
          currentSlotId = slot.id;
        }
      });

      // Find next slot for today
      const upcomingToday = TIME_SLOTS.filter(slot => slot.startTime > timeStr && slot.type !== 'break');
      if (upcomingToday.length > 0) {
        nextSlotId = upcomingToday[0].id;
      }

      setCurrentTimeInfo({ day, slotId: currentSlotId, nextSlotId, timeStr });
    };

    updateCurrentSlot();
    const timer = setInterval(updateCurrentSlot, 30000); // 30s update
    return () => clearInterval(timer);
  }, []);
  
  const getCourse = (dayIndex: number, slotId: string) => {
    return courseData.find(c => c.day === dayIndex + 1 && c.slotId === slotId);
  };

  const isPast = (dayIndex: number, slot: typeof TIME_SLOTS[0]) => {
    const courseDay = dayIndex + 1; // 1-5
    const currentDay = currentTimeInfo.day;
    
    // Past day
    if (currentDay > courseDay) return true;
    // Future day
    if (currentDay < courseDay) return false;
    // Today, check time
    return currentTimeInfo.timeStr > slot.endTime;
  };

  const handleEditCourse = (day: number, slotId: string, grade: string, className: string) => {
    setEditDay(day);
    setEditSlotId(slotId);
    setEditGrade(grade);
    setEditClassName(className);
    setIsEditingCourse(true);
    setSelectedCourse(null);
  };

  const handleDeleteCourse = (day: number, slotId: string) => {
    removeCourseEntry(day, slotId);
    setSelectedCourse(null);
  };

  const saveEdit = () => {
    // Remove old entry
    const updatedData = courseData.filter(e => !(e.day === editDay && e.slotId === editSlotId));
    // Add new entry
    updatedData.push({ day: editDay, slotId: editSlotId, grade: editGrade, className: editClassName });
    setCourseData(updatedData);
    setIsEditingCourse(false);
    setAddingNew(false);
  };

  const startAddCourse = (day: number, slotId: string) => {
    setEditDay(day);
    setEditSlotId(slotId);
    setEditGrade('五');
    setEditClassName('1');
    setAddingNew(true);
  };

  const handleSaveNew = () => {
    addCourseEntry({ day: editDay, slotId: editSlotId, grade: editGrade, className: editClassName });
    setAddingNew(false);
  };

  // Simple inline editor for when clicking on an empty cell
  const SimpleCourseEditor = () => {
    return (
      <div className="fixed inset-0 top-[64px] z-[100] pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl pointer-events-auto"
          onClick={() => { setIsEditingCourse(false); setAddingNew(false); }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-400 p-6 w-80 pointer-events-auto"
          >
            <div className="text-lg font-bold text-slate-800 mb-4">
              {addingNew ? '添加课程' : '编辑课程'}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500 block mb-1">星期</label>
                <select 
                  value={editDay}
                  onChange={e => setEditDay(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {days.map((d, i) => <option key={i} value={i+1}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">节次</label>
                <select 
                  value={editSlotId}
                  onChange={e => setEditSlotId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {TIME_SLOTS.filter(s => s.type !== 'break').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-slate-500 block mb-1">年级</label>
                  <select 
                    value={editGrade}
                    onChange={e => setEditGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}年级</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-slate-500 block mb-1">班级</label>
                  <select 
                    value={editClassName}
                    onChange={e => setEditClassName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}班</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => { setIsEditingCourse(false); setAddingNew(false); }}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={addingNew ? handleSaveNew : saveEdit}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  保存
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 relative">
      <AnimatePresence>
        {selectedCourse && !isEditingCourse && (
          <div className="fixed inset-0 top-[64px] z-[100] pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl pointer-events-auto"
              onClick={() => {
                setSelectedCourse(null);
                setSourceRect(null);
              }}
            />

            {sourceRect && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  position: 'fixed',
                  top: sourceRect.top,
                  left: sourceRect.left,
                  width: sourceRect.width,
                  height: sourceRect.height,
                  zIndex: 101,
                  pointerEvents: 'none'
                }}
                className={`
                  rounded-lg flex flex-col items-center justify-center shadow-lg ring-2
                  ${selectedCourse.course.grade === '一' ? 'bg-rose-50 ring-rose-200 text-rose-700' : 
                    selectedCourse.course.grade === '二' ? 'bg-orange-50 ring-orange-200 text-orange-700' : 
                    selectedCourse.course.grade === '三' ? 'bg-amber-50 ring-amber-200 text-amber-700' : 
                    selectedCourse.course.grade === '四' ? 'bg-emerald-50 ring-emerald-200 text-emerald-700' : 
                    selectedCourse.course.grade === '五' ? 'bg-blue-50 ring-blue-200 text-blue-700' : 
                    'bg-indigo-50 ring-indigo-200 text-indigo-700'}
                `}
              >
                <div className="text-[14px] font-black opacity-80 uppercase tracking-wide">
                  {selectedCourse.course.grade}年级({selectedCourse.course.className})
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-[17px] font-black uppercase tracking-tight">体育课</span>
                </div>
              </motion.div>
            )}

            <motion.div 
              ref={modalRef}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              style={{
                position: 'fixed',
                top: modalPos.top,
                left: modalPos.left,
                zIndex: 102
              }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border-2 border-primary-500 overflow-hidden pointer-events-auto"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="bg-primary-600 p-6 text-white relative">
                <button 
                  onClick={() => { setSelectedCourse(null); }}
                  className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 p-2.5 rounded-2xl">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-white">上课详情</h3>
                </div>
                <div className="text-primary-100 text-lg font-bold ml-14">
                  {days[selectedCourse.course.day - 1]} · {selectedCourse.slot.name}
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="flex items-start gap-5">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-lg ${
                    (() => {
                      switch(selectedCourse.course.grade) {
                        case '五': return 'bg-blue-600';
                        case '四': return 'bg-emerald-600';
                        case '三': return 'bg-orange-600';
                        default: return 'bg-purple-600';
                      }
                    })()
                  }`}>
                    {selectedCourse.course.grade}
                  </div>
                  <div>
                    <div className="text-[30px] font-black text-slate-900 leading-tight">{selectedCourse.course.grade}年级({selectedCourse.course.className})班</div>
                    <div className="text-slate-500 text-lg font-bold">体育教学课程</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                    <div className="text-slate-400 text-sm font-black uppercase mb-1">开始时间</div>
                    <div className="text-slate-900 text-2xl font-black">{selectedCourse.slot.startTime}</div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                    <div className="text-slate-400 text-sm font-black uppercase mb-1">结束时间</div>
                    <div className="text-slate-900 text-2xl font-black">{selectedCourse.slot.endTime}</div>
                  </div>
                </div>

                <div className="bg-primary-50 p-6 rounded-2xl flex items-center gap-4 text-primary-700 font-bold border-2 border-primary-100 shadow-sm">
                  <Info className="w-7 h-7 shrink-0 text-primary-500" />
                  <span className="text-lg leading-relaxed">请准时到场组织学生进行热身活动与器材准备。</span>
                </div>

                {/* Edit / Delete buttons */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleEditCourse(selectedCourse.course.day, selectedCourse.course.slotId, selectedCourse.course.grade, selectedCourse.course.className)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-4 h-4" /> 编辑
                  </button>
                  <button 
                    onClick={() => handleDeleteCourse(selectedCourse.course.day, selectedCourse.course.slotId)}
                    className="flex-1 py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> 删除
                  </button>
                </div>
              </div>

              <div className="px-8 pb-8">
                <button 
                  onClick={() => { setSelectedCourse(null); }}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-colors shadow-lg active:scale-95 duration-200"
                >
                  确定
                </button>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Editing modal */}
        {(isEditingCourse || addingNew) && <SimpleCourseEditor />}
      </AnimatePresence>

      {/* Edit mode hint */}
      {isEditMode && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="text-amber-600 font-medium">课表编辑模式已开启 - 点击空格添加课程，点击已有课程修改</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-400 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full min-w-[600px] border-collapse">
            <thead className="sticky top-0 z-10 shadow-md">
              <tr className="bg-gradient-to-r from-primary-500 to-secondary-500 border-b-2 border-white/20">
                <motion.th
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  className="py-2 sm:py-3 px-2 sm:px-3 text-center text-[13px] sm:text-[15px] font-black text-white border-r border-white/10 min-w-[80px] sm:min-w-[120px]"
                >
                  时间/节次
                </motion.th>
                {days.map((day, idx) => {
                  const isToday = currentTimeInfo.day === idx + 1;
                  return (
                    <motion.th
                    key={idx}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)', scale: 1.02 }}
                    className={`py-2 sm:py-3 px-2 sm:px-3 text-center text-[15px] sm:text-[18px] font-black border-r border-white/10 last:border-r-0 min-w-[90px] sm:min-w-[140px] transition-colors ${isToday ? 'bg-white/20 text-white' : 'text-white/90'}`}
                  >
                      <div className="flex flex-col items-center">
                        {day}
                        {isToday && <span className="text-[8px] sm:text-[9px] px-1 bg-white text-cyan-700 rounded mt-0.5 animate-pulse font-black">TODAY</span>}
                      </div>
                    </motion.th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => {
                const isBreak = slot.type === 'break';
                const isCurrentSlot = currentTimeInfo.slotId === slot.id;
                
                return (
                  <tr
                    key={slot.id}
                    className={`border-b-2 border-slate-200 transition-colors ${
                      isBreak ? 'bg-slate-100' : isCurrentSlot ? 'bg-primary-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <motion.td
                      whileHover={{
                        backgroundColor: isCurrentSlot ? 'rgb(239 246 255)' : 'rgb(248 250 252)',
                        scale: 1.1,
                        zIndex: 40,
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }}
                      className={`py-1 px-1 sm:px-2 border-r-2 border-slate-300 font-bold transition-all cursor-default relative ${isCurrentSlot ? 'bg-primary-50' : 'bg-white'}`}
                    >
                      <div className="flex flex-col items-center gap-1 sm:gap-1.5 group">
                        <span className={`text-[14px] sm:text-[17px] font-black leading-tight flex items-center gap-1 transition-all duration-300 group-hover:scale-110 ${isCurrentSlot ? 'text-primary-700' : isBreak ? 'text-slate-500' : 'text-slate-900'}`}>
                          {isCurrentSlot && <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-primary-600 border-none" />}
                          {slot.name}
                        </span>
                        <div className={`flex items-center gap-1 sm:gap-1.5 text-[13px] sm:text-[15px] px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg shadow-sm border font-black transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${isCurrentSlot ? 'bg-primary-600 text-white border-primary-500' : 'text-slate-800 bg-slate-100 border-slate-300'}`}>
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          {slot.startTime}
                        </div>
                      </div>
                    </motion.td>
                    
                    {isBreak ? (
                      <td colSpan={5} className="py-1.5 sm:py-2 px-2 sm:px-3 text-center bg-slate-50">
                        <span className="text-[13px] sm:text-[16px] font-black text-slate-500 tracking-[0.3em] sm:tracking-[0.5em] uppercase">
                          {slot.name}
                        </span>
                      </td>
                    ) : (
                      <>
                        {days.map((_, dIdx) => {
                          const course = getCourse(dIdx, slot.id);
                          const isToday = currentTimeInfo.day === dIdx + 1;
                          const isTargetCell = isToday && currentTimeInfo.slotId === slot.id;
                          const isNextCell = isToday && currentTimeInfo.nextSlotId === slot.id;
                          const slotHasPassed = isPast(dIdx, slot);
                          const shouldMist = autoMist && slotHasPassed && !isTargetCell && !isNextCell;

                          return (
                            <td key={dIdx} className={`py-0.5 px-1 border-r-2 border-slate-200 last:border-r-0 transition-all duration-300 ${isTargetCell ? 'bg-primary-50' : isNextCell ? 'bg-amber-50' : ''}`}>
                            {course ? (
                              <div className="relative group">
                                {isEditMode && (
                                  <button
                                    onClick={() => handleEditCourse(course.day, course.slotId, course.grade, course.className)}
                                    className="absolute -top-1 -right-1 z-20 w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                  >
                                    <Pencil className="w-3 h-3 text-slate-500" />
                                  </button>
                                )}
                                <motion.div 
                                  initial={shouldMist ? { filter: 'blur(2px) grayscale(1)', opacity: 0.4 } : { filter: 'blur(0px) grayscale(0)', opacity: 1 }}
                                  animate={shouldMist ? { filter: 'blur(2px) grayscale(1)', opacity: 0.4 } : { filter: 'blur(0px) grayscale(0)', opacity: 1 }}
                                  whileHover={{ 
                                    scale: 1.15, 
                                    zIndex: 30, 
                                    boxShadow: '0 25px 30px -5px rgb(0 0 0 / 0.2)',
                                    filter: 'blur(0px) grayscale(0)',
                                    opacity: 1
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    if (!isEditMode) {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setSourceRect(rect);
                                      setSelectedCourse({ course, slot });
                                    }
                                  }}
                                  className={`
                                    w-full py-4 px-2 rounded-xl flex flex-col items-center justify-center shadow-md ring-2 transition-all cursor-pointer
                                    ${isTargetCell ? 'scale-105 shadow-primary-200 z-10 border-2 border-white' : ''}
                                    ${isNextCell ? 'scale-110 ring-[5px] ring-amber-400 z-20 shadow-xl border-2 border-white' : ''}
                                    ${(() => {
                                    switch(course.grade) {
                                      case '五': return 'bg-blue-600 text-white ring-blue-400 hover:bg-blue-500';
                                      case '四': return 'bg-emerald-600 text-white ring-emerald-400 hover:bg-emerald-500';
                                      case '三': return 'bg-orange-600 text-white ring-orange-400 hover:bg-orange-500';
                                      case '二': return 'bg-amber-600 text-white ring-amber-400 hover:bg-amber-500';
                                      case '一': return 'bg-rose-600 text-white ring-rose-400 hover:bg-rose-500';
                                      default: return 'bg-purple-600 text-white ring-purple-400 hover:bg-purple-500';
                                    }
                                  })()}
                                `}>
                                  <span className={`${isNextCell ? 'text-[16px] sm:text-[22px]' : 'text-[14px] sm:text-[18px]'} font-black aria-hidden="true" tracking-wide`}>
                                    {course.grade}({course.className})
                                  </span>
                                  {isTargetCell && <span className="text-[11px] font-black mt-1 uppercase tracking-tighter bg-white/20 px-2 rounded">正在讲课</span>}
                                  {isNextCell && <span className="text-[12px] font-black mt-1.5 uppercase tracking-tighter bg-amber-200 text-amber-900 px-3 rounded-full animate-bounce">下一节课</span>}
                                </motion.div>
                              </div>
                            ) : (
                              <motion.div 
                                initial={shouldMist ? { filter: 'blur(2px)', opacity: 0.4 } : { filter: 'blur(0px)', opacity: 1 }}
                                animate={shouldMist ? { filter: 'blur(2px)', opacity: 0.4 } : { filter: 'blur(0px)', opacity: 1 }}
                                whileHover={{ 
                                  backgroundColor: '#f1f5f9', 
                                  scale: 1.1, 
                                  filter: 'blur(0px)', 
                                  opacity: 1,
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                onClick={() => isEditMode && startAddCourse(dIdx + 1, slot.id)}
                                className={`h-6 flex items-center justify-center rounded-md transition-all ${isNextCell ? 'ring-4 ring-amber-300 bg-amber-50' : ''} ${isEditMode ? 'cursor-pointer hover:bg-primary-50 hover:ring-2 hover:ring-primary-300' : ''}`}
                              >
                                {isTargetCell ? (
                                  <div className="text-[10px] font-black text-primary-400 animate-pulse">正在休息/办公</div>
                                ) : isNextCell ? (
                                  <div className="text-[10px] font-black text-amber-600 flex flex-col items-center">
                                    <span>推算下一节</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 animate-ping" />
                                  </div>
                                ) : isEditMode ? (
                                  <div className="flex items-center gap-1 text-primary-400">
                                    <span className="text-[10px] font-medium">+ 添加课程</span>
                                  </div>
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                                )}
                              </motion.div>
                            )}
                          </td>
                        );
                      })}
                    </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="h-[300px] w-full bg-slate-50/30 flex items-center justify-center border-t border-dashed border-slate-200">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">已显示全部课程</span>
            </div>
          </div>
        </div>
      </div>
  </div>
);
}
