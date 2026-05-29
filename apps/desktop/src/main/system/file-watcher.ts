import { watch, type FSWatcher } from "chokidar";
import { BrowserWindow } from "electron";
import { CHANNELS } from "../../shared/ipc/channels";

let watcher: FSWatcher | null = null;

export function startFileWatcher(dirPath: string): void {
  if (watcher) {
    watcher.close();
  }

  watcher = watch(dirPath, {
    ignored: [
      /(^|[\/\\])\../, // dotfiles
      /node_modules/,
      /\.git/,
      /target/,
      /dist/,
      /out/,
    ],
    persistent: true,
    ignoreInitial: true,
    depth: 10,
  });

  const debounceMap = new Map<string, NodeJS.Timeout>();

  const notify = (filePath: string, eventType: string) => {
    const key = `${eventType}:${filePath}`;
    clearTimeout(debounceMap.get(key));
    debounceMap.set(
      key,
      setTimeout(() => {
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send(CHANNELS.FILE_CHANGED, {
            path: filePath,
            type: eventType,
          });
        }
        debounceMap.delete(key);
      }, 150),
    );
  };

  watcher
    .on("add", (path) => notify(path, "add"))
    .on("change", (path) => notify(path, "change"))
    .on("unlink", (path) => notify(path, "unlink"))
    .on("addDir", (path) => notify(path, "addDir"))
    .on("unlinkDir", (path) => notify(path, "unlinkDir"));
}

export function stopFileWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
