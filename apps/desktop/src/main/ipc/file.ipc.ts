import { ipcMain, shell } from "electron";
import * as path from "path";
import * as fs from "fs";
import { CHANNELS } from "../../shared/ipc/channels";
import { startFileWatcher, stopFileWatcher } from "../system/file-watcher";
import type { CoreClient } from "../app/core-client";
import { assertTrustedSender, resolveWorkspacePath } from "../security/ipc-security";

export function registerFileIpc(client: CoreClient, workspaceRoot: string): void {
  const safePath = (candidate: string) => resolveWorkspacePath(workspaceRoot, candidate);

  ipcMain.handle(CHANNELS.FILE_LIST, async (event, args: { path: string }) => {
    assertTrustedSender(event);
    return client.fileList(safePath(args.path));
  });

  ipcMain.handle(CHANNELS.FILE_READ, async (event, args: { path: string }) => {
    assertTrustedSender(event);
    // Fast path: read directly via Node fs instead of round-tripping through orphix-core
    const resolved = safePath(args.path);
    const content = await fs.promises.readFile(resolved, "utf-8");
    return { content };
  });

  ipcMain.handle(CHANNELS.FILE_WRITE, async (event, args: { path: string; content: string }) => {
    assertTrustedSender(event);
    // Fast path: write directly via Node fs
    const resolved = safePath(args.path);
    await fs.promises.writeFile(resolved, args.content, "utf-8");
    return { success: true };
  });

  ipcMain.handle(CHANNELS.FILE_CREATE, async (event, args: { path: string; isDir: boolean }) => {
    assertTrustedSender(event);
    return client.fileCreate(safePath(args.path), args.isDir);
  });

  ipcMain.handle(CHANNELS.FILE_RENAME, async (event, args: { oldPath: string; newPath: string }) => {
    assertTrustedSender(event);
    return client.fileRename(safePath(args.oldPath), safePath(args.newPath));
  });

  ipcMain.handle(CHANNELS.FILE_DELETE, async (event, args: { path: string }) => {
    assertTrustedSender(event);
    return client.fileDelete(safePath(args.path));
  });

  ipcMain.handle(CHANNELS.FILE_COPY, async (event, args: { srcPath: string; destPath: string }) => {
    assertTrustedSender(event);
    return client.fileCopy(safePath(args.srcPath), safePath(args.destPath));
  });

  ipcMain.handle(CHANNELS.FILE_MOVE, async (event, args: { srcPath: string; destPath: string }) => {
    assertTrustedSender(event);
    return client.fileMove(safePath(args.srcPath), safePath(args.destPath));
  });

  ipcMain.handle(CHANNELS.FILE_STAT, async (event, args: { path: string }) => {
    assertTrustedSender(event);
    return client.fileStat(safePath(args.path));
  });

  ipcMain.handle(CHANNELS.FILE_WATCH, async (event, args: { path: string }) => {
    assertTrustedSender(event);
    startFileWatcher(safePath(args.path));
  });

  ipcMain.handle(CHANNELS.FILE_UNWATCH, async (event) => {
    assertTrustedSender(event);
    stopFileWatcher();
  });

  ipcMain.handle(CHANNELS.FILE_OPEN_EXTERNAL, async (event, args: { path: string }) => {
    assertTrustedSender(event);
    const resolved = safePath(args.path);
    // Only allow opening files/dirs that exist — blocks arbitrary program execution
    const stat = await fs.promises.stat(resolved).catch(() => null);
    if (!stat || (!stat.isFile() && !stat.isDirectory())) {
      throw new Error("Path does not exist or is not a file/directory");
    }
    await shell.openPath(resolved);
  });

  ipcMain.handle(CHANNELS.FILE_REVEAL, async (event, args: { path: string }) => {
    assertTrustedSender(event);
    const resolved = safePath(args.path);
    shell.showItemInFolder(resolved);
  });

  ipcMain.handle(CHANNELS.FILE_OPEN_TERMINAL, async (event, args: { path: string }) => {
    assertTrustedSender(event);
    const resolved = safePath(args.path);
    const stat = await fs.promises.stat(resolved).catch(() => null);
    const cwd = stat?.isDirectory() ? resolved : path.dirname(resolved);
    // Terminal creation is handled by the terminal IPC — emit event for workspace to pick up
    const { BrowserWindow } = require("electron");
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send("file:open-terminal", { cwd });
  });
}
