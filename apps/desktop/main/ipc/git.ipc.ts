import { ipcMain } from "electron";
import { CHANNELS } from "../../shared/channels";
import type { CoreClient } from "../core/core-client";
import {
  startGitWatcher,
  stopGitWatcher,
} from "../services/git-watcher";

export function registerGitIpc(client: CoreClient): void {
  ipcMain.handle(CHANNELS.GIT_STATUS, async (_event, args: { cwd: string }) => {
    return client.gitStatus(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_BRANCHES, async (_event, args: { cwd: string }) => {
    return client.gitBranches(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_CHECKOUT, async (_event, args: { cwd: string; branch: string }) => {
    return client.gitCheckout(args.cwd, args.branch);
  });

  ipcMain.handle(CHANNELS.GIT_DIFF, async (_event, args: { cwd: string; file: string }) => {
    return client.gitDiff(args.cwd, args.file);
  });

  ipcMain.handle(CHANNELS.GIT_STAGE, async (_event, args: { cwd: string; files: string[] }) => {
    return client.gitStage(args.cwd, args.files);
  });

  ipcMain.handle(CHANNELS.GIT_UNSTAGE, async (_event, args: { cwd: string; files: string[] }) => {
    return client.gitUnstage(args.cwd, args.files);
  });

  ipcMain.handle(CHANNELS.GIT_COMMIT, async (_event, args: { cwd: string; message: string }) => {
    return client.gitCommit(args.cwd, args.message);
  });

  ipcMain.handle(CHANNELS.GIT_WATCH, async (_event, args: { cwd: string }) => {
    const gitDir = args.cwd + "/.git";
    startGitWatcher(gitDir);
  });

  ipcMain.handle(CHANNELS.GIT_UNWATCH, async () => {
    stopGitWatcher();
  });
}
