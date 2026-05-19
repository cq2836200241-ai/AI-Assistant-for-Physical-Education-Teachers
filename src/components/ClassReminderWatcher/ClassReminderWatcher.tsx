import { useClassReminder } from '../../hooks/useClassReminder';

/** 挂载后根据设置与智能课表，在课前 5 分钟触发系统通知 */
export function ClassReminderWatcher() {
  useClassReminder();
  return null;
}
