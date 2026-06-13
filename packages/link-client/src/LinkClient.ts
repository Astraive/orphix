import {
  LinkFrameFactory,
  isLinkFrame,
  normalizeWorkspaceListPayload,
  type ActiveTransport,
  type LinkFrame,
  type TransportMode,
  type WorkspaceListPayload,
  type WorkspaceSnapshotNode,
} from "@orphix/types";
import type {
  LinkClientState,
  LinkClientEvent,
  LinkClientOptions,
  TokenStore,
} from "./types.js";

const HEARTBEAT_INTERVAL = 15_000;
const HEARTBEAT_TIMEOUT = 45_000;
const DEFAULT_MAX_RECONNECT = 15;
const DEFAULT_BASE_DELAY = 2_000;
const MAX_RECONNECT_DELAY = 60_000;

type Listener = (event: LinkClientEvent) => void;

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

export class LinkClient {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private state: LinkClientState = "idle";
  private listeners: Set<Listener> = new Set();
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
  private relayedTerminalId: string | null = null;
  private rpcPending = new Map<
    string,
    { resolve: (data: any) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  private readonly opts: Required<Pick<LinkClientOptions, "maxReconnectAttempts" | "baseReconnectDelay">> &
    LinkClientOptions;

  constructor(options: LinkClientOptions) {
    this.opts = {
      ...options,
      maxReconnectAttempts: options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT,
      baseReconnectDelay: options.baseReconnectDelay ?? DEFAULT_BASE_DELAY,
    };
  }

  // ── Event system ──

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: LinkClientEvent): void {
    for (const l of this.listeners) l(event);
  }

  private setState(state: LinkClientState): void {
    console.log(`[link-client] state: ${this.state} → ${state}`);
    this.state = state;
    this.emit({ type: "state", state });
  }

  getState(): LinkClientState {
    return this.state;
  }

  getAttachedTerminalId(): string | null {
    return this.attachedTerminalId;
  }

  get isP2PConnected(): boolean {
    return this.dc?.readyState === "open";
  }

  get isRelayActive(): boolean {
    return this.relayActive && this.activeTransport === "websocket";
  }

  // ── Connection ──

  async connect(): Promise<void> {
    if (this.ws) return;
    if (this.rejectedByServer) return;
    if (this.intentionalClose) return;

    this.token = await this.opts.tokenStore.getAccessToken();
    if (!this.token) {
      this.emit({ type: "error", error: "Not authenticated" });
      this.setState("error");
      return;
    }

    this.setState("connecting");

    const wsUrl = this.opts.linkUrl.replace(/^http/, "ws");
    const wsCtor = this.opts.wsConstructor;
    this.ws = new wsCtor(`${wsUrl}/v1/link/mobile`);

    const authPromise = new Promise<void>((resolve, reject) => {
      this.authResolve = resolve;
      this.authReject = reject;

      const authTimeout = setTimeout(() => {
        if (this.authReject) {
          this.authReject(new Error("Authentication timeout"));
          this.authResolve = null;
          this.authReject = null;
          this.ws?.close();
        }
      }, 15_000);

      const origResolve = this.authResolve;
      const origReject = this.authReject;
      this.authResolve = () => {
        clearTimeout(authTimeout);
        origResolve();
      };
      this.authReject = (err: Error) => {
        clearTimeout(authTimeout);
        origReject(err);
      };
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
        console.error("[link-client] Failed to parse message:", err);
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

      this.setState("disconnected");
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

  // ── Link Request ──

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
    this.send({
      type: "link.request",
      desktopDeviceId,
      mode,
      transportMode: this.transportMode,
      deviceName: this.opts.deviceName,
      workspaceId: null,
      windowId: null,
      terminalId: null,
    });
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
    if (this.attachedTerminalId === terminalId) return;
    this.attachedTerminalId = terminalId;

    if (this.activeTransport === "websocket" || this.activeTransport === "pending") {
      this.startRelay(terminalId);
      return;
    }
    if (this.dc?.readyState === "open") {
      this.dc.send(
        JSON.stringify({ type: "terminal.attach", sessionId: this.sessionId, terminalId }),
      );
      this.emit({ type: "terminal.attached", sessionId: terminalId });
    }
  }

  // ── RPC ──

  async rpc(method: string, params: Record<string, any> = {}, cwd?: string): Promise<any> {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = { type: method, id, cwd, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.rpcPending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, 30_000);

      this.rpcPending.set(id, { resolve, reject, timer });
      this.send({
        type: "relay.message",
        sessionId: this.sessionId,
        terminalId: this.attachedTerminalId ?? "default",
        data: JSON.stringify(payload),
        direction: "input",
      });
    });
  }

  // ── Terminal I/O ──

  sendTerminalInput(data: string): void {
    if (this.dc?.readyState === "open" && this.attachedTerminalId) {
      this.sendFrameOverDataChannel("terminal.stdin", { data }, this.attachedTerminalId);
      return;
    }
    this.sendRelayInput(data);
  }

