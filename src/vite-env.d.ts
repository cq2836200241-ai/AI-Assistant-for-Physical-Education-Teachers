/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  desktopReminder?: {
    show: (payload: { title: string; body: string; tag?: string }) => Promise<{ ok?: boolean }>;
  };
  desktopCapture?: {
    saveElementScreenshot: (payload: {
      filename: string;
      rect: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }) => Promise<{ canceled?: boolean; filePath?: string }>;
  };
  desktopStore?: {
    get: <T>(key: string, fallbackValue: T) => Promise<T>;
    set: <T>(key: string, value: T) => Promise<{ ok?: boolean }>;
    getUser: <T>(username: string, key: string, fallbackValue: T) => Promise<T>;
    setUser: <T>(username: string, key: string, value: T) => Promise<{ ok?: boolean }>;
    getAppState: <T>() => Promise<T>;
    setAppState: <T>(state: T) => Promise<{ ok?: boolean }>;
  };
  desktopSession?: {
    get: () => Promise<{ currentUser: string | null; locked: boolean }>;
    set: (payload: { currentUser: string | null; locked: boolean }) => Promise<{ currentUser: string | null; locked: boolean }>;
    clear: () => Promise<{ currentUser: string | null; locked: boolean }>;
  };
  desktopWindow?: {
    minimize: () => Promise<{ ok?: boolean }>;
    maximize: () => Promise<{ maximized: boolean }>;
    isMaximized: () => Promise<{ maximized: boolean }>;
    close: () => Promise<{ ok?: boolean }>;
  };
  desktopAuth?: {
    listUsers: () => Promise<string[]>;
    getSecurityQuestion: (username: string) => Promise<{ exists: boolean; question?: string }>;
    register: (payload: { username: string; password: string; question: string; answer: string }) => Promise<{ ok: boolean; username?: string }>;
    login: (payload: { username: string; password: string }) => Promise<{ ok: boolean; username?: string }>;
    resetPassword: (payload: { username: string; answer: string; newPassword: string }) => Promise<{ ok: boolean; reason?: string }>;
    unlock: (payload: { username: string; password: string }) => Promise<{ ok: boolean }>;
  };
}
