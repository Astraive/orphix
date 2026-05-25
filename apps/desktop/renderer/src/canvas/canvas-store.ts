import { create } from "zustand";
import type { PaneNode, PaneKind, Rect } from "./layout-tree";
import {
  collectLeafIds,
  removeLeaf,
  getAdjacentLeafId,
  splitFocusedPane,
  MIN_TERMINAL_PANE_HEIGHT,
  MIN_TERMINAL_PANE_WIDTH,
  PANE_GAP_PX,
} from "./layout-tree";
import type { TerminalSessionInfo } from "@/types/terminal";

// ─── Data model ──────────────────────────────────────────────────────────

export interface PaneData {
  id: string;
  kind: PaneKind;
  sessionId: string | null; // null until terminal is created
}

export interface OrphixWindow {
  id: string;
  layout: PaneNode; // binary split tree
  paneData: Record<string, PaneData>; // paneId -> data
  focusedPaneId: string;
}

export interface Workspace {
  id: string;
  title: string;
  windows: OrphixWindow[];
  activeWindowIndex: number;
}

// ─── Session registry ────────────────────────────────────────────────────

let sessionsMap: Record<string, TerminalSessionInfo> = {};
let sessionsListeners: Set<() => void> = new Set();

export function setSession(session: TerminalSessionInfo) {
  sessionsMap = { ...sessionsMap, [session.id]: session };
  sessionsListeners.forEach((l) => l());
}
export function removeSession(id: string) {
  const next = { ...sessionsMap };
  delete next[id];
  sessionsMap = next;
  sessionsListeners.forEach((l) => l());
}
export function getSession(id: string): TerminalSessionInfo | undefined {
  return sessionsMap[id];
}

// ─── State ───────────────────────────────────────────────────────────────

interface CanvasState {
  workspaces: Workspace[];
  activeWorkspaceIndex: number;
  isOverview: boolean;

  // Workspace ops
  moveWorkspace: (direction: "up" | "down") => void;
  jumpToWorkspace: (index: number) => void;
  addWorkspace: () => void;
  closeWorkspace: () => void;

  // Window ops (Alt+N = new window to the right)
  addWindow: () => string; // returns the initial paneId
  closeWindow: () => void;
  moveWindowFocus: (direction: "left" | "right") => void;

  // Pane ops (inside a window, Hyprland-style)
  splitPane: (sessionId: string, bounds?: Rect) => string | null;
  closePane: () => void;
  movePaneFocus: (direction: "left" | "right" | "up" | "down") => void;
  setPaneSession: (paneId: string, sessionId: string) => void;