  sendTerminalResize(cols: number, rows: number): void {
    if (this.dc?.readyState === "open" && this.attachedTerminalId) {
      this.sendFrameOverDataChannel("terminal.resize", { cols, rows }, this.attachedTerminalId);
      return;
    }
    this.sendRelayResize(cols, rows);
  }

  // ── Transport ──

  setTransport(mode: "direct" | "relay"): void {
    this.setTransportMode(mode === "relay" ? "websocket" : "webrtc");
  }

  getTransport(): "direct" | "relay" {
    return this.activeTransport === "websocket" ? "relay" : "direct";
  }

  setTransportMode(mode: TransportMode): void {
    this.transportMode = mode;
    if (mode === "websocket") {
      this.activeTransport = "websocket";
      this.closeWebRTC();
      if (this.attachedTerminalId) {
        this.startRelay(this.attachedTerminalId);
      }
    }
    if (mode === "webrtc") {
      if (this.pc?.connectionState === "connected") {
        this.activeTransport = "webrtc";
        if (this.attachedTerminalId && this.dc?.readyState === "open") {
          this.dc.send(
            JSON.stringify({
              type: "terminal.attach",
              sessionId: this.sessionId,
              terminalId: this.attachedTerminalId,
            }),
          );
        }
      } else if (this.pc?.connectionState === "connecting" || this.pc?.connectionState === "new") {
        this.activeTransport = "pending";
      } else {
        this.activeTransport = "pending";
        if (this.sessionId) {
          this.tryWebRTCUpgrade(this.sessionId);
        }
      }
    }
  }

  // ── Internals ──

  private handleMessage(msg: Record<string, unknown>): void {
    const type = msg.type as string;
    console.log(`[link-client] recv: ${type}`);

    switch (type) {
      case "challenge": {
        const helloMsg =
          this.opts.authMethod === "web.hello"
            ? { type: "web.hello", accessToken: this.token, deviceId: this.opts.generateDeviceId() }
            : { type: "mobile.hello", accessToken: this.token, deviceId: this.opts.generateDeviceId() };
        this.send(helloMsg);
        break;
      }

      case "hello.ack":
        this.setState("authenticated");
        this.authResolve?.();
        this.authResolve = null;
        this.authReject = null;
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
        this.frameFactory = new LinkFrameFactory(
          this.sessionId,
          this.opts.generateDeviceId(),
          this.linkedDesktopId ?? "",
        );
        this.activeTransport = "websocket";
        this.setState("p2p_connected");
        this.startRelay(this.attachedTerminalId ?? "default");
        if (this.transportMode !== "websocket") {
          this.tryWebRTCUpgrade(msg.sessionId as string);
        }
        break;

      case "link.rejected":
        this.emit({ type: "error", error: (msg.reason as string) || "Link rejected by desktop" });
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
        this.emit({
          type: "terminal.state",
          sessionId: msg.sessionId as string,
          status: msg.status as string,
        });
        break;

      case "relay.terminal.exit":
        this.emit({
          type: "terminal.exit",
          sessionId: msg.sessionId as string,
          exitCode: msg.exitCode as number | null,
        });
        break;

      case "workspace.list":
        this.emit({
          type: "workspace.list",
          payload: normalizeWorkspaceListPayload({
            snapshotVersion:
              typeof msg.snapshotVersion === "number" ? msg.snapshotVersion : undefined,
            workspaces: msg.workspaces as WorkspaceSnapshotNode[],
            browserSessions: msg.browserSessions as WorkspaceListPayload["browserSessions"],
            capabilities: msg.capabilities,
          }),
        });
        break;

      case "pong":
        this.lastPongAt = Date.now();
        break;
    }
  }

