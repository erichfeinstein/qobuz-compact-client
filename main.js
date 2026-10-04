const { app, BrowserWindow, globalShortcut, nativeTheme } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const QOBUZ_URL = "https://play.qobuz.com";
const THEME_PATH = path.join(__dirname, "theme.css");
const QOBUZ_ICON = path.join(__dirname, "assets", "icon.png");

let mainWindow;

// Local-only DevTools endpoint for inspecting the live Qobuz DOM during theming.
app.commandLine.appendSwitch("remote-debugging-port", "9223");
nativeTheme.themeSource = "dark";
// Pin the profile dir and set the window's WM_CLASS so GNOME matches it to
// qobuz-compact-client.desktop for the dock icon.
app.setPath("userData", path.join(app.getPath("appData"), "qobuz-compact-client"));
app.setDesktopName("qobuz-compact-client");

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

async function applyTheme(window) {
  const css = await fs.readFile(THEME_PATH, "utf8");
  await window.webContents.insertCSS(css);
  await window.webContents.executeJavaScript(`
    document.documentElement.classList.remove("theme-light");
    document.documentElement.classList.add("theme-dark");
    document.body.classList.remove("theme-light");
    document.body.classList.add("theme-dark");
  `);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 480,
    minHeight: 540,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#121212",
      symbolColor: "#ffffff",
      height: 48,
    },
    icon: QOBUZ_ICON,
    backgroundColor: "#0b0d10",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: "persist:qobuz-compact",
    },
  });

  mainWindow.webContents.debugger.attach("1.3");
  mainWindow.webContents.debugger.sendCommand("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "dark" }],
  }).catch(console.error);

  mainWindow.webContents.on("did-finish-load", () => {
    applyTheme(mainWindow).catch(console.error);
  });

  mainWindow.loadURL(QOBUZ_URL);
  mainWindow.show();
  mainWindow.focus();
}

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register("CommandOrControl+Shift+R", () => mainWindow.webContents.reloadIgnoringCache());
  globalShortcut.register("CommandOrControl+Shift+I", () => mainWindow.webContents.toggleDevTools());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("second-instance", () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
});

app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => globalShortcut.unregisterAll());
