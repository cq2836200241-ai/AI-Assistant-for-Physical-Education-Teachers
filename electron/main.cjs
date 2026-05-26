const { app, BrowserWindow, dialog, ipcMain, Notification, Menu, Tray, shell, safeStorage } = require('electron');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

const isDev = process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development';

// ===== 日志系统 =====
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LOG_LEVEL = isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

function getLogFilePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'logs', `app-${new Date().toISOString().slice(0, 10)}.log`);
}

function ensureLogDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
}

function writeLog(level, levelName, ...args) {
  if (level < CURRENT_LOG_LEVEL) return;
  const timestamp = new Date().toISOString();
  const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  const logLine = `[${timestamp}] [${levelName}] ${message}\n`;

  // Console output
  if (level === LOG_LEVELS.ERROR) {
    console.error(logLine.trim());
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(logLine.trim());
  } else {
    console.log(logLine.trim());
  }

  // File output (production only)
  if (!isDev) {
    try {
      const logPath = getLogFilePath();
      ensureLogDir(logPath);
      fsSync.appendFileSync(logPath, logLine, 'utf-8');
    } catch (e) {
      console.error('日志写入失败:', e);
    }
  }
}

const logger = {
  debug: (...args) => writeLog(LOG_LEVELS.DEBUG, 'DEBUG', ...args),
  info: (...args) => writeLog(LOG_LEVELS.INFO, 'INFO', ...args),
  warn: (...args) => writeLog(LOG_LEVELS.WARN, 'WARN', ...args),
  error: (...args) => writeLog(LOG_LEVELS.ERROR, 'ERROR', ...args),
};
// ===== 日志系统结束 =====

let mainWindow = null;
let tray = null;
const gotSingleInstanceLock = app.requestSingleInstanceLock();
let desktopSession = {
  currentUser: null,
  locked: false,
};

const DATA_VERSION_DIR = 'desktop-data-v1';
const PASSWORD_ITERATIONS = 210000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = 'sha256';

function getDesktopDataDir() {
  return path.join(app.getPath('userData'), DATA_VERSION_DIR);
}

function validateStoreKey(key) {
  const normalized = String(key || '').trim();
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(normalized)) {
    throw new Error('Invalid storage key');
  }
  return normalized;
}

function getStoreFilePath(key) {
  return path.join(getDesktopDataDir(), `${validateStoreKey(key)}.json`);
}

function getUserStoreFilePath(username, key) {
  const userHash = crypto.createHash('sha256').update(String(username || '')).digest('hex').slice(0, 32);
  return path.join(getDesktopDataDir(), 'users-data', userHash, `${validateStoreKey(key)}.json`);
}

function getAuthFilePath() {
  return path.join(getDesktopDataDir(), 'auth', 'users.json');
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallbackValue;
    logger.warn('读取本地数据失败，使用默认值:', filePath, error?.message || error);
    return fallbackValue;
  }
}

async function writeJsonFileAtomic(filePath, value) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(value, null, 2);
  await fs.writeFile(tempPath, payload, 'utf8');
  await fs.rename(tempPath, filePath);
}

function hashSecret(secret, salt) {
  return crypto.pbkdf2Sync(String(secret), salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString('hex');
}

function createSecretRecord(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    salt,
    hash: hashSecret(secret, salt),
  };
}