  private async handleAnswer(sdp: string): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.setRemoteDescription({ type: "answer", sdp });
    } catch (err) {
      console.error("[link-client] Failed to set answer:", err);
    }
  }

  private async handleIce(candidate: unknown): Promise<void> {
    if (!this.pc) return;
    const normalized = normalizeIceCandidate(candidate);
    if (!normalized) return;
    try {
      await this.pc.addIceCandidate(normalized);
    } catch (err) {
      console.error("[link-client] Failed to add ICE candidate:", err);
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.activeTransport = "webrtc";
      this.setState("p2p_connected");
      if (this.attachedTerminalId) {
        channel.send(
          JSON.stringify({
            type: "terminal.attach",
            sessionId: this.sessionId,
            terminalId: this.attachedTerminalId,
          }),
        );
        this.emit({ type: "terminal.attached", sessionId: this.attachedTerminalId });
      }
    };
    channel.onmessage = (e) => {
      this.handleTransportFrame(e.data);
    };
  }

  private createFrame(kind: LinkFrame["kind"], payload: unknown, streamId = ""): string {
    if (!this.frameFactory && this.sessionId) {
      this.frameFactory = new LinkFrameFactory(
        this.sessionId,
        this.opts.generateDeviceId(),
        this.linkedDesktopId ?? "",
      );
    }
    return JSON.stringify(
      this.frameFactory?.create(kind, payload, streamId, {
        activeTransport: this.activeTransport,
        requestedMode: this.transportMode,
      }),
    );
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
          this.emit({
            type: "terminal.exit",
            sessionId: msg.stream_id,
            exitCode: (msg.payload as any).exitCode ?? null,
          });
        }
        return;
      }
      if (msg.type && msg.type.endsWith(".response") && msg.id) {
        this.handleRpcResponse(msg);
        return;
      }
      switch (msg.type) {
        case "terminal.output":
          this.emit({ type: "terminal.output", data: msg.data });
          break;
        case "terminal.state":
          this.emit({ type: "terminal.state", sessionId: msg.sessionId, status: msg.status });
          break;
        case "terminal.exit":
          this.emit({ type: "terminal.exit", sessionId: msg.sessionId, exitCode: msg.exitCode });
          break;
        case "workspace.list":
          this.emit({ type: "workspace.list", payload: normalizeWorkspaceListPayload(msg) });
          break;
      }
    } catch {
      this.emit({ type: "terminal.output", data });
    }
  }

  private handleRpcResponse(msg: Record<string, unknown>): void {
    const id = msg.id as string;
    if (!id) return;
    const pending = this.rpcPending.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.rpcPending.delete(id);
    pending.resolve(msg.data ?? msg);
  }

  private closeWebRTC(): void {
    this.dc?.close();
    this.dc = null;
    this.pc?.close();
    this.pc = null;
  }

  private startRelay(terminalId: string): void {
    if (!this.sessionId) return;
    this.activeTransport = "websocket";
    this.attachedTerminalId = terminalId;
    if (this.relayedTerminalId !== terminalId) {
      this.relayedTerminalId = terminalId;
      this.send({
        type: "relay.start",
        sessionId: this.sessionId,
        terminalId,
        transportMode: "websocket",
      });
    }
  }

  private sendRelayInput(data: string): void {
    if (!this.sessionId || !this.attachedTerminalId) return;
    this.send({
      type: "relay.message",
      sessionId: this.sessionId,
      terminalId: this.attachedTerminalId,
      data,
      direction: "input",
    });
  }

  private sendRelayResize(cols: number, rows: number): void {
    if (!this.sessionId || !this.attachedTerminalId) return;
    this.send({
      type: "relay.message",
      sessionId: this.sessionId,
      terminalId: this.attachedTerminalId,
      data: JSON.stringify({ type: "resize", cols, rows }),
      direction: "input",
    });
  }

  private async tryWebRTCUpgrade(sessionId: string): Promise<void> {
    if (
      this.pc &&
      (this.pc.connectionState === "connected" ||
        this.pc.connectionState === "connecting" ||
        this.pc.connectionState === "new")
    ) {
      return;
    }
    this.closeWebRTC();

    try {
      const httpLinkUrl = this.opts.linkUrl.replace(/^ws/, "http");
      const res = await fetch(`${httpLinkUrl}/v1/link/ice-config`);
      const iceConfig = await res.json().catch(() => ({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      }));

      this.pc = new RTCPeerConnection({
        iceServers: iceConfig.iceServers,
        iceTransportPolicy: iceConfig.iceTransportPolicy ?? "all",
      });

      const timeout = setTimeout(() => {
        if (this.pc && this.pc.connectionState !== "connected") {
          console.log("[link-client] WebRTC upgrade timed out");
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
          console.log("[link-client] WebRTC P2P connected");
          if (this.attachedTerminalId && this.dc?.readyState === "open") {
            this.dc.send(
              JSON.stringify({
                type: "terminal.attach",
                sessionId,
                terminalId: this.attachedTerminalId,
              }),
            );
          }
        }
      };

      this.dc = this.pc.createDataChannel("orphix-control", { ordered: true });
      this.setupDataChannel(this.dc);

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.send({ type: "webrtc.offer", sessionId, sdp: offer.sdp });
    } catch (err) {
      console.log("[link-client] WebRTC upgrade failed:", err);
    }
  }

  private send(msg: object): void {
    const WsCtor = this.opts.wsConstructor;
    if (this.ws?.readyState === WsCtor.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      const WsCtor = this.opts.wsConstructor;
      if (this.ws?.readyState !== WsCtor.OPEN) return;
      this.send({ type: "ping", ts: Date.now() });
      if (Date.now() - this.lastPongAt > HEARTBEAT_TIMEOUT) {
        console.warn("[link-client] Heartbeat timeout, reconnecting...");
        this.ws?.close();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.opts.maxReconnectAttempts) {
      this.emit({ type: "error", error: "Connection lost. Please refresh." });
      return;
    }
    this.reconnectAttempts++;
    const base = Math.min(
      this.opts.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY,
    );
    const jitter = base * (0.7 + Math.random() * 0.3);
    console.log(
      `[link-client] Reconnecting in ${Math.round(jitter / 1000)}s (attempt ${this.reconnectAttempts}/${this.opts.maxReconnectAttempts})`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, jitter);
  }
}
