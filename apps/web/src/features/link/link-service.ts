import { LINK_URL, CONTROL_URL } from "@/lib/env";
import { LinkFrameFactory, isLinkFrame, type LinkFrame, type TransportMode, type ActiveTransport } from "@orphix/types";

export type LinkServiceState =
  | "idle"
  | "connecting"
  | "connected"
  | "authenticated"
  | "requesting"
  | "awaiting_approval"
  | "p2p_connecting"
  | "p2p_connected"
  | "disconnected"
  | "error";

type LinkServiceEvent =
  | { type: "state"; state: LinkServiceState }
  | { type: "error"; error: string }
  | { type: "terminal.output"; data: string }
  | { type: "terminal.state"; sessionId: string; status: string }
  | { type: "terminal.exit"; sessionId: string; exitCode: number | null }
  | { type: "workspace.list"; workspaces: WorkspaceNode[] };

export interface WorkspaceNode {
  id: string;
  name: string;
  windows: WindowNode[];
}

export interface WindowNode {
  id: string;
  name: string;
  terminals: TerminalNode[];
}

export interface TerminalNode {
  id: string;
  name: string;
  status: string;
}

type Listener = (event: LinkServiceEvent) => void;
export type ConnectionMode = TransportMode;

const HEARTBEAT_INTERVAL = 15_000;
const HEARTBEAT_TIMEOUT = 45_000;
const MAX_RECONNECT = 20;
const BASE_RECONNECT_DELAY = 2_000;
const MAX_RECONNECT_DELAY = 60_000;

function generateDeviceId(): string {
  const stored = localStorage.getItem("orphix_web_device_id");
  if (stored) return stored;
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
  const id = `web_${Date.now().toString(36)}_${randomPart}`;
  localStorage.setItem("orphix_web_device_id", id);
  return id;
}

function normalizeIceCandidate(candidate: unknown): RTCIceCandidateInit | null {
  if (!candidate) return null;
  if (typeof candidate === "string") {
    try {
      return normalizeIceCandidate(JSON.parse(candidate));
    } catch {
      return { candidate };
    }
  }
  if (typeof candidate === "object") {
    const value = candidate as RTCIceCandidateInit;
    return typeof value.candidate === "string" ? value : null;
  }
  return null;
}

export class LinkService {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private state: LinkServiceState = "idle";
  private listeners: Set<Listener> = new Set();
  private deviceId: string;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastPongAt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionId: string | null = null;
  private attachedTerminalId: string | null = null;
  private linkedDesktopId: string | null = null;
  private linkedMode: string = "full_control";
  private transportMode: TransportMode = "auto";
  private activeTransport: ActiveTransport = "pending";
  private frameFactory: LinkFrameFactory | null = null;
  private relayActive: boolean = false;
  private reconnectAttempts = 0;
  private rejectedByServer = false;
  private intentionalClose = false;
  private authResolve: (() => void) | null = null;
  private authReject: ((err: Error) => void) | null = null;
  private token: string | null = null;

  constructor() {
    this.deviceId = generateDeviceId();
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: LinkServiceEvent): void {
    for (const l of this.listeners) l(event);
  }

  private setState(state: LinkServiceState): void {
    console.log(`[link] state: ${this.state} → ${state}`);
    this.state = state;
    this.emit({ type: "state", state });
  }

  getState(): LinkServiceState {
    return this.state;
  }

  getAttachedTerminalId(): string | null {
    return this.attachedTerminalId;
  }

