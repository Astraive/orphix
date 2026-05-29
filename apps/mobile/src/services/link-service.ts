import * as SecureStore from "expo-secure-store";
import { getLinkUrl } from "@/lib/api";
import "react-native-webrtc";
import { LinkFrameFactory, isLinkFrame, type LinkFrame, type TransportMode, type ActiveTransport } from "@orphix/types";

// ── Types ──

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

export interface TerminalNode {
  id: string;
  name: string;
  status: string;
}

export interface WindowNode {
  id: string;
  name: string;
  terminals: TerminalNode[];
}

export interface WorkspaceNode {
  id: string;
  name: string;
  windows: WindowNode[];
}

type LinkServiceEvent =
  | { type: "state"; state: LinkServiceState }
  | { type: "error"; error: string }
  | { type: "terminal.output"; data: string }
  | { type: "terminal.state"; sessionId: string; status: string }
  | { type: "terminal.exit"; sessionId: string; exitCode: number | null }
  | { type: "terminal.attached"; sessionId: string }
  | { type: "workspace.list"; workspaces: WorkspaceNode[] };

type Listener = (event: LinkServiceEvent) => void;

// ── Device Identity (simplified — Ed25519 via noble) ──

interface DeviceIdentity {
  deviceId: string;
}

const DEVICE_ID_KEY = "orphix_device_id";