function verifySecret(secret, record) {
  if (!record?.salt || !record?.hash) return false;
  const hash = hashSecret(secret, record.salt);
  const expected = Buffer.from(record.hash, 'hex');
  const actual = Buffer.from(hash, 'hex');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function encryptString(value) {
  if (!value) return null;
  const text = String(value);
  if (safeStorage.isEncryptionAvailable()) {
    return {
      encoding: 'safeStorage',
      value: safeStorage.encryptString(text).toString('base64'),
    };
  }
  logger.warn('safeStorage 不可用，API Key 将以明文降级保存。');
  return {
    encoding: 'plain',
    value: text,
  };
}

function decryptString(record) {
  if (!record?.value) return '';
  if (record.encoding === 'safeStorage') {
    try {
      return safeStorage.decryptString(Buffer.from(record.value, 'base64'));
    } catch (error) {
      logger.warn('API Key 解密失败:', error?.message || error);
      return '';
    }
  }
  if (record.encoding === 'plain') return String(record.value || '');
  return '';
}

function splitSensitiveProviderState(state) {
  const publicState = { ...(state || {}) };
  const encryptedKeys = {};
  if (publicState.providers && typeof publicState.providers === 'object') {
    publicState.providers = Object.fromEntries(
      Object.entries(publicState.providers).map(([id, provider]) => {
        const nextProvider = { ...(provider || {}) };
        if (nextProvider.apiKey) {
          encryptedKeys[id] = encryptString(nextProvider.apiKey);
        }
        nextProvider.apiKey = '';
        return [id, nextProvider];
      })
    );
  }
  return { publicState, encryptedKeys };
}

function restoreSensitiveProviderState(publicState, encryptedKeys) {
  const restored = { ...(publicState || {}) };
  if (restored.providers && typeof restored.providers === 'object') {
    restored.providers = Object.fromEntries(
      Object.entries(restored.providers).map(([id, provider]) => [
        id,
        {
          ...(provider || {}),
          apiKey: decryptString(encryptedKeys?.[id]),
        },
      ])
    );
  }
  return restored;
}

async function loadUsers() {
  const users = await readJsonFile(getAuthFilePath(), {});
  return users && typeof users === 'object' ? users : {};
}

async function saveUsers(users) {
  await writeJsonFileAtomic(getAuthFilePath(), users);
}

function getStaticAssetPath(filename) {
  const assetDir = isDev
    ? path.join(__dirname, '..', 'public')
    : path.join(__dirname, '..', 'dist');
  return path.join(assetDir, filename);
}

function attachWindowDiagnostics(window) {
  window.webContents.on('did-finish-load', () => {
    logger.info('页面加载完成:', window.webContents.getURL());
  });

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    logger.error('页面加载失败:', {
      errorCode,
      errorDescription,
      validatedURL,
      isMainFrame,
    });
  });

  window.webContents.on('did-fail-provisional-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    logger.error('页面预加载失败:', {
      errorCode,
      errorDescription,
      validatedURL,
      isMainFrame,
    });
  });

  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const logPayload = { level, message, line, sourceId };
    if (level >= 2) {
      logger.error('渲染进程控制台:', logPayload);
    } else {
      logger.info('渲染进程控制台:', logPayload);
    }
  });

  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error('渲染进程退出:', details);
  });

  window.on('unresponsive', () => {
    logger.warn('主窗口无响应');
  });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    if (app.isReady()) {
      createWindow();
    }
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}

function createWindow() {
  logger.info('创建主窗口...');
  const windowOptions = {
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: '智能体育教案助手',
    icon: getStaticAssetPath('icon.ico'),
    autoHideMenuBar: true,
    backgroundColor: '#0d9488',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };

  if (process.platform === 'win32') {
    windowOptions.titleBarStyle = 'hidden';
  }

  mainWindow = new BrowserWindow(windowOptions);

  // 启动时自动最大化，适配所有屏幕尺寸
  mainWindow.maximize();

  attachWindowDiagnostics(mainWindow);

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 点击关闭按钮时最小化到托盘，而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function createTray() {
  const iconPath = getStaticAssetPath('icon-32x32.png');
  logger.info('创建托盘图标:', iconPath);
  if (!fsSync.existsSync(iconPath)) {
    logger.warn('托盘图标不存在，跳过托盘创建:', iconPath);
    return;
  }

  try {
    tray = new Tray(iconPath);
  } catch (error) {
    logger.error('托盘创建失败，应用继续运行:', error);
    return;
  }

  tray.setToolTip('智能体育教案助手');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        showMainWindow();
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
    showMainWindow();
  });
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    logger.info('检测到重复启动，显示已有窗口');
    showMainWindow();
  });

  app.whenReady().then(() => {
    logger.info(`应用启动 - 版本: ${app.getVersion()}, 环境: ${isDev ? '开发' : '生产'}`);
    logger.info(`用户数据目录: ${app.getPath('userData')}`);

    if (process.platform === 'win32') {
      app.setAppUserModelId(app.getName());
    }
    Menu.setApplicationMenu(null);
    createWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        showMainWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  // 不退出程序，只是隐藏到托盘
  // 真正的退出通过托盘菜单的"退出程序"实现
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

ipcMain.handle('desktop-window:minimize', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
  return { ok: true };
});

ipcMain.handle('desktop-window:maximize', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { maximized: false };
  }
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  return { maximized: mainWindow.isMaximized() };
});

ipcMain.handle('desktop-window:is-maximized', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { maximized: false };
  }
  return { maximized: mainWindow.isMaximized() };
});

