import { TIME_SLOTS } from '../constants/timetable';
import type { CourseEntry } from '../store/appStore';

export const CLASS_REMINDER_LEAD_MINUTES = 5;
const NOTIFIED_SESSION_KEY = 'pe_class_reminder_notified';

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
  try {
    const raw = sessionStorage.getItem(NOTIFIED_SESSION_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveNotifiedKeys(keys: Set<string>) {
  sessionStorage.setItem(NOTIFIED_SESSION_KEY, JSON.stringify([...keys]));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function showClassReminderNotification(payload: ClassReminderPayload) {
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
