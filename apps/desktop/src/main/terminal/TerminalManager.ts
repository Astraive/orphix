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
} from '../../shared/terminal/types';
import { listShells, resolveShell } from './shell/resolveShell';
import { buildPtyEnv } from './utils/env';
import {
  consumeTerminalInputData,
  resolveNextCwdFromCommand,
} from './utils/cwd-tracking';
import { isExistingDirectory } from './utils/safe-path';

const EVENTS = {
  output: 'output',
  exit: 'exit',
  state: 'state',
  error: 'error',
} as const;

const MIN_DIM = 2;
const MAX_DIRECT_WRITE_BYTES = 4096;

function normalizeDimension(value: number): number {
  return Math.max(MIN_DIM, Math.floor(value));
}

function writePtyData(ptyProcess: IPty, data: string): void {
  if (data.length <= MAX_DIRECT_WRITE_BYTES) {
    ptyProcess.write(data);
    return;
  }

  for (let index = 0; index < data.length; index += MAX_DIRECT_WRITE_BYTES) {
    const chunk = data.slice(index, index + MAX_DIRECT_WRITE_BYTES);
    setTimeout(() => ptyProcess.write(chunk), Math.floor(index / MAX_DIRECT_WRITE_BYTES));
  }
}

interface SessionRecord {
  pty: IPty;
  snapshot: TerminalSessionSnapshot;
  inputBuffer: string;
}

export class TerminalManager {
  private sessions = new Map<string, SessionRecord>();
  private events = new EventEmitter();

  constructor(private defaultCwd: string) {}

  createTerminal(request: CreateTerminalRequest): TerminalSessionSnapshot {
    const existing = this.sessions.get(request.terminalId);
    if (existing) return { ...existing.snapshot };

    const cols = normalizeDimension(request.cols);
    const rows = normalizeDimension(request.rows);
    const requestedCwd = request.cwd || this.defaultCwd || os.homedir();
    const cwd = isExistingDirectory(requestedCwd) ? requestedCwd : os.homedir();

    let spawnCommand: string;
    let spawnArgs: string[];
    let shellLabel: string;

    if (request.command) {
      // Direct command override (e.g., docker exec)
      spawnCommand = request.command;
      spawnArgs = request.args ?? [];
      shellLabel = request.command;
    } else {
      const requestedProfileId = request.profileId ?? request.shell;
      const shell = resolveShell(process.platform, process.env, requestedProfileId);
      spawnCommand = shell.command;
      spawnArgs = shell.args;
      shellLabel = shell.label;
    }

    let ptyProcess: IPty;
    try {
      ptyProcess = pty.spawn(spawnCommand, spawnArgs, {
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
      profileId: request.profileId ?? request.shell,
      shell: shellLabel,
      cwd,
      cols,
      rows,
      status: 'running',
    };

    const record: SessionRecord = { pty: ptyProcess, snapshot, inputBuffer: '' };
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
    try {
      session.inputBuffer = consumeTerminalInputData(session.inputBuffer, request.data, (commandLine) => {
        const nextCwd = resolveNextCwdFromCommand(
          commandLine,
          session.snapshot.cwd,
          os.homedir(),
          process.platform,
        );
        if (!nextCwd || nextCwd === session.snapshot.cwd || !isExistingDirectory(nextCwd)) {
          return;
        }
        this.updateSessionCwd(session, nextCwd);
      });
    } catch (error) {
      session.inputBuffer = "";
    }
    writePtyData(session.pty, request.data);
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

  private updateSessionCwd(session: SessionRecord, cwd: string): void {
    session.snapshot = { ...session.snapshot, cwd };
    this.events.emit(EVENTS.state, {
      terminalId: session.snapshot.terminalId,
      snapshot: session.snapshot,
    } satisfies TerminalStateEvent);
  }
}
