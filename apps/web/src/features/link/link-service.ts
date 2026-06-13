import { LinkClient } from "@orphix/link-client";
import type { LinkClientState, LinkClientEvent, TokenStore } from "@orphix/link-client";
import { LINK_URL, CONTROL_URL } from "@/lib/env";

// Re-export types for backward compatibility
export type LinkServiceState = LinkClientState;
export type { LinkClientEvent as LinkServiceEvent };
export type ConnectionMode = "auto" | "websocket" | "webrtc" | "local";

class WebTokenStore implements TokenStore {
  async getAccessToken(): Promise<string | null> {
    let token = localStorage.getItem("orphix_access_token");
    if (!token) return null;

    // Check expiry
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiresAt = payload.exp * 1000;
      if (Date.now() >= expiresAt - 30_000) {
        token = await this.refreshToken();
      }
    } catch {
      token = await this.refreshToken();
    }
    return token;
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("orphix_refresh_token");
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${CONTROL_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      localStorage.setItem("orphix_access_token", data.accessToken);
      localStorage.setItem("orphix_refresh_token", data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  }
}

function generateDeviceId(): string {
  const stored = localStorage.getItem("orphix_web_device_id");
  if (stored) return stored;
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  const id = `web_${Date.now().toString(36)}_${randomPart}`;
  localStorage.setItem("orphix_web_device_id", id);
  return id;
}

function getWebDeviceName(): string {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string; brands?: Array<{ brand: string }> };
  };
  const platform = nav.userAgentData?.platform || navigator.platform || "Unknown OS";
  const brand = nav.userAgentData?.brands?.find(
    (item) => !item.brand.toLowerCase().includes("brand"),
  )?.brand;
  const browser = brand || navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\//)?.[1] || "Browser";
  return `${browser} on ${platform}`;
}

/**
 * Web LinkService — thin wrapper over the shared @orphix/link-client.
 * Each call to `new LinkService()` creates a fresh LinkClient configured
 * for the web platform (localStorage tokens, web.hello auth).
 */
export class LinkService extends LinkClient {
  constructor() {
    super({
      linkUrl: LINK_URL,
      controlUrl: CONTROL_URL,
      tokenStore: new WebTokenStore(),
      authMethod: "web.hello",
      wsConstructor: WebSocket,
      deviceName: getWebDeviceName(),
      generateDeviceId,
    });
  }
}
