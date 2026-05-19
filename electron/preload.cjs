const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopCapture', {
  saveElementScreenshot: (payload) => ipcRenderer.invoke('desktop-capture:save-element', payload),
});

contextBridge.exposeInMainWorld('desktopReminder', {
  show: (payload) => ipcRenderer.invoke('class-reminder:show', payload),
});
