import { create } from "zustand";

const STORAGE_KEY = "orphix.walkawayMode";

interface WalkawayState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

function readInitialState(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persist(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // localStorage can be unavailable in restricted renderer contexts.
  }
}

export const useWalkawayStore = create<WalkawayState>()((set, get) => ({
  enabled: readInitialState(),
  setEnabled: (enabled) => {
    persist(enabled);
    set({ enabled });
  },
  toggle: () => {
    const enabled = !get().enabled;
    persist(enabled);
    set({ enabled });
  },
}));
