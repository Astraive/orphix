import { ipcMain, shell, BrowserWindow } from "electron";
import { storeTokens, loadTokens, clearTokens } from "../auth/token-store";
import { getOrCreateDeviceIdentity, getDeviceRegistrationPayload } from "../link/device-identity";
import { CHANNELS } from "../../shared/ipc/channels";

const WEB_LOGIN_URL = process.env.ORPHIX_WEB_URL ? `${process.env.ORPHIX_WEB_URL}/login` : "http://localhost:3000/login";
const CONTROL_API_URL = process.env.ORPHIX_CONTROL_URL ?? "http://localhost:2605";

let pendingCallback: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;

export function registerAuthIpc(): void {
  // Open browser for login
  ipcMain.handle(CHANNELS.AUTH_LOGIN, async () => {
    // Only send client type — redirect URI is determined server-side to prevent open redirect
    const url = `${WEB_LOGIN_URL}?client=desktop`;
    shell.openExternal(url);
    return { url };
  });

  // Handle callback from deep link (invoked by renderer after receiving tokens)
  ipcMain.handle(
    CHANNELS.AUTH_CALLBACK,
    async (_event, tokens: { accessToken: string; refreshToken: string }) => {
      storeTokens(tokens);
      // Register device with control API
      registerDevice(tokens.accessToken);
      if (pendingCallback) {
        pendingCallback(tokens);
        pendingCallback = null;
      }
      return { success: true };
    },
  );

  // Check auth status
  ipcMain.handle(CHANNELS.AUTH_STATUS, async () => {
    const tokens = loadTokens();
    return { authenticated: !!tokens?.accessToken, username: tokens?.username };
  });

  // Get current access token
  ipcMain.handle(CHANNELS.AUTH_GET_TOKEN, async () => {
    const tokens = loadTokens();
    return tokens?.accessToken ?? null;
  });

  // Logout -- clear stored tokens
  ipcMain.handle(CHANNELS.AUTH_LOGOUT, async () => {
    clearTokens();
    return { success: true };
  });
}

/**
 * Register this device with the control API (for workspace/metadata).
 */
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

/**
 * Called when a deep link of the form `orphix://auth/callback#...` is
 * received (via open-url on macOS or second-instance on Windows/Linux).
 */
export function handleDeepLink(url: string): void {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      storeTokens({ accessToken, refreshToken });

      // Register device with control API
      registerDevice(accessToken);

      // Notify the renderer so AuthProvider picks up the new tokens
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.webContents.send(CHANNELS.AUTH_CALLBACK, { accessToken, refreshToken });
      }
    }
  } catch (err) {
    console.error("[auth] Failed to handle deep link:", err);
  }
}
