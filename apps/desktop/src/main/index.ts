import { app, BrowserWindow, session } from "electron";
import { join, resolve } from "path";
import { existsSync, statSync } from "fs";
import { createWindow } from "./windows/window";
import { CoreClient } from "./app/core-client";
import { CoreProcess } from "./app/core-process";
import { TerminalManager } from "./terminal/TerminalManager";
import { registerTerminalIpc } from "./terminal/registerTerminalIpc";
import { registerWindowIpc } from "./ipc/window.ipc";
import { registerFileIpc } from "./ipc/file.ipc";
import { registerEditorIpc } from "./ipc/editor.ipc";
import { registerGitIpc } from "./ipc/git.ipc";
import { registerSystemIpc } from "./ipc/system.ipc";
import { registerAuthIpc, handleDeepLink } from "./ipc/auth.ipc";
import { DockerManager } from "./docker/DockerManager";
import { registerDockerIpc } from "./ipc/docker.ipc";
import { BrowserService } from "./browser/BrowserService";
import { registerBrowserIpc } from "./ipc/browser.ipc";
import { CSP_PROD } from "./security/csp";
import { LinkManager } from "./link/link-manager";
import { registerLinkIpc } from "./ipc/link.ipc";
import { loadTokens } from "./auth/token-store";
import { setupCoreEvents } from "./app/core-events";

let mainWindow: BrowserWindow | null = null;
let terminalManager: TerminalManager | null = null;
let coreProcess: CoreProcess | null = null;
let dockerManager: DockerManager | null = null;
let linkManager: LinkManager | null = null;
let browserService: BrowserService | null = null;

// Fix GPU cache errors on Windows
app.setPath("cache", join(app.getPath("userData"), "Cache"));
if (process.platform === "win32") {
  app.setAppUserModelId("com.astraive.orphix");
}

// ── Deep-link protocol registration ──────────────────────────────────────────
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("orphix", process.execPath, [
      resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("orphix");
}

// macOS: handle deep links via open-url
app.on("open-url", (_event, url) => {
  handleDeepLink(url);
});

// Windows / Linux: single-instance lock + second-instance deep link handling
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const url = commandLine.find((arg: string) => arg.startsWith("orphix://"));
    if (url) handleDeepLink(url);

    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

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

function resolveLaunchCwd(): string {
  const explicitCwd = process.env.ORPHIX_CWD || process.env.ORPHIX_WORKSPACE_DIR;
  const candidate = explicitCwd?.trim() || process.cwd();
  try {
    if (candidate && existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
  } catch {
    // Fall through to Electron's user data dir.
  }
  return app.getPath("userData");
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  const launchCwd = resolveLaunchCwd();

  // Only enforce CSP in production
  if (!isDev) {
    setupCSP();
  }

  // Create terminal manager (node-pty based)
  terminalManager = new TerminalManager(launchCwd);
  coreProcess = new CoreProcess(() => {}, launchCwd);
  coreProcess.start();
  const coreClient = new CoreClient(
    (message) => coreProcess?.send(message),
    (handler) => coreProcess?.onMessage(handler),
  );
  setupCoreEvents(coreClient);
  registerTerminalIpc(terminalManager, launchCwd, coreClient);

  // Register other IPC handlers
  registerWindowIpc();
  registerSystemIpc(coreClient);
  registerFileIpc(coreClient, launchCwd);
  registerEditorIpc();
  registerGitIpc(coreClient);

  dockerManager = new DockerManager(coreClient);
  registerDockerIpc(dockerManager);
  browserService = new BrowserService();
  browserService.bindCoreClient(coreClient);
  registerBrowserIpc(browserService);

  // Register auth IPC
  registerAuthIpc();

  // Register link IPC — LinkManager delegates to orphix-core via CoreClient
  linkManager = new LinkManager(coreClient);
  registerLinkIpc(linkManager);
  const tokens = loadTokens();
  if (tokens?.accessToken) {
    linkManager.connect();
  }

  const preloadPath = join(__dirname, "../preload/index.cjs");
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

  // Handle deep link passed via command line on startup
  const deepLinkArg = process.argv.find((arg: string) =>
    arg.startsWith("orphix://"),
  );
  if (deepLinkArg) handleDeepLink(deepLinkArg);
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
  linkManager?.disconnect();
  dockerManager?.stopAllLogStreams();
  browserService?.destroy();
  coreProcess?.stop();
});
