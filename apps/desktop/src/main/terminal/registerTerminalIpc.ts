import { ipcMain, BrowserWindow } from 'electron';
import { TerminalManager } from './TerminalManager';
import { TERMINAL_CHANNELS } from '../../shared/terminal/terminal-ipc';
import type { CreateTerminalRequest, WriteTerminalRequest, ResizeTerminalRequest, KillTerminalRequest, TerminalSessionSnapshot, ShellInfo } from '../../shared/terminal/types';
import type { CoreClient } from '../app/core-client';
import type { TerminalSessionInfo, ShellInfoDto } from '../../shared/types/common';
import { assertTrustedSender, resolveWorkspacePath } from '../security/ipc-security';

const CHANNELS = TERMINAL_CHANNELS;

const VALID_TERMINAL_ID = /^[a-zA-Z0-9_-]+$/;
const MAX_COLS = 500;
const MAX_ROWS = 200;

function validateCreateRequest(request: CreateTerminalRequest, workspaceRoot: string): void {
  if (!request?.terminalId || typeof request.terminalId !== 'string') {
    throw new Error("terminal:create requires terminalId (string)");
  }
  if (!VALID_TERMINAL_ID.test(request.terminalId)) {
    throw new Error("terminal:create terminalId contains invalid characters");
  }
  if (request.cols != null && (request.cols < 1 || request.cols > MAX_COLS || !Number.isFinite(request.cols))) {
    throw new Error(`terminal:create cols must be 1-${MAX_COLS}`);
  }
  if (request.rows != null && (request.rows < 1 || request.rows > MAX_ROWS || !Number.isFinite(request.rows))) {
    throw new Error(`terminal:create rows must be 1-${MAX_ROWS}`);
  }
  if (request.cwd != null) {
    if (typeof request.cwd !== 'string') throw new Error("terminal:create cwd must be a string");
    request.cwd = resolveWorkspacePath(workspaceRoot, request.cwd);
  }
  if (request.command != null && typeof request.command !== 'string') {
    throw new Error("terminal:create command must be a string");
  }
}

function broadcast(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

function toSnapshot(info: TerminalSessionInfo, requested?: CreateTerminalRequest): TerminalSessionSnapshot {
  const status = info.status === 'failed'
    ? 'error'
    : info.status === 'killed'
      ? 'exited'
      : info.status;
  return {
    terminalId: info.id,
    pid: null,
    profileId: requested?.profileId ?? requested?.shell,
    shell: info.shell,
    cwd: info.cwd,
    cols: info.cols,
    rows: info.rows,
    status,
  };
}

function toShellInfo(shell: ShellInfoDto, index: number): ShellInfo {
  return {
    id: `${shell.program}-${index}`,
    command: shell.program,
    args: shell.args,
    label: shell.label,
    description: shell.program,
  };
}

export function registerTerminalIpc(manager: TerminalManager, workspaceRoot: string, coreClient?: CoreClient): void {
  // Forward events to renderer
  manager.onOutput((event) => broadcast(CHANNELS.output, event));
  manager.onExit((event) => broadcast(CHANNELS.exit, event));
  manager.onState((event) => broadcast(CHANNELS.state, event));
  manager.onError((event) => broadcast(CHANNELS.error, event));

  // IPC handlers
  ipcMain.handle(CHANNELS.create, async (event, request: CreateTerminalRequest) => {
    assertTrustedSender(event);
    validateCreateRequest(request, workspaceRoot);
    if (coreClient && !request.command) {
      const info = await coreClient.terminalCreate({
        terminal_id: request.terminalId,
        cwd: request.cwd,
        shell: request.shell ?? request.profileId,
        cols: request.cols,
        rows: request.rows,
        kind: 'shell',
      });
      return toSnapshot(info, request);
    }
    return manager.createTerminal(request);
  });

  ipcMain.handle(CHANNELS.write, async (event, request: WriteTerminalRequest) => {
    assertTrustedSender(event);
    if (!request?.terminalId || !VALID_TERMINAL_ID.test(request.terminalId)) {
      throw new Error("terminal:write requires valid terminalId");
    }
    if (typeof request.data !== 'string') {
      throw new Error("terminal:write requires data (string)");
    }
    if (manager.hasTerminal(request.terminalId)) {
      manager.writeTerminal(request);
      return;
    }
    await coreClient?.terminalWrite(request.terminalId, request.data);
  });

  ipcMain.handle(CHANNELS.resize, async (event, request: ResizeTerminalRequest) => {
    assertTrustedSender(event);
    if (!request?.terminalId || !VALID_TERMINAL_ID.test(request.terminalId)) {
      throw new Error("terminal:resize requires valid terminalId");
    }
    if (manager.hasTerminal(request.terminalId)) {
      manager.resizeTerminal(request);
      return;
    }
    await coreClient?.terminalResize(request.terminalId, request.cols, request.rows);
  });

  ipcMain.handle(CHANNELS.kill, async (event, request: KillTerminalRequest) => {
    assertTrustedSender(event);
    if (!request?.terminalId || !VALID_TERMINAL_ID.test(request.terminalId)) {
      throw new Error("terminal:kill requires valid terminalId");
    }
    if (manager.hasTerminal(request.terminalId)) {
      manager.killTerminal(request);
      return;
    }
    await coreClient?.terminalKill(request.terminalId);
  });

  ipcMain.handle(CHANNELS.list, async (event) => {
    assertTrustedSender(event);
    const local = manager.listTerminals();
    if (!coreClient) return local;
    const core = await coreClient.terminalList();
    return [...local, ...core.map((info) => toSnapshot(info))];
  });

  ipcMain.handle(CHANNELS.listShells, async (event) => {
    assertTrustedSender(event);
    if (!coreClient) return manager.listShells();
    try {
      const shells = await coreClient.terminalListShells();
      return shells.map(toShellInfo);
    } catch {
      return manager.listShells();
    }
  });
}
