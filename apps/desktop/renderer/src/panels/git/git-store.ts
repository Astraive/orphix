import { create } from "zustand";
import { invoke, listen } from "@/lib/electron-ipc";
import { CHANNELS } from "../../../../shared/channels";
import type { GitFile, GitFileStatus, GitStatus } from "../../../../shared/types";

interface GitStore {
  branch: string | null;
  files: GitFile[];
  ahead: number;
  behind: number;
  commitMessage: string;
  watching: boolean;
  selectedFile: string | null;
  diff: string | null;

  refresh: (cwd: string) => Promise<void>;
  watch: (cwd: string) => Promise<void>;
  unwatch: () => Promise<void>;
  stage: (cwd: string, files: string[]) => Promise<void>;
  unstage: (cwd: string, files: string[]) => Promise<void>;
  commit: (cwd: string) => Promise<void>;
  checkout: (cwd: string, branch: string) => Promise<void>;
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

  refresh: async (cwd: string) => {
    try {
      const status = await invoke<GitStatus>(CHANNELS.GIT_STATUS, { cwd });
      set({
        branch: status.branch,
        files: status.files,
        ahead: status.ahead,
        behind: status.behind,
      });
    } catch {
      set({ branch: null, files: [], ahead: 0, behind: 0 });
    }
  },

  watch: async (cwd: string) => {
    if (get().watching) return;
    set({ watching: true });

    const unlisten = listen<void>(CHANNELS.GIT_STATUS_CHANGED, () => {
      get().refresh(cwd);
    });

    await invoke(CHANNELS.GIT_WATCH, { cwd });
    await get().refresh(cwd);
  },

  unwatch: async () => {
    await invoke(CHANNELS.GIT_UNWATCH);
    set({ watching: false });
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
