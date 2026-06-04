// In-memory registry of connected Link sessions (one per connected device).
// Pure logic with an injectable clock so it is fully unit-testable and reusable
// from both the main process (authoritative tracking) and the renderer.

export type ActiveTransport = "p2p" | "relay" | "websocket" | "local";
export type SessionState = "pending" | "connected" | "disconnected";

export interface ManagedSession {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  transport: ActiveTransport;
  encrypted: boolean;
  mode: string;
  state: SessionState;
  connectedAt: number;
  lastSeenAt: number;
}

export interface SessionInput {
  id: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  transport?: ActiveTransport;
  encrypted?: boolean;
  mode?: string;
  state?: SessionState;
}

export class SessionManager {
  private readonly sessions = new Map<string, ManagedSession>();
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  /** Insert a new session or merge fields into an existing one (preserving connectedAt). */
  upsert(input: SessionInput): ManagedSession {
    const t = this.now();
    const prev = this.sessions.get(input.id);
    const merged: ManagedSession = {
      id: input.id,
      deviceId: input.deviceId ?? prev?.deviceId ?? "",
      deviceName: input.deviceName ?? prev?.deviceName ?? "Unknown device",
      deviceType: input.deviceType ?? prev?.deviceType ?? "unknown",
      transport: input.transport ?? prev?.transport ?? "websocket",
      encrypted: input.encrypted ?? prev?.encrypted ?? false,
      mode: input.mode ?? prev?.mode ?? "full_control",
      state: input.state ?? prev?.state ?? "connected",
      connectedAt: prev?.connectedAt ?? t,
      lastSeenAt: t,
    };
    this.sessions.set(input.id, merged);
    return merged;
  }

  /** Refresh lastSeenAt for liveness tracking. Returns false if unknown. */
  touch(id: string): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.lastSeenAt = this.now();
    return true;
  }

  setTransport(id: string, transport: ActiveTransport): boolean {
    return this.patch(id, { transport });
  }

  setEncrypted(id: string, encrypted: boolean): boolean {
    return this.patch(id, { encrypted });
  }

  setState(id: string, state: SessionState): boolean {
    return this.patch(id, { state });
  }

  private patch(id: string, fields: Partial<ManagedSession>): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    Object.assign(s, fields, { lastSeenAt: this.now() });
    return true;
  }

  get(id: string): ManagedSession | undefined {
    return this.sessions.get(id);
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  remove(id: string): boolean {
    return this.sessions.delete(id);
  }

  /** All sessions, oldest connection first. Returns copies to prevent mutation. */
  list(): ManagedSession[] {
    return [...this.sessions.values()]
      .sort((a, b) => a.connectedAt - b.connectedAt)
      .map((s) => ({ ...s }));
  }

  count(): number {
    return this.sessions.size;
  }

  countByTransport(): Record<ActiveTransport, number> {
    const out: Record<ActiveTransport, number> = { p2p: 0, relay: 0, websocket: 0, local: 0 };
    for (const s of this.sessions.values()) out[s.transport]++;
    return out;
  }

  /** Drop sessions not seen within ttlMs. Returns the removed session ids. */
  pruneStale(ttlMs: number): string[] {
    const cutoff = this.now() - ttlMs;
    const removed: string[] = [];
    for (const [id, s] of this.sessions) {
      if (s.lastSeenAt < cutoff) {
        this.sessions.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }

  clear(): void {
    this.sessions.clear();
  }
}
