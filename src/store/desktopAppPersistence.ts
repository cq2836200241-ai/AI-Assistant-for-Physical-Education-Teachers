import {
  applyPersistedAppState,
  getPersistedAppState,
  PersistedAppState,
  useAppStore,
} from './appStore';
import { readDesktopAppState, writeDesktopAppState } from '../lib/desktopStorage';

let persistenceStarted = false;
let hydrated = false;
let saveTimer: number | undefined;
let lastSavedPayload = '';

export async function hydrateDesktopAppState() {
  if (hydrated) return;
  const state = await readDesktopAppState<Partial<PersistedAppState>>({});
  applyPersistedAppState(state || {});
  lastSavedPayload = JSON.stringify(getPersistedAppState());
  hydrated = true;
}

export function startDesktopAppPersistence() {
  if (persistenceStarted) return;
  persistenceStarted = true;

  useAppStore.subscribe((state) => {
    if (!hydrated) return;
    const nextState = getPersistedAppState(state);
    const nextPayload = JSON.stringify(nextState);
    if (nextPayload === lastSavedPayload) return;
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      lastSavedPayload = nextPayload;
      writeDesktopAppState(nextState).catch((error) => {
        console.error('保存桌面应用状态失败:', error);
      });
    }, 250);
  });
}
