import { ipcMain, shell } from "electron";
import * as path from "path";
import * as fs from "fs";
import { CHANNELS } from "../../shared/ipc/channels";
import { startFileWatcher, stopFileWatcher } from "../system/file-watcher";
import type { CoreClient } from "../app/core-client";

export function registerFileIpc(client: CoreClient): void {
  ipcMain.handle(CHANNELS.FILE_LIST, async (_event, args: { path: string }) => {
    return client.fileList(args.path);
  });

  ipcMain.handle(CHANNELS.FILE_READ, async (_event, args: { path: string }) => {
    // Fast path: read directly via Node fs instead of round-tripping through orphix-core
    const resolved = path.resolve(args.path);
    const content = await fs.promises.readFile(resolved, "utf-8");
    return { content };
  });

  ipcMain.handle(CHANNELS.FILE_WRITE, async (_event, args: { path: string; content: string }) => {
    // Fast path: write directly via Node fs
    const resolved = path.resolve(args.path);
    await fs.promises.writeFile(resolved, args.content, "utf-8");
    return { success: true };
  });

  ipcMain.handle(CHANNELS.FILE_CREATE, async (_event, args: { path: string; isDir: boolean }) => {
    return client.fileCreate(args.path, args.isDir);
  });

  ipcMain.handle(CHANNELS.FILE_RENAME, async (_event, args: { oldPath: string; newPath: string }) => {
    return client.fileRename(args.oldPath, args.newPath);
  });

  ipcMain.handle(CHANNELS.FILE_DELETE, async (_event, args: { path: string }) => {
    return client.fileDelete(args.path);
  });

  ipcMain.handle(CHANNELS.FILE_COPY, async (_event, args: { srcPath: string; destPath: string }) => {
    return client.fileCopy(args.srcPath, args.destPath);
  });

  ipcMain.handle(CHANNELS.FILE_MOVE, async (_event, args: { srcPath: string; destPath: string }) => {
    return client.fileMove(args.srcPath, args.destPath);
  });

  ipcMain.handle(CHANNELS.FILE_STAT, async (_event, args: { path: string }) => {
    return client.fileStat(args.path);
  });

  ipcMain.handle(CHANNELS.FILE_WATCH, async (_event, args: { path: string }) => {
    startFileWatcher(args.path);
  });

  ipcMain.handle(CHANNELS.FILE_UNWATCH, async () => {
    stopFileWatcher();
  });

  ipcMain.handle(CHANNELS.FILE_OPEN_EXTERNAL, async (_event, args: { path: string }) => {
    const resolved = path.resolve(args.path);
    // Only allow opening files/dirs that exist — blocks arbitrary program execution
    const stat = await fs.promises.stat(resolved).catch(() => null);
    if (!stat || (!stat.isFile() && !stat.isDirectory())) {
      throw new Error("Path does not exist or is not a file/directory");
    }
    await shell.openPath(resolved);
  });

  ipcMain.handle(CHANNELS.FILE_REVEAL, async (_event, args: { path: string }) => {
    const resolved = path.resolve(args.path);
    shell.showItemInFolder(resolved);
  });

  ipcMain.handle(CHANNELS.FILE_OPEN_TERMINAL, async (_event, args: { path: string }) => {
    const resolved = path.resolve(args.path);
    const stat = await fs.promises.stat(resolved).catch(() => null);
    const cwd = stat?.isDirectory() ? resolved : path.dirname(resolved);
    // Terminal creation is handled by the terminal IPC — emit event for workspace to pick up
    const { BrowserWindow } = require("electron");
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send("file:open-terminal", { cwd });
  });
}
