import * as SecureStore from "expo-secure-store";
import { LinkClient } from "@orphix/link-client";
import type { LinkClientState, LinkClientEvent, TokenStore } from "@orphix/link-client";
import { getLinkUrl, getControlUrl } from "@/lib/api";

// Re-export types for backward compatibility
export type LinkServiceState = LinkClientState;
export type { LinkClientEvent as LinkServiceEvent };

const DEVICE_ID_KEY = "orphix_device_id";

class MobileTokenStore implements TokenStore {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync("orphix_access_token");
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = await SecureStore.getItemAsync("orphix_refresh_token");
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${getControlUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      await SecureStore.setItemAsync("orphix_access_token", data.accessToken);
      await SecureStore.setItemAsync("orphix_refresh_token", data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  }
}

async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (deviceId) return deviceId;
  deviceId = `mob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

// We need to use a module-level cached device ID since generateDeviceId is sync in the options
let cachedDeviceId: string | null = null;

function generateDeviceId(): string {
  // This will be called by LinkClient synchronously.
  // If we haven't initialized yet, return a placeholder — connect() will handle it.
  return cachedDeviceId ?? "mob_pending";
}

// Initialize the device ID eagerly
getOrCreateDeviceId().then((id) => {
  cachedDeviceId = id;
});

/**
 * Mobile LinkService — thin wrapper over the shared @orphix/link-client.
 * Each call to `new LinkService()` creates a fresh LinkClient configured
 * for the mobile platform (SecureStore tokens, mobile.hello auth).
 */
export class LinkService extends LinkClient {
  constructor() {
    super({
      linkUrl: getLinkUrl(),
      controlUrl: getControlUrl(),
      tokenStore: new MobileTokenStore(),
      authMethod: "mobile.hello",
      wsConstructor: WebSocket as unknown as typeof WebSocket,
      deviceName: "Mobile App",
      generateDeviceId,
    });
  }
}
