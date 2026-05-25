import { ipcMain, shell } from "electron";
import { CHANNELS } from "../../shared/channels";
import { startFileWatcher, stopFileWatcher } from "../services/file-watcher";
import type { CoreClient } from "../core/core-client";

export function registerFileIpc(client: CoreClient): void {
  ipcMain.handle(CHANNELS.FILE_LIST, async (_event, args: { path: string }) => {
    return client.fileList(args.path);
  });

  ipcMain.handle(CHANNELS.FILE_READ, async (_event, args: { path: string }) => {
    return client.fileRead(args.path);
  });

  ipcMain.handle(CHANNELS.FILE_WRITE, async (_event, args: { path: string; content: string }) => {
    return client.fileWrite(args.path, args.content);
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
    await shell.openPath(args.path);
  });
}
