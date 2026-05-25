import { app, BrowserWindow, session } from "electron";
import { join } from "path";
import { createWindow } from "./window";
import { TerminalManager } from "../terminal/main/TerminalManager";
import { registerTerminalIpc } from "../terminal/main/registerTerminalIpc";
import { registerWindowIpc } from "./ipc/window.ipc";
import { registerFileIpc } from "./ipc/file.ipc";
import { registerGitIpc } from "./ipc/git.ipc";
import { CSP_PROD } from "./security/csp";

let mainWindow: BrowserWindow | null = null;
let terminalManager: TerminalManager | null = null;

// Fix GPU cache errors on Windows
app.setPath("cache", join(app.getPath("userData"), "Cache"));

function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [CSP_PROD],
      },
    });
  });
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;

  // Only enforce CSP in production
  if (!isDev) {
    setupCSP();
  }

  // Create terminal manager (node-pty based)
  terminalManager = new TerminalManager();
  registerTerminalIpc(terminalManager);

  // Register other IPC handlers
  registerWindowIpc();
  registerFileIpc();
  registerGitIpc();

  const preloadPath = join(__dirname, "../preload/index.mjs");
  mainWindow = createWindow(preloadPath);

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (terminalManager) {
    terminalManager.killAll();
  }
});
