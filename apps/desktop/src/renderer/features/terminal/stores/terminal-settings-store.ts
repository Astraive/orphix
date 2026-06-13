import { create } from "zustand";

export type TerminalHeaderPosition = "top" | "bottom" | "hidden";
export type CursorStyle = "block" | "bar" | "underline";

interface TerminalSettings {
  headerPosition: TerminalHeaderPosition;
  fontSize: number;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  scrollbackLines: number;
  opacity: number;
  fontFamily: string;
}

interface TerminalSettingsState extends TerminalSettings {
  setHeaderPosition: (v: TerminalHeaderPosition) => void;
  setFontSize: (v: number) => void;
  setCursorStyle: (v: CursorStyle) => void;
  setCursorBlink: (v: boolean) => void;
  setScrollbackLines: (v: number) => void;
  setOpacity: (v: number) => void;
  setFontFamily: (v: string) => void;
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
  fontSize: load("fontSize", 15),
  cursorStyle: load("cursorStyle", "block" as CursorStyle),
  cursorBlink: load("cursorBlink", true),
  scrollbackLines: load("scrollbackLines", 10000),
  opacity: load("opacity", 100),
  fontFamily: load("fontFamily", ""),

  setHeaderPosition: (v) => { save("headerPosition", v); set({ headerPosition: v }); },
  setFontSize: (v) => { save("fontSize", v); set({ fontSize: v }); },
  setCursorStyle: (v) => { save("cursorStyle", v); set({ cursorStyle: v }); },
  setCursorBlink: (v) => { save("cursorBlink", v); set({ cursorBlink: v }); },
  setScrollbackLines: (v) => { save("scrollbackLines", v); set({ scrollbackLines: v }); },
  setOpacity: (v) => { save("opacity", v); set({ opacity: v }); },
  setFontFamily: (v) => { save("fontFamily", v); set({ fontFamily: v }); },
}));
