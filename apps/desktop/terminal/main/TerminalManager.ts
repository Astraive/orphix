import { EventEmitter } from 'node:events';
import os from 'node:os';
import * as pty from 'node-pty';
import type { IPty } from 'node-pty';
import type {
  CreateTerminalRequest,
  KillTerminalRequest,
  ResizeTerminalRequest,
  TerminalExitEvent,
  TerminalOutputEvent,
  TerminalSessionSnapshot,
  TerminalStateEvent,
  WriteTerminalRequest,
  ShellInfo,
} from '../shared/types';
import { listShells, resolveShell } from './shell/resolveShell';
import { buildPtyEnv } from './utils/env';

const EVENTS = {
  output: 'output',
  exit: 'exit',
  state: 'state',
  error: 'error',
} as const;

const MIN_DIM = 2;

function normalizeDimension(value: number): number {
  return Math.max(MIN_DIM, Math.floor(value));
}

interface SessionRecord {
  pty: IPty;
  snapshot: TerminalSessionSnapshot;
}

export class TerminalManager {
  private sessions = new Map<string, SessionRecord>();
  private events = new EventEmitter();

  createTerminal(request: CreateTerminalRequest): TerminalSessionSnapshot {
    const existing = this.sessions.get(request.terminalId);
    if (existing) return { ...existing.snapshot };

    const requestedProfileId = request.profileId ?? request.shell;
    const shell = resolveShell(process.platform, process.env, requestedProfileId);
    const cols = normalizeDimension(request.cols);
    const rows = normalizeDimension(request.rows);
    const cwd = request.cwd || os.homedir();

    let ptyProcess: IPty;
    try {
      ptyProcess = pty.spawn(shell.command, shell.args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: buildPtyEnv(),
        useConpty: process.platform === 'win32',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.events.emit(EVENTS.error, { terminalId: request.terminalId, message });
      throw new Error(`Failed to spawn terminal: ${message}`);
    }

    const snapshot: TerminalSessionSnapshot = {
      terminalId: request.terminalId,
      pid: ptyProcess.pid,
      profileId: requestedProfileId,
      shell: shell.label,
      cwd,
      cols,
      rows,
      status: 'running',
    };

    const record: SessionRecord = { pty: ptyProcess, snapshot };
    this.sessions.set(request.terminalId, record);

    ptyProcess.onData((data) => {
      this.events.emit(EVENTS.output, {
        terminalId: request.terminalId,
        data,
      } satisfies TerminalOutputEvent);
    });

    ptyProcess.onExit(({ exitCode }) => {
      this.sessions.delete(request.terminalId);
      this.events.emit(EVENTS.exit, {
        terminalId: request.terminalId,
        exitCode,
      } satisfies TerminalExitEvent);
      this.events.emit(EVENTS.state, {
        terminalId: request.terminalId,
        snapshot: { ...snapshot, status: 'exited', exitCode },
      } satisfies TerminalStateEvent);
    });

    this.events.emit(EVENTS.state, { terminalId: request.terminalId, snapshot } satisfies TerminalStateEvent);
    return { ...snapshot };
  }

  writeTerminal(request: WriteTerminalRequest): void {
    const session = this.sessions.get(request.terminalId);
    if (!session) throw new Error(`Terminal ${request.terminalId} not found`);
    session.pty.write(request.data);
  }

  resizeTerminal(request: ResizeTerminalRequest): void {
    const session = this.sessions.get(request.terminalId);
    if (!session) throw new Error(`Terminal ${request.terminalId} not found`);
    const cols = normalizeDimension(request.cols);
    const rows = normalizeDimension(request.rows);
    session.pty.resize(cols, rows);
    session.snapshot = { ...session.snapshot, cols, rows };
    this.events.emit(EVENTS.state, {
      terminalId: request.terminalId,
      snapshot: session.snapshot,
    } satisfies TerminalStateEvent);
  }

  killTerminal(request: KillTerminalRequest): void {
    const session = this.sessions.get(request.terminalId);
    if (!session) return;
    session.pty.kill();
  }

  killAll(): void {
    for (const session of this.sessions.values()) {
      session.pty.kill();
    }
    this.sessions.clear();
  }

  listTerminals(): TerminalSessionSnapshot[] {
    return [...this.sessions.values()].map((s) => ({ ...s.snapshot }));
  }

  listShells(): ShellInfo[] {
    return listShells(process.platform, process.env);
  }

  onOutput(listener: (event: TerminalOutputEvent) => void): () => void {
    this.events.on(EVENTS.output, listener);
    return () => this.events.off(EVENTS.output, listener);
  }

  onExit(listener: (event: TerminalExitEvent) => void): () => void {
    this.events.on(EVENTS.exit, listener);
    return () => this.events.off(EVENTS.exit, listener);
  }

  onState(listener: (event: TerminalStateEvent) => void): () => void {
    this.events.on(EVENTS.state, listener);
    return () => this.events.off(EVENTS.state, listener);
  }

  onError(listener: (event: { terminalId: string; message: string }) => void): () => void {
    this.events.on(EVENTS.error, listener);
    return () => this.events.off(EVENTS.error, listener);
  }
}
