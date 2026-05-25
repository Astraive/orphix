import { create } from "zustand";
import type { TerminalSessionInfo } from "@/types/terminal";

interface TerminalEntry {
  session: TerminalSessionInfo;
}

interface TerminalStore {
  terminals: Map<string, TerminalEntry>;
  activeTerminalId: string | null;
  sessions: TerminalSessionInfo[];
  setTerminal: (session: TerminalSessionInfo) => void;
  removeTerminal: (id: string) => void;
  setActive: (id: string | null) => void;
  getSession: (id: string) => TerminalSessionInfo | undefined;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  terminals: new Map(),
  activeTerminalId: null,
  sessions: [],

  setTerminal: (session) =>
    set((state) => {
      const next = new Map(state.terminals);
      next.set(session.id, { session });
      return {
        terminals: next,
        sessions: Array.from(next.values()).map((e) => e.session),
        activeTerminalId: session.id,
      };
    }),

  removeTerminal: (id) =>
    set((state) => {
      const next = new Map(state.terminals);
      next.delete(id);
      const activeTerminalId =
        state.activeTerminalId === id
          ? (next.keys().next().value ?? null)
          : state.activeTerminalId;
      return {
        terminals: next,
        sessions: Array.from(next.values()).map((e) => e.session),
        activeTerminalId,
      };
    }),

  setActive: (id) => set({ activeTerminalId: id }),

  getSession: (id) => get().terminals.get(id)?.session,
}));
