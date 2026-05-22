const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopCapture', {
  saveElementScreenshot: (payload) => ipcRenderer.invoke('desktop-capture:save-element', payload),
});

contextBridge.exposeInMainWorld('desktopReminder', {
  show: (payload) => ipcRenderer.invoke('class-reminder:show', payload),
});

contextBridge.exposeInMainWorld('desktopStore', {
  get: (key, fallbackValue) => ipcRenderer.invoke('desktop-store:get', { key, fallbackValue }),
  set: (key, value) => ipcRenderer.invoke('desktop-store:set', { key, value }),
  getUser: (username, key, fallbackValue) => ipcRenderer.invoke('desktop-user-store:get', { username, key, fallbackValue }),
  setUser: (username, key, value) => ipcRenderer.invoke('desktop-user-store:set', { username, key, value }),
  getAppState: () => ipcRenderer.invoke('desktop-app-state:get'),
  setAppState: (state) => ipcRenderer.invoke('desktop-app-state:set', { state }),
});

contextBridge.exposeInMainWorld('desktopSession', {
  get: () => ipcRenderer.invoke('desktop-session:get'),
  set: (payload) => ipcRenderer.invoke('desktop-session:set', payload),
  clear: () => ipcRenderer.invoke('desktop-session:clear'),
});

contextBridge.exposeInMainWorld('desktopAuth', {
  listUsers: () => ipcRenderer.invoke('desktop-auth:list-users'),
  getSecurityQuestion: (username) => ipcRenderer.invoke('desktop-auth:get-security-question', { username }),
  register: (payload) => ipcRenderer.invoke('desktop-auth:register', payload),
  login: (payload) => ipcRenderer.invoke('desktop-auth:login', payload),
  resetPassword: (payload) => ipcRenderer.invoke('desktop-auth:reset-password', payload),
  unlock: (payload) => ipcRenderer.invoke('desktop-auth:unlock', payload),
});

contextBridge.exposeInMainWorld('desktopWindow', {
  minimize: () => ipcRenderer.invoke('desktop-window:minimize'),
  maximize: () => ipcRenderer.invoke('desktop-window:maximize'),
  isMaximized: () => ipcRenderer.invoke('desktop-window:is-maximized'),
  close: () => ipcRenderer.invoke('desktop-window:close'),
});
