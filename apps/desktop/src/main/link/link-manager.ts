import { BrowserWindow } from "electron";
import { loadTokens, storeTokens } from "../auth/token-store";
import { getOrCreateDeviceIdentity } from "./device-identity";
import { loadLinkSettings } from "./link-settings";
import { CHANNELS } from "../../shared/ipc/channels";
import type { CoreClient } from "../app/core-client";

type LinkStatus = "disconnected" | "connecting" | "connected" | "authenticated" | "auth_failed" | "error";

// Read from environment, fall back to localhost for dev
const DEFAULT_LINK_URL = process.env.ORPHIX_LINK_URL ?? "ws://localhost:2606";
const DEFAULT_CONTROL_URL = process.env.ORPHIX_CONTROL_URL ?? "http://localhost:2605";

/**
 * LinkManager is a thin proxy that delegates all link operations to orphix-core
 * via CoreClient. The Rust orphix-link crate handles WS auth, Ed25519, and signaling.
 *
 * WebRTC still happens in the renderer (Chromium requirement), so this manager
 * forwards webrtc signals between orphix-core (stdio) and the renderer (IPC).
 */
export class LinkManager {
  private core: CoreClient;
  private status: LinkStatus = "disconnected";
  private deviceId: string | null = null;
  private linkUrl: string;
  private controlUrl: string;

  constructor(core: CoreClient, linkUrl = DEFAULT_LINK_URL, controlUrl = DEFAULT_CONTROL_URL) {
    this.core = core;
    this.linkUrl = linkUrl;
    this.controlUrl = controlUrl;

    // Listen for link events from orphix-core
    this.core.on("link.state", (data: any) => {
      if (data.state === "link_approved") {
        this.status = "authenticated";
        this.notifyRenderer("link_approved", {
          ...data,
          session_id: data.session_id ?? data.device_id,
          active_transport: data.active_transport ?? "websocket",
          mode: data.mode ?? "full_control",
        });
        return;
      }

      if (data.state === "link_rejected") {
        this.notifyRenderer("link_rejected", data);
        return;
      }

      this.status = data.state ?? "disconnected";
      this.deviceId = data.device_id ?? null;
      this.notifyRenderer(data.state === "auth_failed" ? "auth_failed" : "state_changed", data);
    });

    this.core.on("link.approval", (data: any) => {
      this.notifyRenderer("approval_request", data);
    });

    this.core.on("link.webrtc", (data: any) => {
      // Forward WebRTC signaling to renderer for RTCPeerConnection
      this.sendToRenderer(CHANNELS.WEBRTC_SIGNAL, data);
    });

    this.core.on("link.relay.ready", (data: any) => {
      this.notifyRenderer("relay_ready", data);
    });

    this.core.on("link.error", (data: any) => {
      this.notifyRenderer("error", data);
    });
  }

  async connect(): Promise<void> {
    if (this.status === "connected" || this.status === "connecting" || this.status === "authenticated") {
      await this.syncStatusFromCore();
      this.notifyRenderer();
      return;
    }

    const tokens = loadTokens();
    if (!tokens?.accessToken) {
      console.log("[link] No auth token, skipping connection");
      this.status = "auth_failed";
      this.notifyRenderer();
      return;
    }

    this.status = "connecting";
    this.notifyRenderer();

    try {
      // Try to refresh token if it might be expired
      const validToken = await this.ensureValidToken(tokens.accessToken, tokens.refreshToken);
      if (!validToken) {
        console.log("[link] Token refresh failed, cannot connect");
        this.status = "auth_failed";
        this.notifyRenderer("auth_failed", { reason: "Token expired" });
        return;
      }

      // Delegate to orphix-core, passing persisted device identity
      const identity = getOrCreateDeviceIdentity();
      const settings = loadLinkSettings();
      const result = await this.core.linkEnable(
        validToken,
        this.linkUrl,
        this.controlUrl,
        identity.deviceId,
        identity.privateKey,
        identity.publicKey,
        {
          transport_mode: settings.transport.mode,
          require_e2ee: settings.websocket.requireE2ee,
          allow_plain_relay: settings.encryption.allowPlainRelay,
        },
      );
      this.deviceId = result.device_id ?? identity.deviceId;
      await this.syncStatusFromCore();
      this.notifyRenderer();
      console.log("[link] Link enabled via orphix-core, device:", this.deviceId);
    } catch (err: any) {
      const msg = err.message ?? String(err);
      if (msg.includes("already enabled")) {
        console.log("[link] Link already enabled, ignoring");
        return;
      }
      console.error("[link] Failed to enable link:", err);
      this.status = "error";
      this.notifyRenderer("error", { error: msg });
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.core.linkDisable();
    } catch {
      // ignore
    }
    this.status = "disconnected";
    this.deviceId = null;
    this.notifyRenderer();
  }

