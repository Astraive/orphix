import type { ActiveTransport, TransportMode } from "./link";

export type LinkFrameKind =
  | "session.hello"
  | "session.resume"
  | "session.heartbeat"
  | "session.close"
  | "transport.webrtc.offer"
  | "transport.webrtc.answer"
  | "transport.webrtc.ice"
  | "transport.fallback.begin"
  | "terminal.create"
  | "terminal.stdin"
  | "terminal.stdout"
  | "terminal.resize"
  | "terminal.exit"
  | "file.read"
  | "file.write"
  | "file.chunk"
  | "file.done"
  | "rpc.request"
  | "rpc.response"
  | "rpc.error";

export interface LinkFrameFlags {
  encrypted: boolean;
  compressed: boolean;
}

export interface LinkRelayMetadata {
  activeTransport?: ActiveTransport;
  requestedMode?: TransportMode;
  packetSize?: number;
}

export interface LinkFrame<TPayload = unknown> {
  v: 1;
  session_id: string;
  stream_id: string;
  seq: number;
  kind: LinkFrameKind;
  from_peer: string;
  to_peer: string;
  flags: LinkFrameFlags;
  relay?: LinkRelayMetadata;
  payload: TPayload;
}

export class LinkFrameFactory {
  private seq = 0;

  constructor(
    private readonly sessionId: string,
    private readonly fromPeer: string,
    private readonly toPeer: string,
  ) {}

  create<TPayload>(
    kind: LinkFrameKind,
    payload: TPayload,
    streamId = "",
    relay?: LinkRelayMetadata,
  ): LinkFrame<TPayload> {
    this.seq += 1;
    return {
      v: 1,
      session_id: this.sessionId,
      stream_id: streamId,
      seq: this.seq,
      kind,
      from_peer: this.fromPeer,
      to_peer: this.toPeer,
      flags: { encrypted: false, compressed: false },
      relay,
      payload,
    };
  }
}

export function encodeLinkFrame(frame: LinkFrame): string {
  return JSON.stringify(frame);
}

export function decodeLinkFrame(data: string): LinkFrame {
  return JSON.parse(data) as LinkFrame;
}

export function isLinkFrame(value: unknown): value is LinkFrame {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as LinkFrame).v === 1 &&
      typeof (value as LinkFrame).session_id === "string" &&
      typeof (value as LinkFrame).kind === "string" &&
      "payload" in value,
  );
}
