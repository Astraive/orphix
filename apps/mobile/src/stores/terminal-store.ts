import { create } from "zustand";

export interface Terminal {
  id: string;
  name: string;
  status: "running" | "exited" | "starting" | "error";
  shell: string;
  cwd: string;
}

export interface TerminalWindow {
  id: string;
  name: string;
  terminals: Terminal[];
}

export interface Workspace {
  id: string;
  name: string;
  windows: TerminalWindow[];
}

interface TerminalState {
  workspaces: Workspace[];
  activeWorkspace: number;
  activeWindow: number;
  activeTerminal: string | null;
  sidebarOpen: boolean;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (idx: number) => void;
  setActiveWindow: (idx: number) => void;
  setActiveTerminal: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  workspaces: [
    {
      id: "ws_1",
      name: "Workspace 1",
      windows: [
        {
          id: "win_1",
          name: "Window 1",
          terminals: [
            { id: "term_1", name: "bash", status: "running", shell: "/bin/bash", cwd: "~" },
          ],
        },
      ],
    },
  ],
  activeWorkspace: 0,
  activeWindow: 0,
  activeTerminal: null,
  sidebarOpen: false,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (idx) => set({ activeWorkspace: idx }),
  setActiveWindow: (idx) => set({ activeWindow: idx }),
  setActiveTerminal: (id) => set({ activeTerminal: id, sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
