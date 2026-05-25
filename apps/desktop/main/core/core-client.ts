import { EventEmitter } from "events";
import type {
  CreateTerminalRequest,
  TerminalSessionInfo,
  TerminalOutputChunk,
  AttachSnapshot,
  ShellInfoDto,
} from "../../shared/types";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface CoreMessage {
  id?: string;
  result?: unknown;
  error?: string;
  event?: string;
  data?: unknown;
}

export class CoreClient extends EventEmitter {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestId = 0;
  private buffer = "";

  constructor(
    private send: (message: string) => void,
    onMessage: (handler: (data: Buffer) => void) => void,
  ) {
    super();
    onMessage((data: Buffer) => this.handleMessage(data));
  }

  private handleMessage(data: Buffer): void {
    this.buffer += data.toString();
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg: CoreMessage = JSON.parse(line);
        if (msg.id && (msg.result !== undefined || msg.error)) {
          const pending = this.pendingRequests.get(msg.id);
          if (pending) {
            this.pendingRequests.delete(msg.id);
            if (msg.error) {
              pending.reject(new Error(msg.error));
            } else {
              pending.resolve(msg.result);
            }
          }
        } else if (msg.event && msg.data !== undefined) {
          this.emit(msg.event, msg.data);
        }
      } catch (e) {
        console.error("Failed to parse core message:", e);
      }
    }
  }

  private request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = String(++this.requestId);
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.send(JSON.stringify({ id, method, params }));
    });
  }

  terminalCreate(request: CreateTerminalRequest): Promise<TerminalSessionInfo> {
    return this.request("terminal.create", request as unknown as Record<string, unknown>);
  }

  terminalWrite(sessionId: string, data: string): Promise<void> {
    return this.request("terminal.write", { session_id: sessionId, data });
  }

  terminalResize(sessionId: string, cols: number, rows: number): Promise<void> {
    return this.request("terminal.resize", { session_id: sessionId, cols, rows });
  }

  terminalKill(sessionId: string): Promise<void> {
    return this.request("terminal.kill", { session_id: sessionId });
  }

  terminalList(): Promise<TerminalSessionInfo[]> {
    return this.request("terminal.list");
  }

  terminalAttach(sessionId: string): Promise<AttachSnapshot> {
    return this.request("terminal.attach", { session_id: sessionId });
  }

  terminalOutputRange(sessionId: string, fromSeq: number, toSeq: number): Promise<TerminalOutputChunk[]> {
    return this.request("terminal.output_range", { session_id: sessionId, from_seq: fromSeq, to_seq: toSeq });
  }

  terminalListShells(): Promise<ShellInfoDto[]> {
    return this.request("terminal.list_shells");
  }

  systemHomeDir(): Promise<string> {
    return this.request("system.home_dir");
  }
}
