export function hasDesktopStore(): boolean {
  return Boolean(window.desktopStore);
}

export async function readDesktopStore<T>(key: string, fallbackValue: T): Promise<T> {
  if (!window.desktopStore) return fallbackValue;
  return window.desktopStore.get<T>(key, fallbackValue);
}

export async function writeDesktopStore<T>(key: string, value: T): Promise<void> {
  if (!window.desktopStore) return;
  await window.desktopStore.set(key, value);
}

export async function readDesktopUserStore<T>(username: string, key: string, fallbackValue: T): Promise<T> {
  if (!window.desktopStore) return fallbackValue;
  return window.desktopStore.getUser<T>(username, key, fallbackValue);
}

export async function writeDesktopUserStore<T>(username: string, key: string, value: T): Promise<void> {
  if (!window.desktopStore) return;
  await window.desktopStore.setUser(username, key, value);
}

export async function readDesktopAppState<T>(fallbackValue: T): Promise<T> {
  if (!window.desktopStore) return fallbackValue;
  const value = await window.desktopStore.getAppState<T>();
  return value ?? fallbackValue;
}

export async function writeDesktopAppState<T>(state: T): Promise<void> {
  if (!window.desktopStore) return;
  await window.desktopStore.setAppState(state);
}

export async function readDesktopUserAppState<T>(username: string, fallbackValue: T): Promise<T> {
  if (!window.desktopStore || !window.desktopStore.getUserAppState) return fallbackValue;
  const value = await window.desktopStore.getUserAppState<T>(username);
  return value ?? fallbackValue;
}

export async function writeDesktopUserAppState<T>(username: string, state: T): Promise<void> {
  if (!window.desktopStore || !window.desktopStore.setUserAppState) return;
  await window.desktopStore.setUserAppState(username, state);
}
