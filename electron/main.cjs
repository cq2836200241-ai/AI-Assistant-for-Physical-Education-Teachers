const { app, BrowserWindow, dialog, ipcMain, Notification, Menu, Tray, shell } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const isDev = process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development';

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: '智能体育教案助手',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // 点击关闭按钮时最小化到托盘，而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'icon-32x32.png');
  tray = new Tray(iconPath);
  tray.setToolTip('智能体育教案助手');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
        });
      },
    },
    { type: 'separator' },
    {
      label: '关于 智能体育教案助手',
      click: () => {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: '关于 智能体育教案助手',
          message: '智能体育教案助手',
          detail: `版本: ${app.getVersion()}\n\nAI 驱动的体育教案生成辅助工具\n帮助体育教师快速生成专业教案`,
        });
      },
    },
    { type: 'separator' },
    {
      label: '退出程序',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.getName());
  }
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  // 不退出程序，只是隐藏到托盘
  // 真正的退出通过托盘菜单的"退出程序"实现
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

ipcMain.handle('class-reminder:show', async (_event, payload) => {
  if (!Notification.isSupported()) {
    return { ok: false };
  }

  const notification = new Notification({
    title: String(payload?.title || '上课提醒'),
    body: String(payload?.body || ''),
    silent: false,
  });

  notification.on('click', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });

  notification.show();
  return { ok: true };
});

ipcMain.handle('desktop-capture:save-element', async (event, payload) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    throw new Error('无法找到当前窗口');
  }

  const filename = String(payload?.filename || '截图.png').replace(/[\\/:*?"<>|]/g, '_');
  const rect = payload?.rect;
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    throw new Error('截图区域无效');
  }

  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: '保存截图',
    defaultPath: filename.endsWith('.png') ? filename : `${filename}.png`,
    filters: [{ name: 'PNG 图片', extensions: ['png'] }],
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  const scaleFactor = window.webContents.getZoomFactor();
  const image = await window.webContents.capturePage({
    x: Math.max(0, Math.round(rect.x * scaleFactor)),
    y: Math.max(0, Math.round(rect.y * scaleFactor)),
    width: Math.max(1, Math.round(rect.width * scaleFactor)),
    height: Math.max(1, Math.round(rect.height * scaleFactor)),
  });

  await fs.writeFile(filePath, image.toPNG());
  return { canceled: false, filePath };
});
