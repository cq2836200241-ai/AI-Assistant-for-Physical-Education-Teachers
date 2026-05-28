import {
  applyPersistedAppState,
  getPersistedAppState,
  PersistedAppState,
  useAppStore,
} from './appStore';
import { readDesktopUserAppState, writeDesktopUserAppState } from '../lib/desktopStorage';
import { getCurrentUser } from '../lib/session';

let persistenceStarted = false;
let saveTimer: number | undefined;
let lastSavedPayload = '';

export async function hydrateDesktopAppState(username: string) {
  const state = await readDesktopUserAppState<Partial<PersistedAppState>>(username, {});
  applyPersistedAppState(state || {});
  lastSavedPayload = JSON.stringify(getPersistedAppState());
}

export function startDesktopAppPersistence() {
  if (persistenceStarted) return;
  persistenceStarted = true;

  useAppStore.subscribe((state) => {
    const nextState = getPersistedAppState(state);
    const nextPayload = JSON.stringify(nextState);
    if (nextPayload === lastSavedPayload) return;

    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      lastSavedPayload = nextPayload;
      const currentUser = getCurrentUser();
      if (!currentUser) return; // 不登录不保存
      
      try {
        await writeDesktopUserAppState(currentUser, nextState);
      } catch (error) {
        console.error('保存桌面应用状态失败:', error);
      }
    }, 250);
  });
}
