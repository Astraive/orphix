import { create } from "zustand";
import { invoke, listen } from "@/lib/ipc-client";
import { CHANNELS } from "@shared/ipc/channels";
import type { GitFile, GitFileStatus, GitStash, GitStatus } from "@shared/types/common";

interface GitStore {
  branch: string | null;
  files: GitFile[];
  ahead: number;
  behind: number;
  commitMessage: string;
  watching: boolean;
  selectedFile: string | null;
  diff: string | null;
  stashes: GitStash[];
  watchedCwd: string | null;
  unlistenStatus: (() => void) | null;

  refresh: (cwd: string) => Promise<void>;
  watch: (cwd: string) => Promise<void>;
  unwatch: () => Promise<void>;
  stage: (cwd: string, files: string[]) => Promise<void>;
  unstage: (cwd: string, files: string[]) => Promise<void>;
  commit: (cwd: string) => Promise<void>;
  checkout: (cwd: string, branch: string) => Promise<void>;
  fetch: (cwd: string) => Promise<void>;
  pull: (cwd: string) => Promise<void>;
  push: (cwd: string) => Promise<void>;
  sync: (cwd: string) => Promise<void>;
  stageAll: (cwd: string) => Promise<void>;
  unstageAll: (cwd: string) => Promise<void>;
  discard: (cwd: string, files: string[]) => Promise<void>;
  discardAll: (cwd: string) => Promise<void>;
  stashPush: (cwd: string, message?: string) => Promise<void>;
  stashPop: (cwd: string) => Promise<void>;
  stashApply: (cwd: string, stash: string) => Promise<void>;
  stashDrop: (cwd: string, stash: string) => Promise<void>;
  refreshStashes: (cwd: string) => Promise<void>;
  setCommitMessage: (msg: string) => void;
  selectFile: (cwd: string, file: string | null) => Promise<void>;
}

export function getStatusColor(status: GitFileStatus): string {
  switch (status) {
    case "M": return "#E5C07B"; // yellow
    case "A": return "#98C379"; // green
    case "D": return "#E06C75"; // red
    case "R": return "#C678DD"; // purple
    case "C": return "#56B6C2"; // cyan
    case "U": return "#E06C75"; // red
    case "??": return "#5C6370"; // gray
    default: return "#5C6370";
  }
}

export function groupGitFiles(files: GitFile[]) {
  const staged = files.filter((f) => f.staged);
  const modified = files.filter((f) => !f.staged && f.status !== "??");
  const untracked = files.filter((f) => f.status === "??");
  return { staged, modified, untracked };
}

export const useGitStore = create<GitStore>()((set, get) => ({
  branch: null,
  files: [],
  ahead: 0,
  behind: 0,
  commitMessage: "",
  watching: false,
  selectedFile: null,
  diff: null,
  stashes: [],
  watchedCwd: null,
  unlistenStatus: null,

  refresh: async (cwd: string) => {
    try {
      const status = await invoke<GitStatus>(CHANNELS.GIT_STATUS, { cwd });
      set({
        branch: status.branch,
        files: status.files,
        ahead: status.ahead,
        behind: status.behind,
      });
      await get().refreshStashes(cwd);
    } catch {
      set({ branch: null, files: [], ahead: 0, behind: 0, stashes: [] });
    }
  },

  watch: async (cwd: string) => {
    const { watchedCwd, unlistenStatus } = get();
    if (watchedCwd === cwd && get().watching) return;

    unlistenStatus?.();
    if (watchedCwd) {
      await invoke(CHANNELS.GIT_UNWATCH);
    }

    const unlistenStatusNext = listen<void>(CHANNELS.GIT_STATUS_CHANGED, () => {
      get().refresh(cwd);
    });

    await invoke(CHANNELS.GIT_WATCH, { cwd });
    set({ watching: true, watchedCwd: cwd, unlistenStatus: unlistenStatusNext });
    await get().refresh(cwd);
  },

  unwatch: async () => {
    get().unlistenStatus?.();
    await invoke(CHANNELS.GIT_UNWATCH);
    set({ watching: false, watchedCwd: null, unlistenStatus: null });
  },

  stage: async (cwd: string, files: string[]) => {
    await invoke(CHANNELS.GIT_STAGE, { cwd, files });
    await get().refresh(cwd);
  },

  unstage: async (cwd: string, files: string[]) => {
    await invoke(CHANNELS.GIT_UNSTAGE, { cwd, files });
    await get().refresh(cwd);
  },

  commit: async (cwd: string) => {
    const { commitMessage } = get();
    if (!commitMessage.trim()) return;
    await invoke(CHANNELS.GIT_COMMIT, { cwd, message: commitMessage });
    set({ commitMessage: "" });
    await get().refresh(cwd);
  },

  checkout: async (cwd: string, branch: string) => {
    await invoke(CHANNELS.GIT_CHECKOUT, { cwd, branch });
    await get().refresh(cwd);
  },

  fetch: async (cwd: string) => {
    await invoke(CHANNELS.GIT_FETCH, { cwd });
    await get().refresh(cwd);
  },

  pull: async (cwd: string) => {
    await invoke(CHANNELS.GIT_PULL, { cwd });
    await get().refresh(cwd);
  },

  push: async (cwd: string) => {
    await invoke(CHANNELS.GIT_PUSH, { cwd });
    await get().refresh(cwd);
  },

  sync: async (cwd: string) => {
    await invoke(CHANNELS.GIT_SYNC, { cwd });
    await get().refresh(cwd);
  },

  stageAll: async (cwd: string) => {
    await invoke(CHANNELS.GIT_STAGE_ALL, { cwd });
    await get().refresh(cwd);
  },

  unstageAll: async (cwd: string) => {
    await invoke(CHANNELS.GIT_UNSTAGE_ALL, { cwd });
    await get().refresh(cwd);
  },

  discard: async (cwd: string, files: string[]) => {
    await invoke(CHANNELS.GIT_DISCARD, { cwd, files });
    await get().refresh(cwd);
  },

  discardAll: async (cwd: string) => {
    await invoke(CHANNELS.GIT_DISCARD_ALL, { cwd });
    await get().refresh(cwd);
  },

  stashPush: async (cwd: string, message?: string) => {
    await invoke(CHANNELS.GIT_STASH_PUSH, { cwd, message });
    await get().refresh(cwd);
  },

  stashPop: async (cwd: string) => {
    await invoke(CHANNELS.GIT_STASH_POP, { cwd });
    await get().refresh(cwd);
  },

  stashApply: async (cwd: string, stash: string) => {
    await invoke(CHANNELS.GIT_STASH_APPLY, { cwd, stash });
    await get().refresh(cwd);
  },

  stashDrop: async (cwd: string, stash: string) => {
    await invoke(CHANNELS.GIT_STASH_DROP, { cwd, stash });
    await get().refresh(cwd);
  },

  refreshStashes: async (cwd: string) => {
    const stashes = await invoke<GitStash[]>(CHANNELS.GIT_STASH_LIST, { cwd });
    set({ stashes });
  },

  setCommitMessage: (msg: string) => set({ commitMessage: msg }),

  selectFile: async (cwd: string, file: string | null) => {
    set({ selectedFile: file });
    if (file) {
      const diff = await invoke<string>(CHANNELS.GIT_DIFF, { cwd, file });
      set({ diff });
    } else {
      set({ diff: null });
    }
  },
}));