ipcMain.handle('desktop-window:close', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  return { ok: true };
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

ipcMain.handle('desktop-store:get', async (_event, payload) => {
  const key = validateStoreKey(payload?.key);
  const fallbackValue = payload?.fallbackValue ?? null;
  return readJsonFile(getStoreFilePath(key), fallbackValue);
});

ipcMain.handle('desktop-store:set', async (_event, payload) => {
  const key = validateStoreKey(payload?.key);
  await writeJsonFileAtomic(getStoreFilePath(key), payload?.value ?? null);
  return { ok: true };
});

ipcMain.handle('desktop-user-store:get', async (_event, payload) => {
  const username = String(payload?.username || desktopSession.currentUser || '').trim();
  if (!username) return payload?.fallbackValue ?? null;
  const key = validateStoreKey(payload?.key);
  const fallbackValue = payload?.fallbackValue ?? null;
  return readJsonFile(getUserStoreFilePath(username, key), fallbackValue);
});

ipcMain.handle('desktop-user-store:set', async (_event, payload) => {
  const username = String(payload?.username || desktopSession.currentUser || '').trim();
  if (!username) throw new Error('未登录，无法保存用户数据');
  const key = validateStoreKey(payload?.key);
  await writeJsonFileAtomic(getUserStoreFilePath(username, key), payload?.value ?? null);
  return { ok: true };
});

ipcMain.handle('desktop-app-state:get', async () => {
  const publicState = await readJsonFile(getStoreFilePath('app-state'), {});
  const encryptedKeys = await readJsonFile(getStoreFilePath('provider-api-keys'), {});
  return restoreSensitiveProviderState(publicState, encryptedKeys);
});

ipcMain.handle('desktop-app-state:set', async (_event, payload) => {
  const { publicState, encryptedKeys } = splitSensitiveProviderState(payload?.state || {});
  await writeJsonFileAtomic(getStoreFilePath('app-state'), publicState);
  await writeJsonFileAtomic(getStoreFilePath('provider-api-keys'), encryptedKeys);
  return { ok: true };
});

ipcMain.handle('desktop-session:get', async () => {
  return { ...desktopSession };
});

ipcMain.handle('desktop-session:set', async (_event, payload) => {
  desktopSession = {
    currentUser: payload?.currentUser ? String(payload.currentUser) : null,
    locked: Boolean(payload?.locked),
  };
  return { ...desktopSession };
});

ipcMain.handle('desktop-session:clear', async () => {
  desktopSession = { currentUser: null, locked: false };
  return { ...desktopSession };
});

ipcMain.handle('desktop-auth:list-users', async () => {
  const users = await loadUsers();
  return Object.keys(users);
});

ipcMain.handle('desktop-auth:get-security-question', async (_event, payload) => {
  const username = String(payload?.username || '').trim();
  if (!username) return { exists: false };
  const users = await loadUsers();
  const user = users[username];
  if (!user) return { exists: false };
  return { exists: true, question: user.question || '' };
});

ipcMain.handle('desktop-auth:register', async (_event, payload) => {
  const username = String(payload?.username || '').trim();
  const password = String(payload?.password || '');
  const question = String(payload?.question || '').trim();
  const answer = String(payload?.answer || '');
  if (!username || !password || !question || !answer) {
    throw new Error('请填写所有必需字段');
  }

  const users = await loadUsers();
  if (users[username]) {
    throw new Error('用户名已存在');
  }

  users[username] = {
    question,
    password: createSecretRecord(password),
    answer: createSecretRecord(answer),
    createdAt: new Date().toISOString(),
  };
  await saveUsers(users);
  desktopSession = { currentUser: username, locked: false };
  return { ok: true, username };
});

ipcMain.handle('desktop-auth:login', async (_event, payload) => {
  const username = String(payload?.username || '').trim();
  const password = String(payload?.password || '');
  const users = await loadUsers();
  const user = users[username];
  if (!user || !verifySecret(password, user.password)) {
    return { ok: false };
  }
  desktopSession = { currentUser: username, locked: false };
  return { ok: true, username };
});

ipcMain.handle('desktop-auth:reset-password', async (_event, payload) => {
  const username = String(payload?.username || '').trim();
  const answer = String(payload?.answer || '');
  const newPassword = String(payload?.newPassword || '');
  const users = await loadUsers();
  const user = users[username];
  if (!user) return { ok: false, reason: 'not-found' };
  if (!verifySecret(answer, user.answer)) {
    return { ok: false, reason: 'answer' };
  }
  if (!newPassword) {
    return { ok: false, reason: 'password' };
  }
  user.password = createSecretRecord(newPassword);
  user.updatedAt = new Date().toISOString();
  await saveUsers(users);
  return { ok: true };
});

ipcMain.handle('desktop-auth:unlock', async (_event, payload) => {
  const username = String(payload?.username || desktopSession.currentUser || '').trim();
  const password = String(payload?.password || '');
  const users = await loadUsers();
  const user = users[username];
  if (!user || !verifySecret(password, user.password)) {
    return { ok: false };
  }
  desktopSession = { currentUser: username, locked: false };
  return { ok: true };
});
