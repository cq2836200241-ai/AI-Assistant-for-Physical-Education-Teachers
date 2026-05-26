export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'morning' | 'afternoon' | 'evening' | 'break';
  typeLabel?: string;
}

export interface CourseEntry {
  day: number; // 1-5 for Mon-Fri
  slotId: string;
  grade: string;
  className: string;
}

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: 'am1', name: '第一节', startTime: '08:20', endTime: '09:00', type: 'morning' },
  { id: 'am2', name: '第二节', startTime: '09:15', endTime: '09:55', type: 'morning' },
  { id: 'break1', name: '大课间', startTime: '09:55', endTime: '10:25', type: 'break' },
  { id: 'am3', name: '第三节', startTime: '10:25', endTime: '11:05', type: 'morning' },
  { id: 'lunch', name: '午餐/午休', startTime: '11:05', endTime: '12:30', type: 'break' },
  { id: 'pm1', name: '第一节', startTime: '12:35', endTime: '13:15', type: 'afternoon' },
  { id: 'break2', name: '大课间', startTime: '13:15', endTime: '13:45', type: 'break' },
  { id: 'pm2', name: '第二节', startTime: '13:45', endTime: '14:25', type: 'afternoon' },
  { id: 'pm3', name: '第三节', startTime: '14:40', endTime: '15:20', type: 'afternoon' },
  { id: 'ext1', name: '延时服务1', startTime: '15:30', endTime: '16:30', type: 'evening' },
  { id: 'ext2', name: '延时服务2', startTime: '16:40', endTime: '17:40', type: 'evening' },
];

export const TIME_SLOTS: TimeSlot[] = DEFAULT_TIME_SLOTS;

export const COURSE_DATA: CourseEntry[] = [
  // 周一
  { day: 1, slotId: 'am3', grade: '五', className: '2' },
  { day: 1, slotId: 'pm2', grade: '四', className: '1' },
  
  // 周二
  { day: 2, slotId: 'pm1', grade: '四', className: '3' },
  { day: 2, slotId: 'pm2', grade: '五', className: '1' },
  { day: 2, slotId: 'pm3', grade: '四', className: '2' },
  
  // 周三
  { day: 3, slotId: 'am1', grade: '五', className: '3' },
  { day: 3, slotId: 'pm1', grade: '四', className: '3' },
  { day: 3, slotId: 'pm2', grade: '五', className: '1' },
  { day: 3, slotId: 'pm3', grade: '五', className: '2' },
  { day: 3, slotId: 'ext1', grade: '二', className: '1' },
  
  // 周四
  { day: 4, slotId: 'am1', grade: '三', className: '2' },
  { day: 4, slotId: 'pm1', grade: '四', className: '1' },
  { day: 4, slotId: 'pm3', grade: '四', className: '2' },
  { day: 4, slotId: 'ext1', grade: '四', className: '3' },
  { day: 4, slotId: 'ext2', grade: '五', className: '1' },
  
  // 周五
  { day: 5, slotId: 'am3', grade: '三', className: '1' },
  { day: 5, slotId: 'pm1', grade: '三', className: '3' },
  { day: 5, slotId: 'pm2', grade: '五', className: '3' },
];
