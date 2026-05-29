import { create } from "zustand";

export type TerminalHeaderPosition = "top" | "bottom" | "hidden";

interface TerminalSettings {
  headerPosition: TerminalHeaderPosition;
}

interface TerminalSettingsState extends TerminalSettings {
  setHeaderPosition: (v: TerminalHeaderPosition) => void;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`orphix-terminal-${key}`);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`orphix-terminal-${key}`, JSON.stringify(value));
  } catch {}
}

export const useTerminalSettingsStore = create<TerminalSettingsState>()((set) => ({
  headerPosition: load("headerPosition", "top" as TerminalHeaderPosition),

  setHeaderPosition: (v) => { save("headerPosition", v); set({ headerPosition: v }); },
}));
