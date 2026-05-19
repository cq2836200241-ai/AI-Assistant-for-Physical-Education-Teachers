import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TIME_SLOTS } from '../../constants/timetable';
import { Clock, Zap, X, Pencil, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, CourseEntry } from '../../store/appStore';
import { getGradesByLevel, GRADE_SHORT } from '../../constants/education';

export function TimetableTable() {
  const { autoMist, setAutoMist, courseData, setCourseData, addCourseEntry, removeCourseEntry, isTimetableEditMode, setTimetableEditMode, educationLevel, classCounts } = useAppStore();
  
  // Generate grade options (short) based on education level
  const gradeOptions = useMemo(() => {
    const fullGrades = getGradesByLevel(educationLevel);
    return fullGrades.map(g => GRADE_SHORT[g] || g).filter(Boolean);
  }, [educationLevel]);

  // Generate class options based on current grade selection
  const getClassOptions = useMemo(() => {
    return (gradeShort: string) => {
      // Find the full grade name
      const fullGrade = Object.entries(GRADE_SHORT).find(([, short]) => short === gradeShort)?.[0];
      if (!fullGrade) return ['1', '2', '3', '4', '5', '6'];
      const count = classCounts[fullGrade] || 6;
      return Array.from({ length: count }, (_, i) => String(i + 1));
    };
  }, [classCounts]);

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
  const [hoverTimeInfo, setHoverTimeInfo] = useState<{ slot: typeof TIME_SLOTS[0]; rect: DOMRect } | null>(null);

  const isEditMode = isTimetableEditMode;
  const [editDay, setEditDay] = useState(1);
  const [editSlotId, setEditSlotId] = useState('');
  const [editGrade, setEditGrade] = useState('五');
  const [editClassName, setEditClassName] = useState('1');
  const [addingNew, setAddingNew] = useState(false);

  // Update modal position based on source button
  useEffect(() => {
    if (selectedCourse && sourceRect) {
      const margin = 8;
      const modalWidth = 200;
      const modalHeight = 140;
      
      let left = sourceRect.right + margin;
      let top = sourceRect.top;

      if (left + modalWidth > window.innerWidth - margin) {
        left = sourceRect.left - modalWidth - margin;
      }

      if (top + modalHeight > window.innerHeight - margin) {
        top = window.innerHeight - modalHeight - margin;
      }

      if (top < margin) {
        top = margin;
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
                    {gradeOptions.map(g => <option key={g} value={g}>{g}年级</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-slate-500 block mb-1">班级</label>
                  <select 
                    value={editClassName}
                    onChange={e => setEditClassName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    {getClassOptions(editGrade).map(c => <option key={c} value={c}>{c}班</option>)}
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
    <div className="h-full flex flex-col relative">
      {/* 悬停浮动时间提示 */}
      {hoverTimeInfo && (
        <div
          style={{
            position: 'fixed',
            top: hoverTimeInfo.rect.top,
            left: hoverTimeInfo.rect.right + 6,
            zIndex: 9999,
          }}
          className="bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none"
        >
          {hoverTimeInfo.slot.startTime} - {hoverTimeInfo.slot.endTime}
        </div>
      )}
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'fixed',
                top: modalPos.top,
                left: modalPos.left,
                zIndex: 102
              }}
              className="relative bg-white rounded-xl shadow-2xl border-2 border-primary-400 overflow-hidden pointer-events-auto"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex items-center gap-2 bg-primary-600 px-3 py-2 text-white">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-black">{days[selectedCourse.course.day - 1]} · {selectedCourse.slot.name}</span>
                <button 
                  onClick={() => { setSelectedCourse(null); }}
                  className="ml-auto text-white/70 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-3 py-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">{selectedCourse.course.grade}年级({selectedCourse.course.className})班</span>
                  <span className="text-[10px] font-bold text-slate-400">体育课</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{selectedCourse.slot.startTime}</span>
                  <span>→</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{selectedCourse.slot.endTime}</span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button 
                    onClick={() => handleEditCourse(selectedCourse.course.day, selectedCourse.course.slotId, selectedCourse.course.grade, selectedCourse.course.className)}
                    className="flex-1 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors"
                  >
                    <Pencil className="w-3 h-3 inline mr-0.5" />编辑
                  </button>
                  <button 
                    onClick={() => handleDeleteCourse(selectedCourse.course.day, selectedCourse.course.slotId)}
                    className="flex-1 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 inline mr-0.5" />删除
                  </button>
                </div>
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

      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-xl border-[3px] border-slate-500 overflow-hidden">
        <div className="h-full overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full min-w-[600px] border-collapse">
            <thead className="sticky top-0 z-10 shadow-md">
              <tr className="bg-gradient-to-r from-primary-500 to-secondary-500 border-b-2 border-white/20">
                <motion.th
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  className="py-1 sm:py-1.5 px-1 sm:px-2 text-center text-[11px] sm:text-[13px] font-black text-white border-r border-white/10 min-w-[60px] sm:min-w-[80px]"
                >
                  时间
                </motion.th>
                {days.map((day, idx) => {
                  const isToday = currentTimeInfo.day === idx + 1;
                  return (
                    <motion.th
                    key={idx}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)', scale: 1.02 }}
                    className={`py-1 sm:py-1.5 px-1 sm:px-2 text-center text-[12px] sm:text-[14px] font-black border-r-2 border-white/20 last:border-r-0 min-w-[70px] sm:min-w-[100px] transition-colors ${isToday ? 'bg-white/20 text-white' : 'text-white/90'}`}
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
                    className={`border-b-2 border-slate-300 transition-colors ${

                      isBreak ? 'bg-slate-100' : isCurrentSlot ? 'bg-primary-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <motion.td
                      whileHover={{
                        backgroundColor: isCurrentSlot ? 'rgb(239 246 255)' : 'rgb(248 250 252)',
                        scale: 1.05,
                        zIndex: 40,
                        boxShadow: '0 4px 8px -2px rgb(0 0 0 / 0.1)'
                      }}
                      className={`py-0 px-0.5 sm:px-1 border-r-2 border-slate-400 font-bold transition-all cursor-default relative ${isCurrentSlot ? 'bg-primary-50' : 'bg-white'}`}
                    >
                      <div className="flex flex-col items-center gap-0 group">
                        <span className={`text-[10px] sm:text-[12px] font-black leading-none flex items-center gap-1 ${isCurrentSlot ? 'text-primary-700' : isBreak ? 'text-slate-500' : 'text-slate-900'}`}>
                          {isCurrentSlot && <Zap className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-primary-600 border-none" />}
                          {slot.name}
                        </span>
                        <div className={`flex items-center gap-0.5 text-[9px] sm:text-[11px] px-0.5 sm:px-1 py-0 rounded shadow-sm border font-black ${isCurrentSlot ? 'bg-primary-600 text-white border-primary-500' : 'text-slate-800 bg-slate-100 border-slate-300'}`}>
                          <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                          {slot.startTime}
                        </div>
                      </div>
                    </motion.td>
                    
                    {isBreak ? (
                      <td colSpan={5} className="py-0.5 px-1 text-center bg-slate-50">
                        <span className="text-[10px] sm:text-[12px] font-black text-slate-500 tracking-[0.2em] uppercase">
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
                            <td key={dIdx} className={`py-0 px-1 border-r-2 border-slate-300 last:border-r-0 transition-all duration-300 ${isTargetCell ? 'bg-primary-50' : isNextCell ? 'bg-amber-50' : ''}`}>
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
                                    scale: 1.05, 
                                    zIndex: 30, 
                                    boxShadow: '0 4px 8px -2px rgb(0 0 0 / 0.1)',
                                    filter: 'blur(0px) grayscale(0)',
                                    opacity: 1
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoverTimeInfo({ slot, rect });
                                  }}
                                  onMouseLeave={() => setHoverTimeInfo(null)}
                                  onClick={(e) => {
                                    if (!isEditMode) {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setSourceRect(rect);
                                      setSelectedCourse({ course, slot });
                                    }
                                  }}
                                  className={`
                                    w-full py-0.5 px-0.5 rounded flex flex-col items-center justify-center shadow-sm ring-1 transition-all cursor-pointer
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
                                  <span className={`${isNextCell ? 'text-[13px] sm:text-[16px]' : 'text-[11px] sm:text-[13px]'} font-black tracking-wide`}>
                                    {course.grade}({course.className})
                                  </span>
                                  {isTargetCell && <span className="text-[8px] font-black mt-0 uppercase tracking-tighter bg-white/20 px-1 rounded">●</span>}
                                  {isNextCell && <span className="text-[8px] font-black mt-0 uppercase tracking-tighter bg-amber-200 text-amber-900 px-1.5 rounded-full animate-bounce">→</span>}
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
                                className={`h-4 flex items-center justify-center rounded-sm transition-all ${isNextCell ? 'ring-4 ring-amber-300 bg-amber-50' : ''} ${isEditMode ? 'cursor-pointer hover:bg-primary-50 hover:ring-2 hover:ring-primary-300' : ''}`}
                              >
                                {isTargetCell ? (
                                  <div className="text-[10px] font-black text-primary-400 animate-pulse">正在休息/办公</div>
                                ) : isNextCell ? (
                                  <div className="w-2 h-2 rounded-full bg-slate-300" />
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
          <div className="h-8 w-full bg-slate-50/30 flex items-center justify-center border-t border-dashed border-slate-200">
            <div className="flex flex-col items-center text-slate-400">
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">已显示全部课程</span>
            </div>
          </div>
        </div>
      </div>
  </div>
);
}