async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

  if (deviceId) {
    return { deviceId };
  }

  // Generate a unique device ID. Mobile uses JWT-only auth (mobile.hello),
  // so no Ed25519 keys are needed.
  deviceId = `mob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);

  return { deviceId };
}

// ── ICE Config ──

interface RTCIceConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: string;
}

async function fetchIceConfig(linkUrl: string): Promise<RTCIceConfig> {
  const res = await fetch(`${linkUrl}/v1/link/ice-config`);
  return res.json();
}

// ── Link Service ──

export class LinkService {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private state: LinkServiceState = "idle";
  private listeners: Set<Listener> = new Set();
  private identity: DeviceIdentity | null = null;
  private linkUrl: string;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
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
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 5000;

  constructor() {
    this.linkUrl = getLinkUrl().replace("http", "ws");
  }

  // ── Event system ──

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: LinkServiceEvent): void {
    for (const l of this.listeners) l(event);
  }

  private setState(state: LinkServiceState): void {
    this.state = state;
    this.emit({ type: "state", state });
  }

  getState(): LinkServiceState {
    return this.state;
  }

  getAttachedTerminalId(): string | null {
    return this.attachedTerminalId;
  }

  // ── Connection ──

  async connect(): Promise<void> {
    if (this.ws) return;
    if (this.rejectedByServer) {
      console.log("[link-service] Not reconnecting — rejected by server");
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[link-service] Max reconnect attempts reached");
      this.emit({ type: "error", error: "Connection failed after max retries" });
      return;
    }

    this.setState("connecting");
    this.identity = await getOrCreateDeviceIdentity();

    const token = await SecureStore.getItemAsync("orphix_access_token");
    if (!token) {
      this.emit({ type: "error", error: "Not authenticated" });
      this.setState("error");
      return;
    }

    try {
      this.ws = new WebSocket(`${this.linkUrl}/v1/link/mobile`);

      this.ws.onopen = () => {
        console.log("[link-service] Connected to link API");
        this.setState("connected");
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg, token);
        } catch (err) {
          console.error("[link-service] Failed to parse message:", err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[link-service] Disconnected (code: ${event.code})`);
        this.ws = null;
        this.stopHeartbeat();

        if (this.intentionalClose) {
          this.setState("disconnected");
          this.intentionalClose = false;
          return;
        }

        this.setState("disconnected");
        // Don't reconnect if server rejected us or explicit close code
        if (!this.rejectedByServer && event.code !== 4000) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error("[link-service] WebSocket error:", err);
        this.emit({ type: "error", error: "Connection failed" });
      };
    } catch (err) {
      console.error("[link-service] Failed to connect:", err);
      this.setState("error");
      this.scheduleReconnect();
    }
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
    this.linkedDesktopId = null;
    this.closeWebRTC();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState("disconnected");
  }

  // ── Link Request ──

  async requestLink(desktopDeviceId: string, mode: string = "full_control"): Promise<void> {
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
      workspaceId: null,
      windowId: null,
      terminalId: null,
    });

    this.setState("requesting");
  }

  createTerminal(cwd?: string, shell?: string, workspaceId?: string, windowId?: string): void {
    this.send({ type: "terminal.create", desktopDeviceId: this.linkedDesktopId, cwd, shell, workspaceId, windowId });
  }

  // ── WebRTC ──

  async startWebRTC(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    this.setState("p2p_connecting");

    try {
      const iceConfig = await fetchIceConfig(getLinkUrl());

      this.pc = new RTCPeerConnection({
        iceServers: iceConfig.iceServers,
        iceTransportPolicy: (iceConfig.iceTransportPolicy as RTCIceTransportPolicy) ?? "all",
      });

      this.pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.send({
            type: "webrtc.ice",
            sessionId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      this.pc.onconnectionstatechange = () => {
        console.log("[link-service] WebRTC connection state:", this.pc?.connectionState);
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
            console.log("[link-service] P2P failed — auto-switching to relay");
            this.startRelay(this.attachedTerminalId ?? "default");
          }
        }
      };

      // Mobile creates the DataChannel (mobile is offerer)
      this.dc = this.pc.createDataChannel("orphix-control", { ordered: true });
      this.setupDataChannel(this.dc);

      // Create offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      this.send({
        type: "webrtc.offer",
        sessionId,
        sdp: offer.sdp,
      });
    } catch (err) {
      console.error("[link-service] WebRTC setup failed:", err);
      this.setState("error");
    }
  }

  // Send terminal input over active transport
  sendTerminalInput(data: string): void {
    if (this.activeTransport === "websocket") {
      this.sendRelayInput(data);
      return;
    }
    if (this.dc?.readyState === "open" && this.attachedTerminalId) {
      this.sendFrameOverDataChannel("terminal.stdin", { data }, this.attachedTerminalId);
    }
  }

  // Attach to a specific terminal on the desktop
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

  // Send terminal resize
  sendTerminalResize(cols: number, rows: number): void {
    if (this.activeTransport === "websocket") {
      this.sendRelayResize(cols, rows);
      return;
    }
    if (this.dc?.readyState === "open" && this.attachedTerminalId) {
      this.sendFrameOverDataChannel("terminal.resize", { cols, rows }, this.attachedTerminalId);
    }
  }

  // ── Internals ──

  private handleMessage(msg: any, token: string): void {
    const type = msg.type as string;

    switch (type) {
      case "challenge": {
        // Use JWT-only auth path (mobile.hello) — no Ed25519 signature needed
        this.send({
          type: "mobile.hello",
          accessToken: token,
          deviceId: this.identity?.deviceId,
        });
        break;
      }

      case "hello.ack": {
        this.setState("authenticated");
        // Auto-recover: if we were previously linked, re-request
        if (this.linkedDesktopId) {
          this.requestLink(this.linkedDesktopId, this.linkedMode);
        }
        break;
      }

      case "hello.reject": {
        this.rejectedByServer = true;
        this.emit({ type: "error", error: msg.reason });
        this.setState("error");
        this.ws?.close();
        break;
      }

      case "link.pending": {
        this.setState("awaiting_approval");
        break;
      }

      case "link.approved": {
        const approvedSessionId = String(msg.sessionId);
        this.sessionId = approvedSessionId;
        this.frameFactory = new LinkFrameFactory(approvedSessionId, this.identity?.deviceId ?? "", this.linkedDesktopId ?? "");
        this.activeTransport = "websocket";
        if (this.transportMode === "websocket") {
          this.setState("p2p_connected");
        } else {
          this.startWebRTC(approvedSessionId);
        }
        break;
      }

      case "link.rejected": {
        this.emit({ type: "error", error: "Link rejected by desktop" });
        this.setState("authenticated");
        break;
      }

      case "webrtc.answer": {
        this.handleAnswer(msg.sdp);
        break;
      }

      case "webrtc.ice": {
        this.handleIce(msg.candidate);
        break;
      }

      case "relay.ready": {
        this.relayActive = true;
        this.emit({ type: "state", state: "p2p_connected" });
        break;
      }

      case "relay.terminal.output": {
        this.handleTransportFrame(msg.data);
        break;
      }

      case "relay.terminal.state": {
        this.emit({ type: "terminal.state", sessionId: msg.sessionId, status: msg.status });
        break;
      }

      case "relay.terminal.exit": {
        this.emit({ type: "terminal.exit", sessionId: msg.sessionId, exitCode: msg.exitCode });
        break;
      }

      case "workspace.list": {
        this.emit({ type: "workspace.list", workspaces: msg.workspaces });
        break;
      }

      case "pong": {
        // heartbeat response
        break;
      }
    }
  }

  private async handleAnswer(sdp: string): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.setRemoteDescription({ type: "answer", sdp });
    } catch (err) {
      console.error("[link-service] Failed to set answer:", err);
    }
  }

  private async handleIce(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      console.error("[link-service] Failed to add ICE candidate:", err);
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log("[link-service] DataChannel open");
      this.activeTransport = "webrtc";
      this.setState("p2p_connected");
    };

    channel.onclose = () => {
      console.log("[link-service] DataChannel closed");
    };

    channel.onerror = (e) => {
      console.error("[link-service] DataChannel error:", e);
    };

    channel.onmessage = (e) => {
      this.handleTransportFrame(e.data);
    };
  }

  private createFrame(kind: LinkFrame["kind"], payload: unknown, streamId = ""): string {
    if (!this.frameFactory && this.sessionId) {
      this.frameFactory = new LinkFrameFactory(this.sessionId, this.identity?.deviceId ?? "", this.linkedDesktopId ?? "");
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
        case "terminal.output":
          this.emit({ type: "terminal.output", data: msg.data });
          break;
        case "terminal.state":
          this.emit({ type: "terminal.state", sessionId: msg.sessionId, status: msg.status });
          break;
        case "terminal.exit":
          this.emit({ type: "terminal.exit", sessionId: msg.sessionId, exitCode: msg.exitCode });
          break;
      }
    } catch {
      this.emit({ type: "terminal.output", data });
    }
  }

  private closeWebRTC(): void {
    this.dc?.close();
    this.dc = null;
    this.pc?.close();
    this.pc = null;
    this.attachedTerminalId = null;
  }

  // ── Relay transport ──

  /** Start relay mode — request apis/link to relay terminal I/O */
  startRelay(terminalId: string): void {
    if (!this.sessionId) return;
    this.activeTransport = "websocket";
    this.attachedTerminalId = terminalId;
    this.send({
      type: "relay.start",
      sessionId: this.sessionId,
      terminalId,
      transportMode: "websocket",
    });
  }

  /** Send terminal input via relay (when transport === "relay") */
  private sendRelayInput(data: string): void {
    if (!this.sessionId || !this.attachedTerminalId) return;
    this.send({
      type: "relay.message",
      sessionId: this.sessionId,
      terminalId: this.attachedTerminalId,
      data: this.createFrame("terminal.stdin", { data }, this.attachedTerminalId),
      direction: "input",
    });
  }

  /** Send terminal resize via relay */
  private sendRelayResize(cols: number, rows: number): void {
    if (!this.sessionId || !this.attachedTerminalId) return;
    this.send({
      type: "relay.message",
      sessionId: this.sessionId,
      terminalId: this.attachedTerminalId,
      data: this.createFrame("terminal.resize", { cols, rows }, this.attachedTerminalId),
      direction: "input",
    });
  }

  /** Switch transport mode */
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

  get isP2PConnected(): boolean {
    return this.dc?.readyState === "open";
  }

  get isRelayActive(): boolean {
    return this.relayActive && this.activeTransport === "websocket";
  }

  private send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "ping", ts: Date.now() });
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    // Exponential backoff: 5s → 10s → 20s → 40s → 60s (cap) with jitter
    const base = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 60_000);
    const jitter = base * (0.5 + Math.random() * 0.5); // 50-100% of base
    console.log(`[link-service] Reconnecting in ${Math.round(jitter)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, jitter);
  }
}