  private async ensureValidToken(): Promise<string | null> {
    let token = localStorage.getItem("orphix_access_token");
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiresAt = payload.exp * 1000;
      if (Date.now() >= expiresAt - 30_000) {
        token = await this.refreshAccessToken();
      }
    } catch {
      token = await this.refreshAccessToken();
    }
    return token;
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem("orphix_refresh_token");
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${CONTROL_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { accessToken: string; refreshToken: string };
      localStorage.setItem("orphix_access_token", data.accessToken);
      localStorage.setItem("orphix_refresh_token", data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  }

  async connect(): Promise<void> {
    if (this.ws) return;
    if (this.rejectedByServer) return;
    if (this.intentionalClose) return;

    this.token = await this.ensureValidToken();
    if (!this.token) {
      this.emit({ type: "error", error: "Not authenticated" });
      this.setState("error");
      return;
    }

    this.setState("connecting");

    const wsUrl = LINK_URL.replace(/^http/, "ws");
    this.ws = new WebSocket(`${wsUrl}/v1/link/mobile`);

    const authPromise = new Promise<void>((resolve, reject) => {
      this.authResolve = resolve;
      this.authReject = reject;

      // Auth handshake timeout (15s)
      const authTimeout = setTimeout(() => {
        if (this.authReject) {
          this.authReject(new Error("Authentication timeout"));
          this.authResolve = null;
          this.authReject = null;
          this.ws?.close();
        }
      }, 15_000);

      // Clear timeout when auth completes
      const origResolve = this.authResolve;
      const origReject = this.authReject;
      this.authResolve = () => { clearTimeout(authTimeout); origResolve(); };
      this.authReject = (err: Error) => { clearTimeout(authTimeout); origReject(err); };
    });

    this.ws.onopen = () => {
      this.setState("connected");
      this.reconnectAttempts = 0;
      this.lastPongAt = Date.now();
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.error("[link] Failed to parse message:", err);
      }
    };

    this.ws.onclose = (event) => {
      this.ws = null;
      this.stopHeartbeat();
      this.authReject?.(new Error("Connection closed"));
      this.authResolve = null;
      this.authReject = null;

      if (this.intentionalClose) {
        this.setState("disconnected");
        return;
      }

      // Keep state as-is for brief disconnects (don't flash "disconnected")
      if (this.state === "p2p_connected" || this.state === "awaiting_approval") {
        // Brief disconnect — will reconnect and recover
        this.setState("disconnected");
      } else {
        this.setState("disconnected");
      }

      if (!this.rejectedByServer && event.code !== 4000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.authReject?.(new Error("Connection failed"));
      this.authResolve = null;
      this.authReject = null;
    };

    return authPromise;
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.rejectedByServer = false;
    this.reconnectAttempts = 0;
    this.closeWebRTC();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState("disconnected");
  }

  requestLink(desktopDeviceId: string, mode: string = "full_control"): void {
    if (
      this.linkedDesktopId === desktopDeviceId &&
      ["requesting", "awaiting_approval", "p2p_connecting", "p2p_connected"].includes(this.state)
    ) {
      return;
    }
    if (!this.ws || this.state !== "authenticated") {
      this.emit({ type: "error", error: "Not authenticated" });
      return;
    }
    this.linkedDesktopId = desktopDeviceId;
    this.linkedMode = mode;
    this.send({ type: "link.request", desktopDeviceId, mode, transportMode: this.transportMode, workspaceId: null, windowId: null, terminalId: null });
    this.setState("requesting");
  }

  createTerminal(cwd?: string, shell?: string, workspaceId?: string, windowId?: string): void {
    this.send({
      type: "terminal.create",
      desktopDeviceId: this.linkedDesktopId,
      cwd,
      shell,
      workspaceId,
      windowId,
    });
  }

  attachTerminal(terminalId: string): void {
    this.attachedTerminalId = terminalId;
    if (this.activeTransport === "websocket") {
      this.startRelay(terminalId);
      return;
    }
    if (this.dc?.readyState === "open") {
      this.dc.send(JSON.stringify({ type: "terminal.attach", sessionId: this.sessionId, terminalId }));
    }
  }

  sendTerminalInput(data: string): void {
    if (this.activeTransport === "websocket") { this.sendRelayInput(data); return; }
    if (this.dc?.readyState === "open" && this.attachedTerminalId) {
      this.sendFrameOverDataChannel("terminal.stdin", { data }, this.attachedTerminalId);
    }
  }

  sendTerminalResize(cols: number, rows: number): void {
    if (this.activeTransport === "websocket") { this.sendRelayResize(cols, rows); return; }
    if (this.dc?.readyState === "open" && this.attachedTerminalId) {
      this.sendFrameOverDataChannel("terminal.resize", { cols, rows }, this.attachedTerminalId);
    }
  }

  startRelay(terminalId: string): void {
    if (!this.sessionId) return;
    this.activeTransport = "websocket";
    this.attachedTerminalId = terminalId;
    this.send({ type: "relay.start", sessionId: this.sessionId, terminalId, transportMode: "websocket" });
  }

  private async tryWebRTCUpgrade(sessionId: string): Promise<void> {
    try {
      // Fetch ICE config
      const res = await fetch(`${LINK_URL}/v1/link/ice-config`);
      const iceConfig = await res.json().catch(() => ({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      }));

      this.pc = new RTCPeerConnection({
        iceServers: iceConfig.iceServers,
        iceTransportPolicy: iceConfig.iceTransportPolicy ?? "all",
      });

      // Timeout: if WebRTC doesn't connect in 8s, give up (relay is already working)
      const timeout = setTimeout(() => {
        if (this.pc && this.pc.connectionState !== "connected") {
          console.log("[link] WebRTC upgrade timed out");
          this.closeWebRTC();
          if (this.transportMode === "webrtc") {
            this.emit({ type: "error", error: "Direct P2P connection timed out" });
            this.setState("error");
          }
        }
      }, 8000);

      this.pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.send({ type: "webrtc.ice", sessionId, candidate: e.candidate.toJSON() });
        }
      };

      this.pc.onconnectionstatechange = () => {
        if (this.pc?.connectionState === "connected") {
          clearTimeout(timeout);
          this.activeTransport = "webrtc";
          console.log("[link] WebRTC upgrade successful");
        }
      };

      this.dc = this.pc.createDataChannel("orphix-control", { ordered: true });
      this.setupDataChannel(this.dc);

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.send({ type: "webrtc.offer", sessionId, sdp: offer.sdp });
    } catch (err) {
      console.log("[link] WebRTC upgrade failed:", err);
    }
  }

  setTransport(mode: "direct" | "relay"): void {
    this.setTransportMode(mode === "relay" ? "websocket" : "webrtc");
  }

  getTransport(): "direct" | "relay" {
    return this.activeTransport === "websocket" ? "relay" : "direct";
  }

  setTransportMode(mode: TransportMode): void {
    this.transportMode = mode;
    if (mode === "websocket") this.activeTransport = "websocket";
    if (mode === "webrtc") this.activeTransport = "pending";
  }

  private sendRelayInput(data: string): void {
    if (!this.sessionId || !this.attachedTerminalId) return;
    this.send({ type: "relay.message", sessionId: this.sessionId, terminalId: this.attachedTerminalId, data, direction: "input" });
  }

  private sendRelayResize(cols: number, rows: number): void {
    if (!this.sessionId || !this.attachedTerminalId) return;
    this.send({ type: "relay.message", sessionId: this.sessionId, terminalId: this.attachedTerminalId, data: JSON.stringify({ type: "resize", cols, rows }), direction: "input" });
  }

  private handleMessage(msg: Record<string, unknown>): void {
    const type = msg.type as string;
    console.log(`[link] recv: ${type}`);
    switch (type) {
      case "challenge":
        this.send({ type: "web.hello", accessToken: this.token, deviceId: this.deviceId });
        break;
      case "hello.ack":
        this.setState("authenticated");
        this.authResolve?.();
        this.authResolve = null;
        this.authReject = null;
        // Auto-recover: if we were previously linked, re-request
        if (this.linkedDesktopId && this.state !== "p2p_connected") {
          this.requestLink(this.linkedDesktopId, this.linkedMode);
        }
        break;
      case "hello.reject":
        this.rejectedByServer = true;
        this.emit({ type: "error", error: msg.reason as string });
        this.setState("error");
        this.authReject?.(new Error(msg.reason as string));
        this.authResolve = null;
        this.authReject = null;
        this.ws?.close();
        break;
      case "link.pending":
        this.setState("awaiting_approval");
        break;
      case "link.approved":
        this.sessionId = msg.sessionId as string;
        this.frameFactory = new LinkFrameFactory(this.sessionId, this.deviceId, this.linkedDesktopId ?? "");
        this.activeTransport = "websocket";
        this.setState(this.transportMode === "webrtc" ? "p2p_connecting" : "p2p_connected");
        if (this.transportMode !== "websocket") {
          this.tryWebRTCUpgrade(msg.sessionId as string);
        }
        break;
      case "link.rejected":
        this.emit({ type: "error", error: msg.reason as string || "Link rejected by desktop" });
        this.setState("authenticated");
        break;
      case "webrtc.answer":
        this.handleAnswer(msg.sdp as string);
        break;
      case "webrtc.ice":
        this.handleIce(msg.candidate);
        break;
      case "relay.ready":
        this.relayActive = true;
        this.setState("p2p_connected");
        break;
      case "relay.terminal.output":
        this.handleTransportFrame(msg.data as string);
        break;
      case "relay.terminal.state":
        this.emit({ type: "terminal.state", sessionId: msg.sessionId as string, status: msg.status as string });
        break;
      case "relay.terminal.exit":
        this.emit({ type: "terminal.exit", sessionId: msg.sessionId as string, exitCode: msg.exitCode as number | null });
        break;
      case "workspace.list":
        this.emit({ type: "workspace.list", workspaces: msg.workspaces as WorkspaceNode[] });
        break;
      case "pong":
        this.lastPongAt = Date.now();
        break;
    }
  }

  private async startWebRTC(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    this.setState("p2p_connecting");
    try {
      const res = await fetch(`${LINK_URL}/v1/link/ice-config`);
      const iceConfig = await res.json().catch(() => ({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }, { urls: ["stun:stun1.l.google.com:19302"] }],
      }));
      this.pc = new RTCPeerConnection({ iceServers: iceConfig.iceServers, iceTransportPolicy: (iceConfig.iceTransportPolicy as RTCIceTransportPolicy) ?? "all" });
      this.pc.onicecandidate = (e) => { if (e.candidate) this.send({ type: "webrtc.ice", sessionId, candidate: e.candidate.toJSON() }); };
      this.pc.onconnectionstatechange = () => {
        if (this.pc?.connectionState === "connected") {
          this.activeTransport = "webrtc";
          this.setState("p2p_connected");
        }
        if (this.pc?.connectionState === "failed") {
          this.closeWebRTC();
          if (this.transportMode === "webrtc") {
            this.emit({ type: "error", error: "Direct P2P connection failed" });
            this.setState("error");
          } else {
            this.startRelay(this.attachedTerminalId ?? "default");
          }
        }
      };
      this.dc = this.pc.createDataChannel("orphix-control", { ordered: true });
      this.setupDataChannel(this.dc);
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.send({ type: "webrtc.offer", sessionId, sdp: offer.sdp });
    } catch (err) {
      console.error("[link] WebRTC setup failed:", err);
      this.setState("error");
    }
  }

  private async handleAnswer(sdp: string): Promise<void> {
    if (!this.pc) return;
    try { await this.pc.setRemoteDescription({ type: "answer", sdp }); } catch (err) { console.error("[link] Failed to set answer:", err); }
  }

  private async handleIce(candidate: unknown): Promise<void> {
    if (!this.pc) return;
    const normalized = normalizeIceCandidate(candidate);
    if (!normalized) return;
    try { await this.pc.addIceCandidate(normalized); } catch (err) { console.error("[link] Failed to add ICE candidate:", err); }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.activeTransport = "webrtc";
      this.setState("p2p_connected");
      if (this.attachedTerminalId) {
        channel.send(JSON.stringify({
          type: "terminal.attach",
          sessionId: this.sessionId,
          terminalId: this.attachedTerminalId,
        }));
      }
    };
    channel.onmessage = (e) => {
      this.handleTransportFrame(e.data);
    };
  }

  private createFrame(kind: LinkFrame["kind"], payload: unknown, streamId = ""): string {
    if (!this.frameFactory && this.sessionId) {
      this.frameFactory = new LinkFrameFactory(this.sessionId, this.deviceId, this.linkedDesktopId ?? "");
    }
    return JSON.stringify(this.frameFactory?.create(kind, payload, streamId, {
      activeTransport: this.activeTransport,
      requestedMode: this.transportMode,
    }));
  }

  private sendFrameOverDataChannel(kind: LinkFrame["kind"], payload: unknown, streamId = ""): void {
    if (this.dc?.readyState === "open") this.dc.send(this.createFrame(kind, payload, streamId));
  }

  private handleTransportFrame(data: string): void {
      try {
        const msg = JSON.parse(data);
        if (isLinkFrame(msg)) {
          if (msg.kind === "terminal.stdout") {
            this.emit({ type: "terminal.output", data: String((msg.payload as any).data ?? "") });
          }
          if (msg.kind === "terminal.exit") {
            this.emit({ type: "terminal.exit", sessionId: msg.stream_id, exitCode: (msg.payload as any).exitCode ?? null });
          }
          return;
        }
        switch (msg.type) {
          case "terminal.output": this.emit({ type: "terminal.output", data: msg.data }); break;
          case "terminal.state": this.emit({ type: "terminal.state", sessionId: msg.sessionId, status: msg.status }); break;
          case "terminal.exit": this.emit({ type: "terminal.exit", sessionId: msg.sessionId, exitCode: msg.exitCode }); break;
          case "workspace.list": this.emit({ type: "workspace.list", workspaces: msg.workspaces }); break;
        }
      } catch { this.emit({ type: "terminal.output", data }); }
  }

  private closeWebRTC(): void {
    this.dc?.close(); this.dc = null;
    this.pc?.close(); this.pc = null;
    this.attachedTerminalId = null;
  }

  private send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      this.send({ type: "ping", ts: Date.now() });
      // Check if server is responding
      if (Date.now() - this.lastPongAt > HEARTBEAT_TIMEOUT) {
        console.warn("[link] Heartbeat timeout, reconnecting...");
        this.ws?.close();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= MAX_RECONNECT) {
      this.emit({ type: "error", error: "Connection lost. Please refresh." });
      return;
    }
    this.reconnectAttempts++;
    const base = Math.min(BASE_RECONNECT_DELAY * Math.pow(1.5, this.reconnectAttempts - 1), MAX_RECONNECT_DELAY);
    const jitter = base * (0.7 + Math.random() * 0.3);
    console.log(`[link] Reconnecting in ${Math.round(jitter / 1000)}s (attempt ${this.reconnectAttempts}/${MAX_RECONNECT})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, jitter);
  }
}
