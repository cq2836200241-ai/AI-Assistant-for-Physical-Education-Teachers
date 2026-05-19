import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import {
  getDueReminders,
  loadNotifiedKeys,
  saveNotifiedKeys,
  showClassReminderNotification,
  requestNotificationPermission,
} from '../utils/classReminder';

const CHECK_INTERVAL_MS = 30_000;

export function useClassReminder() {
  const classReminderEnabled = useAppStore((state) => state.classReminderEnabled);
  const courseData = useAppStore((state) => state.courseData);
  const notifiedRef = useRef<Set<string>>(loadNotifiedKeys());

  useEffect(() => {
    if (!classReminderEnabled) return;

    const runCheck = async () => {
      // Electron 环境下使用桌面通知，不需要浏览器 Notification 权限
      const isElectron = Boolean(window.desktopReminder?.show);
      if (!isElectron) {
        if (!('Notification' in window)) return;
        // 如果权限还没请求过，自动请求
        if (Notification.permission === 'default') {
          await requestNotificationPermission();
        }
        if (Notification.permission !== 'granted') return;
      }

      const due = getDueReminders(courseData);
      for (const reminder of due) {
        if (notifiedRef.current.has(reminder.key)) continue;
        await showClassReminderNotification(reminder);
        notifiedRef.current.add(reminder.key);
        saveNotifiedKeys(notifiedRef.current);
      }
    };

    runCheck();
    const timer = window.setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [classReminderEnabled, courseData]);
}
