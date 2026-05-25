import { ipcMain, BrowserWindow } from 'electron';
import { TerminalManager } from './TerminalManager';
import type { CreateTerminalRequest, WriteTerminalRequest, ResizeTerminalRequest, KillTerminalRequest } from '../shared/types';

const CHANNELS = {
  create: 'terminal:create',
  write: 'terminal:write',
  resize: 'terminal:resize',
  kill: 'terminal:kill',
  list: 'terminal:list',
  listShells: 'terminal:list-shells',
  output: 'terminal:output',
  exit: 'terminal:exit',
  state: 'terminal:state',
  error: 'terminal:error',
};

function broadcast(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

export function registerTerminalIpc(manager: TerminalManager): void {
  // Forward events to renderer
  manager.onOutput((event) => broadcast(CHANNELS.output, event));
  manager.onExit((event) => broadcast(CHANNELS.exit, event));
  manager.onState((event) => broadcast(CHANNELS.state, event));
  manager.onError((event) => broadcast(CHANNELS.error, event));

  // IPC handlers
  ipcMain.handle(CHANNELS.create, async (_event, request: CreateTerminalRequest) => {
    if (!request?.terminalId) throw new Error("terminal:create requires terminalId");
    return manager.createTerminal(request);
  });

  ipcMain.handle(CHANNELS.write, async (_event, request: WriteTerminalRequest) => {
    if (!request?.terminalId) throw new Error("terminal:write requires terminalId");
    manager.writeTerminal(request);
  });

  ipcMain.handle(CHANNELS.resize, async (_event, request: ResizeTerminalRequest) => {
    if (!request?.terminalId) throw new Error("terminal:resize requires terminalId");
    manager.resizeTerminal(request);
  });

  ipcMain.handle(CHANNELS.kill, async (_event, request: KillTerminalRequest) => {
    if (!request?.terminalId) throw new Error("terminal:kill requires terminalId");
    manager.killTerminal(request);
  });

  ipcMain.handle(CHANNELS.list, async () => {
    return manager.listTerminals();
  });

  ipcMain.handle(CHANNELS.listShells, async () => {
    return manager.listShells();
  });
}
