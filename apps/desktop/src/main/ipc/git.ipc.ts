import { ipcMain } from "electron";
import { execFile } from "child_process";
import { CHANNELS } from "../../shared/ipc/channels";
import type { CoreClient } from "../app/core-client";
import {
  startGitWatcher,
  stopGitWatcher,
} from "../system/git-watcher";

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

  ipcMain.handle(CHANNELS.GIT_FETCH, async (_event, args: { cwd: string }) => {
    return client.gitFetch(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_PULL, async (_event, args: { cwd: string }) => {
    return client.gitPull(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_PUSH, async (_event, args: { cwd: string }) => {
    return client.gitPush(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_SYNC, async (_event, args: { cwd: string }) => {
    return client.gitSync(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_STAGE_ALL, async (_event, args: { cwd: string }) => {
    return client.gitStageAll(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_UNSTAGE_ALL, async (_event, args: { cwd: string }) => {
    return client.gitUnstageAll(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_DISCARD, async (_event, args: { cwd: string; files: string[] }) => {
    return client.gitDiscard(args.cwd, args.files);
  });

  ipcMain.handle(CHANNELS.GIT_DISCARD_ALL, async (_event, args: { cwd: string }) => {
    return client.gitDiscardAll(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_STASH_PUSH, async (_event, args: { cwd: string; message?: string }) => {
    return client.gitStashPush(args.cwd, args.message);
  });

  ipcMain.handle(CHANNELS.GIT_STASH_POP, async (_event, args: { cwd: string }) => {
    return client.gitStashPop(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_STASH_APPLY, async (_event, args: { cwd: string; stash: string }) => {
    return client.gitStashApply(args.cwd, args.stash);
  });

  ipcMain.handle(CHANNELS.GIT_STASH_DROP, async (_event, args: { cwd: string; stash: string }) => {
    return client.gitStashDrop(args.cwd, args.stash);
  });

  ipcMain.handle(CHANNELS.GIT_STASH_LIST, async (_event, args: { cwd: string }) => {
    return client.gitStashList(args.cwd);
  });

  ipcMain.handle(CHANNELS.GIT_WATCH, async (_event, args: { cwd: string }) => {
    const gitDir = args.cwd + "/.git";
    startGitWatcher(gitDir);
  });

  ipcMain.handle(CHANNELS.GIT_UNWATCH, async () => {
    stopGitWatcher();
  });

  const GH_ALLOWED_SUBCOMMANDS = ['repo', 'pr', 'issue', 'gist', 'api'];

  ipcMain.handle(CHANNELS.GIT_EXEC, async (_event, args: { cwd: string; args: string[] }) => {
    if (!args.args[0] || !GH_ALLOWED_SUBCOMMANDS.includes(args.args[0])) {
      throw new Error(`gh subcommand not allowed: ${args.args[0]}`);
    }
    return new Promise((resolve, reject) => {
      execFile("gh", args, { cwd: args.cwd, timeout: 30000 }, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve({ stdout, stderr });
      });
    });
  });
}
