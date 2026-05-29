import { create } from "zustand";

export type OpenMode = "split" | "new-window";

interface EditorSettings {
  fontSize: number;
  fontFamily: string; // "" = use theme code font
  tabSize: number;
  wordWrap: boolean;
  openMode: OpenMode;
  lineHeight: number;
}

interface EditorSettingsState extends EditorSettings {
  setFontSize: (v: number) => void;
  setFontFamily: (v: string) => void;
  setTabSize: (v: number) => void;
  setWordWrap: (v: boolean) => void;
  setOpenMode: (v: OpenMode) => void;
  setLineHeight: (v: number) => void;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`orphix-editor-${key}`);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`orphix-editor-${key}`, JSON.stringify(value));
  } catch {}
}

export const useEditorSettingsStore = create<EditorSettingsState>()((set) => ({
  fontSize: load("fontSize", 14),
  fontFamily: load("fontFamily", ""),
  tabSize: load("tabSize", 2),
  wordWrap: load("wordWrap", false),
  openMode: load("openMode", "split"),
  lineHeight: load("lineHeight", 1.6),

  setFontSize: (v) => { save("fontSize", v); set({ fontSize: v }); },
  setFontFamily: (v) => { save("fontFamily", v); set({ fontFamily: v }); },
  setTabSize: (v) => { save("tabSize", v); set({ tabSize: v }); },
  setWordWrap: (v) => { save("wordWrap", v); set({ wordWrap: v }); },
  setOpenMode: (v) => { save("openMode", v); set({ openMode: v }); },
  setLineHeight: (v) => { save("lineHeight", v); set({ lineHeight: v }); },
}));
