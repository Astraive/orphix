import { ipcMain, shell } from "electron";
import { readdir, stat, readFile, writeFile, mkdir, rename, rm, copyFile, lstat } from "fs/promises";
import { join, basename } from "path";
import { CHANNELS } from "../../shared/channels";
import { startFileWatcher, stopFileWatcher } from "../services/file-watcher";

export function registerFileIpc(): void {
  ipcMain.handle(CHANNELS.FILE_LIST, async (_event, args: { path: string }) => {
    const entries = await readdir(args.path, { withFileTypes: true });
    const result = await Promise.all(
      entries
        .filter((e) => !e.name.startsWith("."))
        .map(async (entry) => {
          const fullPath = join(args.path, entry.name);
          try {
            const s = await stat(fullPath);
            return {
              name: entry.name,
              path: fullPath,
              isDir: entry.isDirectory(),
              size: s.size,
              mtime: s.mtimeMs,
            };
          } catch {
            return {
              name: entry.name,
              path: fullPath,
              isDir: entry.isDirectory(),
              size: 0,
              mtime: 0,
            };
          }
        }),
    );
    // Sort: directories first, then alphabetically
    result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return result;
  });

  ipcMain.handle(CHANNELS.FILE_READ, async (_event, args: { path: string }) => {
    const content = await readFile(args.path, "utf-8");
    return { content };
  });

  ipcMain.handle(CHANNELS.FILE_WRITE, async (_event, args: { path: string; content: string }) => {
    await writeFile(args.path, args.content, "utf-8");
  });

  ipcMain.handle(CHANNELS.FILE_CREATE, async (_event, args: { path: string; isDir: boolean }) => {
    if (args.isDir) {
      await mkdir(args.path, { recursive: true });
    } else {
      await writeFile(args.path, "", "utf-8");
    }
  });

  ipcMain.handle(CHANNELS.FILE_RENAME, async (_event, args: { oldPath: string; newPath: string }) => {
    await rename(args.oldPath, args.newPath);
  });

  ipcMain.handle(CHANNELS.FILE_DELETE, async (_event, args: { path: string }) => {
    await rm(args.path, { recursive: true, force: true });
  });

  ipcMain.handle(CHANNELS.FILE_COPY, async (_event, args: { srcPath: string; destPath: string }) => {
    await copyFile(args.srcPath, args.destPath);
  });

  ipcMain.handle(CHANNELS.FILE_MOVE, async (_event, args: { srcPath: string; destPath: string }) => {
    await rename(args.srcPath, args.destPath);
  });

  ipcMain.handle(CHANNELS.FILE_STAT, async (_event, args: { path: string }) => {
    const s = await lstat(args.path);
    return {
      size: s.size,
      mtime: s.mtimeMs,
      isDir: s.isDirectory(),
      isSymlink: s.isSymbolicLink(),
    };
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