  approve(sessionId: string): void {
    this.core.linkApprove(sessionId).catch((err) => {
      console.error("[link] Approve failed:", err);
    });
  }

  reject(sessionId: string): void {
    this.core.linkReject(sessionId).catch((err) => {
      console.error("[link] Reject failed:", err);
    });
  }

  getStatus(): LinkStatus {
    return this.status;
  }

  getStatusPayload(): { status: LinkStatus; deviceId: string | null } {
    return { status: this.status, deviceId: this.deviceId };
  }

  getLinkUrl(): string {
    return this.linkUrl;
  }

  getControlUrl(): string {
    return this.controlUrl;
  }

  /**
   * Forward a WebRTC signaling message from the renderer to orphix-core,
   * which relays it to the link API.
   */
  sendSignal(msg: Record<string, unknown>): void {
    const sessionId = msg.sessionId ?? msg.session_id;
    const normalized: Record<string, unknown> = {
      type: msg.type ?? msg.signal_type,
      session_id: sessionId,
    };
    if (typeof msg.sdp === "string") {
      normalized.sdp = msg.sdp;
    }
    if (msg.candidate !== undefined) {
      normalized.candidate = msg.candidate;
    }
    this.core.linkWebRTCSignal(normalized).catch((err) => {
      console.error("[link] WebRTC signal send failed:", err);
    });
  }

  updateWorkspaceSnapshot(payload: Record<string, unknown>): void {
    this.core.linkWorkspaceUpdate(payload).catch((err) => {
      console.error("[link] Workspace snapshot send failed:", err);
    });
  }

  /**
   * Re-enable connection after auth failure (e.g., user re-logged in).
   */
  resetAuthFailure(): void {
    this.status = "disconnected";
  }

  async syncStatusFromCore(): Promise<void> {
    try {
      const status = await this.core.linkStatus();
      const state = status.state === "connected" ? "authenticated" : status.state;
      if (
        state === "disconnected" ||
        state === "connecting" ||
        state === "authenticated" ||
        state === "auth_failed" ||
        state === "error"
      ) {
        this.status = state;
      }
      this.deviceId = status.device_id ?? this.deviceId;
    } catch {
      // Keep the last known status if core cannot answer.
    }
  }

  private async ensureValidToken(accessToken: string, refreshToken?: string): Promise<string | null> {
    try {
      const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64").toString());
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;

      if (expiresIn > 60) return accessToken;

      if (!refreshToken) {
        console.log("[link] Token expired and no refresh token");
        return null;
      }

      console.log("[link] Token expired, refreshing...");
      const res = await fetch(`${this.controlUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        console.error("[link] Token refresh failed:", res.status);
        return null;
      }

      const data = await res.json();
      storeTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? refreshToken,
      });

      console.log("[link] Token refreshed successfully");
      return data.accessToken;
    } catch (err) {
      console.error("[link] Token validation/refresh error:", err);
      return null;
    }
  }

  private sendToRenderer(channel: string, data?: any): void {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    win.webContents.send(channel, data);
  }

  private notifyRenderer(event?: string, data?: any): void {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;

    win.webContents.send(CHANNELS.LINK_STATUS, {
      status: this.status,
      deviceId: this.deviceId,
      event,
      data,
    });
  }
}
