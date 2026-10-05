const { app, BrowserWindow, shell, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { APP_ORIGIN, configureSession, protectNavigation } = require('./security');

const debug = process.env.QOBUZ_DEBUG === '1';
const profile = debug ? 'qobuz-compact-client-debug' : 'qobuz-compact-client';
let mainWindow;
nativeTheme.themeSource = 'dark';

if (debug) {
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
  app.commandLine.appendSwitch('remote-debugging-port', '9223');
}
app.setPath('userData', path.join(app.getPath('appData'), profile));
app.setDesktopName('qobuz-compact-client');

function createWindow() {
  const window = new BrowserWindow({
    width: 1180, height: 820, minWidth: 480, minHeight: 540,
    backgroundColor: '#0b0d10',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:qobuz-compact',
    },
  });
  mainWindow = window;
  const contents = window.webContents;
  configureSession(contents.session);
  protectNavigation(contents, url => shell.openExternal(url));
  let showingError = false;

  contents.on('did-finish-load', async () => {
    if (new URL(contents.getURL()).origin !== APP_ORIGIN) return;
    try {
      const css = await fs.readFile(path.join(__dirname, 'theme.css'), 'utf8');
      if (window.isDestroyed() || new URL(contents.getURL()).origin !== APP_ORIGIN) return;
      await contents.insertCSS(css);
      await contents.executeJavaScript(`
        for (const element of [document.documentElement, document.body]) {
          element.classList.remove('theme-light');
          element.classList.add('theme-dark');
        }
      `);
    } catch (error) {
      if (!window.isDestroyed()) console.error('Could not apply Qobuz theme:', error.message);
    }
  });

  async function showError() {
    if (window.isDestroyed() || showingError) return;
    showingError = true;
    try {
      await window.loadFile(path.join(__dirname, 'load-error.html'));
    } catch {
      if (!window.isDestroyed()) console.error('Could not display the connection error.');
    }
  }

  function loadPlayer() {
    if (window.isDestroyed()) return;
    showingError = false;
    window.loadURL(APP_ORIGIN).catch(error => {
      if (!window.isDestroyed() && error.code !== 'ERR_ABORTED') void showError();
    });
  }

  contents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) void showError();
  });
  contents.on('render-process-gone', () => {
    showingError = false;
    void showError();
  });
  // The local error page needs no preload or IPC: its retry link returns here.
  contents.on('will-navigate', (event, value) => {
    if (showingError && (event.url || value) === APP_ORIGIN + '/') {
      event.preventDefault();
      loadPlayer();
    }
  });
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !input.shift || !(input.control || input.meta) || input.alt) return;
    const key = input.key.toLowerCase();
    if (key === 'r') {
      event.preventDefault();
      if (showingError) loadPlayer();
      else contents.reloadIgnoringCache();
    } else if (key === 'i') {
      event.preventDefault();
      contents.toggleDevTools();
    }
  });
  window.on('closed', () => { if (mainWindow === window) mainWindow = null; });
  loadPlayer();
  window.show();
  window.focus();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Register early: a second launch can arrive before the first window exists.
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (!mainWindow) createWindow(); });
  }).catch(() => {
    console.error('Could not start Qobuz.');
    app.quit();
  });
}
app.on('window-all-closed', () => app.quit());