  toggleOverview: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

const createId = (): string => crypto.randomUUID();
const MAX_WORKSPACES = 10;

function createWindow(paneId: string): OrphixWindow {
  return {
    id: createId(),
    layout: { type: "leaf", paneId, paneKind: "terminal" },
    paneData: { [paneId]: { id: paneId, kind: "terminal", sessionId: null } },
    focusedPaneId: paneId,
  };
}

function createWorkspace(index: number): Workspace {
  const paneId = createId();
  return {
    id: createId(),
    title: `Workspace ${index + 1}`,
    windows: [createWindow(paneId)],
    activeWindowIndex: 0,
  };
}

function reindexWorkspaces(workspaces: Workspace[]): Workspace[] {
  return workspaces.map((ws, i) => ({ ...ws, title: `Workspace ${i + 1}` }));
}

// ─── Store ───────────────────────────────────────────────────────────────

export const useCanvasStore = create<CanvasState>()((set, get) => ({
  workspaces: [createWorkspace(0)],
  activeWorkspaceIndex: 0,
  isOverview: false,

  // ── Workspace ops ──

  moveWorkspace: (direction) => {
    set((s) => {
      const isAtEnd = s.activeWorkspaceIndex === s.workspaces.length - 1;
      if (direction === "down" && isAtEnd) {
        const ws = s.workspaces[s.activeWorkspaceIndex];
        const hasSessions = ws?.windows.some((w) =>
          Object.values(w.paneData).some((p) => p.sessionId !== null),
        );
        if (!hasSessions || s.workspaces.length >= MAX_WORKSPACES) return s;
        return {
          workspaces: [...s.workspaces, createWorkspace(s.workspaces.length)],
          activeWorkspaceIndex: s.workspaces.length,
          isOverview: false,
        };
      }
      const next = direction === "up"
        ? Math.max(0, s.activeWorkspaceIndex - 1)
        : Math.min(s.workspaces.length - 1, s.activeWorkspaceIndex + 1);
      return { activeWorkspaceIndex: next, isOverview: false };
    });
  },

  jumpToWorkspace: (index) => {
    set((s) => ({
      activeWorkspaceIndex: Math.max(0, Math.min(index, s.workspaces.length - 1)),
      isOverview: false,
    }));
  },

  addWorkspace: () => {
    set((s) => {
      if (s.workspaces.length >= MAX_WORKSPACES) return s;
      const newWs = createWorkspace(s.workspaces.length);
      return {
        workspaces: [...s.workspaces, newWs],
        activeWorkspaceIndex: s.workspaces.length, // move down to new workspace
      };
    });
  },

  closeWorkspace: () => {
    set((s) => {
      if (s.workspaces.length <= 1) return s;
      const filtered = [...s.workspaces];
      filtered.splice(s.activeWorkspaceIndex, 1);
      let idx = s.activeWorkspaceIndex;
      if (idx >= filtered.length) idx = filtered.length - 1;
      return { workspaces: reindexWorkspaces(filtered), activeWorkspaceIndex: idx };
    });
  },

  // ── Window ops ──

  addWindow: () => {
    const paneId = createId();
    const win = createWindow(paneId);
    set((s) => {
      const ws = s.workspaces[s.activeWorkspaceIndex];
      if (!ws) return s;
      return {
        workspaces: s.workspaces.map((w, i) =>
          i === s.activeWorkspaceIndex
            ? { ...w, windows: [...w.windows, win], activeWindowIndex: w.windows.length }
            : w,
        ),
      };
    });
    return paneId;
  },

  closeWindow: () => {
    set((s) => {
      const ws = s.workspaces[s.activeWorkspaceIndex];
      if (!ws || ws.windows.length <= 1) return s;
      const wins = [...ws.windows];
      wins.splice(ws.activeWindowIndex, 1);
      let idx = ws.activeWindowIndex;
      if (idx >= wins.length) idx = wins.length - 1;
      return {
        workspaces: s.workspaces.map((w, i) =>
          i === s.activeWorkspaceIndex ? { ...w, windows: wins, activeWindowIndex: idx } : w,
        ),
      };
    });
  },

  moveWindowFocus: (direction) => {
    set((s) => {
      const ws = s.workspaces[s.activeWorkspaceIndex];
      if (!ws || ws.windows.length <= 1) return s;
      const next = direction === "left"
        ? Math.max(0, ws.activeWindowIndex - 1)
        : Math.min(ws.windows.length - 1, ws.activeWindowIndex + 1);
      return {
        workspaces: s.workspaces.map((w, i) =>
          i === s.activeWorkspaceIndex ? { ...w, activeWindowIndex: next } : w,
        ),
        isOverview: false,
      };
    });
  },

  // ── Pane ops (Hyprland-style split) ──

  splitPane: (sessionId, bounds = { x: 0, y: 0, width: 1000, height: 600 }) => {
    let createdPaneId: string | null = null;

    set((s) => {
      const ws = s.workspaces[s.activeWorkspaceIndex];
      if (!ws) return s;
      const win = ws.windows[ws.activeWindowIndex];
      if (!win) return s;

      const newPaneId = createId();
      const splitResult = splitFocusedPane(
        win.layout,
        newPaneId,
        bounds,
        {
          targetPaneId: win.focusedPaneId,
          gap: PANE_GAP_PX,
          minPaneWidth: MIN_TERMINAL_PANE_WIDTH,
          minPaneHeight: MIN_TERMINAL_PANE_HEIGHT,
          newPaneKind: "terminal",
        },
      );
      if (!splitResult) return s;

      const newPaneData: PaneData = { id: newPaneId, kind: "terminal", sessionId };
      createdPaneId = newPaneId;

      const updatedWin: OrphixWindow = {
        ...win,
        layout: splitResult.layout,
        paneData: { ...win.paneData, [newPaneId]: newPaneData },
        focusedPaneId: newPaneId,
      };

      return {
        workspaces: s.workspaces.map((w, i) =>
          i === s.activeWorkspaceIndex
            ? {
                ...w,
                windows: w.windows.map((wi, j) =>
                  j === w.activeWindowIndex ? updatedWin : wi,
                ),
              }
            : w,
        ),
      };
    });

    return createdPaneId;
  },

  closePane: () => {
    set((s) => {
      const ws = s.workspaces[s.activeWorkspaceIndex];
      if (!ws) return s;
      const win = ws.windows[ws.activeWindowIndex];
      if (!win) return s;

      const focusedId = win.focusedPaneId;
      const newLayout = removeLeaf(win.layout, focusedId);
      const leafIds = newLayout ? collectLeafIds(newLayout) : [];

      // If no panes left in window, remove window
      if (!newLayout || leafIds.length === 0) {
        if (ws.windows.length <= 1) {
          const paneId = createId();
          const freshWin = createWindow(paneId);
          return {
            workspaces: s.workspaces.map((w, i) =>
              i === s.activeWorkspaceIndex
                ? { ...w, windows: [freshWin], activeWindowIndex: 0 }
                : w,
            ),
          };
        }
        const wins = [...ws.windows];
        wins.splice(ws.activeWindowIndex, 1);
        let idx = ws.activeWindowIndex;
        if (idx >= wins.length) idx = wins.length - 1;
        return {
          workspaces: s.workspaces.map((w, i) =>
            i === s.activeWorkspaceIndex ? { ...w, windows: wins, activeWindowIndex: idx } : w,
          ),
        };
      }

      const newPaneData = { ...win.paneData };
      delete newPaneData[focusedId];
      const newFocused = leafIds[0];

      const updatedWin: OrphixWindow = {
        ...win,
        layout: newLayout,
        paneData: newPaneData,
        focusedPaneId: newFocused,
      };

      return {
        workspaces: s.workspaces.map((w, i) =>
          i === s.activeWorkspaceIndex
            ? {
                ...w,
                windows: w.windows.map((wi, j) =>
                  j === w.activeWindowIndex ? updatedWin : wi,
                ),
              }
            : w,
        ),
      };
    });
  },

  movePaneFocus: (direction) => {
    set((s) => {
      const ws = s.workspaces[s.activeWorkspaceIndex];
      if (!ws) return s;
      const win = ws.windows[ws.activeWindowIndex];
      if (!win) return s;

      const bounds: Rect = { x: 0, y: 0, width: 1000, height: 600 };
      const nextId = getAdjacentLeafId(win.layout, win.focusedPaneId, bounds, direction);
      if (!nextId) return s;

      return {
        workspaces: s.workspaces.map((w, i) =>
          i === s.activeWorkspaceIndex
            ? {
                ...w,
                windows: w.windows.map((wi, j) =>
                  j === w.activeWindowIndex ? { ...wi, focusedPaneId: nextId } : wi,
                ),
              }
            : w,
        ),
      };
    });
  },

  setPaneSession: (paneId, sessionId) => {
    set((s) => ({
      workspaces: s.workspaces.map((ws) => ({
        ...ws,
        windows: ws.windows.map((win) => ({
          ...win,
          paneData: {
            ...win.paneData,
            [paneId]: { ...win.paneData[paneId], sessionId } as PaneData,
          },
        })),
      })),
    }));
  },

  toggleOverview: () => set((s) => ({ isOverview: !s.isOverview })),
}));
