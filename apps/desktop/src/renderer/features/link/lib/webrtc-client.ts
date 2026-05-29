/**
 * WebRTC client for the desktop renderer.
 *
 * Creates RTCPeerConnection, handles DataChannel for terminal I/O.
 * Terminal data flows: DataChannel ↔ renderer ↔ IPC ↔ main process ↔ PTY
 */

export interface RTCIceConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
}

interface WebRTCClientOptions {
  sessionId: string;
  iceConfig: RTCIceConfig;
  onSignal: (msg: Record<string, unknown>) => void;
  onDataChannelOpen: () => void;
  onDataChannelClose: () => void;
  onTerminalInput: (terminalId: string, data: string) => void;
  onTerminalAttach: (sessionId: string, terminalId: string) => void;
  onTerminalResize: (terminalId: string, cols: number, rows: number) => void;
}

export class WebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private options: WebRTCClientOptions;
  private isOfferer: boolean;
  private closed = false;
  private closeNotified = false;

  constructor(options: WebRTCClientOptions, isOfferer: boolean) {
    this.options = options;
    this.isOfferer = isOfferer;
  }

  async start(): Promise<void> {
    this.pc = new RTCPeerConnection({
      iceServers: this.options.iceConfig.iceServers,
      iceTransportPolicy: this.options.iceConfig.iceTransportPolicy ?? "all",
    });

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.options.onSignal({
          type: "webrtc.ice",
          sessionId: this.options.sessionId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log("[webrtc] connection state:", this.pc?.connectionState);
      if (this.pc?.connectionState === "failed") {
        this.close();
      }
    };

    if (this.isOfferer) {
      // Mobile is offerer (mobile initiates, desktop waits)
      // Desktop side: we wait for ondatachannel
      this.pc.ondatachannel = (e) => {
        this.setupDataChannel(e.channel);
      };
    } else {
      // Desktop creates the DataChannel (if desktop is offerer)
      this.dc = this.pc.createDataChannel("orphix-control", {
        ordered: true,
      });
      this.setupDataChannel(this.dc);
    }
  }

  async handleOffer(sdp: string): Promise<string> {
    if (!this.pc) throw new Error("WebRTC client not started");

    await this.pc.setRemoteDescription({ type: "offer", sdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    return answer.sdp!;
  }

  async handleAnswer(sdp: string): Promise<void> {
    if (!this.pc) throw new Error("WebRTC client not started");
    await this.pc.setRemoteDescription({ type: "answer", sdp });
  }

  async handleIce(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) throw new Error("WebRTC client not started");
    if (typeof candidate.candidate !== "string") return;
    await this.pc.addIceCandidate(candidate);
  }

  async createOffer(): Promise<string> {
    if (!this.pc) throw new Error("WebRTC client not started");

    // Desktop waits for offer from mobile, so this path is for mobile-initiated
    // But if desktop needs to be offerer:
    if (!this.dc) {
      this.dc = this.pc.createDataChannel("orphix-control", { ordered: true });
      this.setupDataChannel(this.dc);
    }

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer.sdp!;
  }

  sendTerminalOutput(data: string, terminalId?: string): void {
    if (this.dc?.readyState === "open") {
      if (terminalId) {
        this.dc.send(JSON.stringify({
          v: 1,
          session_id: this.options.sessionId,
          stream_id: terminalId,
          seq: Date.now(),
          kind: "terminal.stdout",
          flags: { encrypted: false, compressed: false },
          payload: { data },
        }));
        return;
      }
      this.dc.send(JSON.stringify({ type: "terminal.output", data }));
    }
  }

  sendTerminalState(sessionId: string, status: string): void {
    if (this.dc?.readyState === "open") {
      this.dc.send(JSON.stringify({ type: "terminal.state", sessionId, status }));
    }
  }

  sendTerminalExit(sessionId: string, exitCode: number | null): void {
    if (this.dc?.readyState === "open") {
      this.dc.send(JSON.stringify({ type: "terminal.exit", sessionId, exitCode }));
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    const dc = this.dc;
    if (dc) {
      dc.onopen = null;
      dc.onmessage = null;
      dc.onerror = null;
      dc.onclose = null;
      dc.close();
    }
    this.dc = null;
    const pc = this.pc;
    if (pc) {
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.ondatachannel = null;
      pc.close();
    }
    this.pc = null;
    this.notifyClosed();
  }

  get connectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null;
  }

  get dataChannelState(): string | null {
    return this.dc?.readyState ?? null;
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dc = channel;

    channel.onopen = () => {
      console.log("[webrtc] DataChannel open");
      this.options.onDataChannelOpen();
    };

    channel.onclose = () => {
      console.log("[webrtc] DataChannel closed");
      this.notifyClosed();
    };

    channel.onerror = (e) => {
      console.error("[webrtc] DataChannel error:", e);
    };

    channel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (typeof msg.kind === "string" && typeof msg.stream_id === "string") {
          if (msg.kind === "terminal.stdin") {
            this.options.onTerminalInput(msg.stream_id, String(msg.payload?.data ?? ""));
          } else if (msg.kind === "terminal.resize") {
            this.options.onTerminalResize(
              msg.stream_id,
              Number(msg.payload?.cols ?? 120),
              Number(msg.payload?.rows ?? 30),
            );
          }
          return;
        }
        switch (msg.type) {
          case "terminal.input":
            this.options.onTerminalInput(msg.terminalId ?? msg.sessionId, msg.data);
            break;
          case "terminal.attach":
            this.options.onTerminalAttach(msg.sessionId, msg.terminalId);
            break;
          case "terminal.resize":
            this.options.onTerminalResize(msg.terminalId ?? msg.sessionId, msg.cols, msg.rows);
            break;
        }
      } catch {
        // Binary or malformed data — ignore
      }
    };
  }

  private notifyClosed(): void {
    if (this.closeNotified) return;
    this.closeNotified = true;
    this.options.onDataChannelClose();
  }
}
