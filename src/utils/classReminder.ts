import { TIME_SLOTS } from '../constants/timetable';
import type { CourseEntry } from '../store/appStore';

export const CLASS_REMINDER_LEAD_MINUTES = 5;
let notifiedKeysMemory = new Set<string>();

export function getBeijingDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);
}

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function formatClassLabel(grade: string, className: string): string {
  return `${grade}年级(${className})班`;
}

export interface ClassReminderPayload {
  key: string;
  title: string;
  body: string;
}

export function getDueReminders(
  courseData: CourseEntry[],
  leadMinutes = CLASS_REMINDER_LEAD_MINUTES,
  now = getBeijingDate()
): ClassReminderPayload[] {
  const weekday = now.getDay();
  if (weekday < 1 || weekday > 5) return [];

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const reminders: ClassReminderPayload[] = [];

  for (const course of courseData) {
    if (course.day !== weekday) continue;

    const slot = TIME_SLOTS.find((item) => item.id === course.slotId);
    if (!slot || slot.type === 'break') continue;

    const startMinutes = timeToMinutes(slot.startTime);
    const remindFrom = startMinutes - leadMinutes;

    if (currentMinutes >= remindFrom && currentMinutes < startMinutes) {
      const classLabel = formatClassLabel(course.grade, course.className);
      const key = `${dateKey}-${course.day}-${course.slotId}-${course.grade}-${course.className}`;
      reminders.push({
        key,
        title: '上课提醒',
        body: `${leadMinutes}分钟后上课：${classLabel} · ${slot.name} ${slot.startTime}`,
      });
    }
  }

  return reminders;
}

export function loadNotifiedKeys(): Set<string> {
  return new Set(notifiedKeysMemory);
}

export function saveNotifiedKeys(keys: Set<string>) {
  notifiedKeysMemory = new Set(keys);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** 播放短促炫酷的上升电子提示音 */
export function playReminderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // 主音：上升双音调
    const notes = [523.25, 659.25, 783.99]; // C5 → E5 → G5（大三和弦上升）
    const noteDuration = 0.12;
    const gap = 0.08;

    notes.forEach((freq, i) => {
      const startTime = ctx.currentTime + i * (noteDuration + gap);

      // 振荡器 - 方波 + 锯齿波混合，产生电子感
      const osc1 = ctx.createOscillator();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(freq, startTime);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq * 2, startTime);

      // 增益包络 - 快速起音 + 短促衰减
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc1.stop(startTime + noteDuration);
      osc2.start(startTime);
      osc2.stop(startTime + noteDuration);
    });

    // 结尾加一个短促的"叮"泛音
    const pingOsc = ctx.createOscillator();
    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(1567.98, ctx.currentTime + notes.length * (noteDuration + gap)); // G6

    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0, ctx.currentTime + notes.length * (noteDuration + gap));
    pingGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + notes.length * (noteDuration + gap) + 0.01);
    pingGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + notes.length * (noteDuration + gap) + 0.3);

    pingOsc.connect(pingGain);
    pingGain.connect(ctx.destination);
    pingOsc.start(ctx.currentTime + notes.length * (noteDuration + gap));
    pingOsc.stop(ctx.currentTime + notes.length * (noteDuration + gap) + 0.3);

    // 自动释放 AudioContext
    setTimeout(() => ctx.close(), 2000);
  } catch {
    // 静默失败，不影响提醒功能
  }
}

export async function showClassReminderNotification(payload: ClassReminderPayload) {
  // 播放提示音
  playReminderSound();

  if (window.desktopReminder?.show) {
    await window.desktopReminder.show({ title: payload.title, body: payload.body, tag: payload.key });
    return;
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification(payload.title, {
    body: payload.body,
    tag: payload.key,
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
