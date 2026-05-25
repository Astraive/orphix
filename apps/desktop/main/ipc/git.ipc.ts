import { ipcMain } from "electron";
import { CHANNELS } from "../../shared/channels";
import {
  startGitWatcher,
  stopGitWatcher,
  getGitStatus,
  getGitBranches,
  gitCheckout,
  gitDiff,
  gitStage,
  gitUnstage,
  gitCommit,
} from "../services/git-watcher";

export function registerGitIpc(): void {
  ipcMain.handle(CHANNELS.GIT_STATUS, async (_event, args: { cwd: string }) => {
    return getGitStatus(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_BRANCHES, async (_event, args: { cwd: string }) => {
    return getGitBranches(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_CHECKOUT, async (_event, args: { cwd: string; branch: string }) => {
    return gitCheckout(args.cwd, args.branch);
  });

  ipcMain.handle(CHANNELS.GIT_DIFF, async (_event, args: { cwd: string; file: string }) => {
    return gitDiff(args.cwd, args.file);
  });

  ipcMain.handle(CHANNELS.GIT_STAGE, async (_event, args: { cwd: string; files: string[] }) => {
    return gitStage(args.cwd, args.files);
  });

  ipcMain.handle(CHANNELS.GIT_UNSTAGE, async (_event, args: { cwd: string; files: string[] }) => {
    return gitUnstage(args.cwd, args.files);
  });

  ipcMain.handle(CHANNELS.GIT_COMMIT, async (_event, args: { cwd: string; message: string }) => {
    return gitCommit(args.cwd, args.message);
  });

  ipcMain.handle(CHANNELS.GIT_WATCH, async (_event, args: { cwd: string }) => {
    const gitDir = args.cwd + "/.git";
    startGitWatcher(gitDir);
  });

  ipcMain.handle(CHANNELS.GIT_UNWATCH, async () => {
    stopGitWatcher();
  });
}
