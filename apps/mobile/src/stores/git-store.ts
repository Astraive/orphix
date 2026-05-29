import { create } from "zustand";

export interface GitFile {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitBranch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
}

export interface GitStatus {
  branch: string;
  files: GitFile[];
  ahead: number;
  behind: number;
}

export interface GitStash {
  index: number;
  name: string;
  message: string;
}

interface GitState {
  status: GitStatus | null;
  branches: GitBranch[];
  stashes: GitStash[];
  loading: boolean;

  setStatus: (status: GitStatus | null) => void;
  setBranches: (branches: GitBranch[]) => void;
  setStashes: (stashes: GitStash[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useGitStore = create<GitState>((set) => ({
  status: null,
  branches: [],
  stashes: [],
  loading: false,

  setStatus: (status) => set({ status }),
  setBranches: (branches) => set({ branches }),
  setStashes: (stashes) => set({ stashes }),
  setLoading: (loading) => set({ loading }),
}));
