import { ipcMain, shell, BrowserWindow } from "electron";

import { storeTokens, loadTokens, clearTokens, getValidAccessToken } from "../auth/token-store";
import { getOrCreateDeviceIdentity, getDeviceRegistrationPayload } from "../link/device-identity";
import { CHANNELS } from "../../shared/ipc/channels";

const LOGIN_TYPE = process.env.LOGIN_TYPE ?? "web";
const WEB_LOGIN_URL = process.env.ORPHIX_WEB_URL ? `${process.env.ORPHIX_WEB_URL}/login` : "http://localhost:3000/login";
const CONTROL_API_URL = process.env.ORPHIX_CONTROL_URL ?? "http://localhost:2605";

let pendingCallback: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;

export function registerAuthIpc(): void {
  ipcMain.handle(CHANNELS.AUTH_LOGIN, async () => {
    if (LOGIN_TYPE === "desktop") {
      return openAuthWindow();
    }
    const url = `${WEB_LOGIN_URL}?client=desktop`;
    shell.openExternal(url);
    return { url };
  });

  ipcMain.handle(
    CHANNELS.AUTH_CALLBACK,
    async (_event, tokens: { accessToken: string; refreshToken: string }) => {
      storeTokens(tokens);
      registerDevice(tokens.accessToken);
      if (pendingCallback) {
        pendingCallback(tokens);
        pendingCallback = null;
      }
      return { success: true };
    },
  );

  ipcMain.handle(CHANNELS.AUTH_STATUS, async () => {
    const tokens = loadTokens();
    const token = tokens?.accessToken ? await getValidAccessToken(CONTROL_API_URL) : null;
    return {
      authenticated: !!token,
      isAuthenticated: !!token,
      user: tokens?.username ? { username: tokens.username } : null,
      username: tokens?.username,
    };
  });

  ipcMain.handle(CHANNELS.AUTH_GET_TOKEN, async () => {
    return getValidAccessToken(CONTROL_API_URL);
  });

  ipcMain.handle(CHANNELS.AUTH_LOGOUT, async () => {
    clearTokens();
    return { success: true };
  });
}

function openAuthWindow(): { url: string } {
  const loginUrl = `${WEB_LOGIN_URL}?client=desktop`;

  const authWindow = new BrowserWindow({
    width: 480,
    height: 680,
    title: "Sign in to Orphix",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  authWindow.loadURL(loginUrl);

  const checkUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.pathname === "/auth/callback" || parsed.pathname === "/login") {
        const hash = parsed.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          storeTokens({ accessToken, refreshToken });
          registerDevice(accessToken);

          const win = BrowserWindow.getAllWindows()[0];
          if (win) {
            win.webContents.send(CHANNELS.AUTH_CALLBACK, { accessToken, refreshToken });
          }

          authWindow.close();
        }
      }
    } catch {
      // Not a valid URL, ignore
    }
  };

  authWindow.webContents.on("will-navigate", (_event, url) => {
    checkUrl(url);
  });

  authWindow.webContents.on("did-navigate", (_event, url) => {
    checkUrl(url);
  });

  authWindow.on("closed", () => {
    // Window closed without completing auth — no-op
  });

  return { url: loginUrl };
}

async function registerDevice(accessToken: string): Promise<void> {
  try {
    const identity = getOrCreateDeviceIdentity();
    const payload = getDeviceRegistrationPayload(identity);

    const res = await fetch(`${CONTROL_API_URL}/devices/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[auth] Device registration failed:", res.status, body);
    } else {
      console.log("[auth] Device registered:", identity.deviceId);
    }
  } catch (err) {
    console.warn("[auth] Device registration error:", err);
  }
}

export { registerDevice };

export function handleDeepLink(url: string): void {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      storeTokens({ accessToken, refreshToken });
      registerDevice(accessToken);

      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.webContents.send(CHANNELS.AUTH_CALLBACK, { accessToken, refreshToken });
      }
    }
  } catch (err) {
    console.error("[auth] Failed to handle deep link:", err);
  }
}
