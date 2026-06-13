import { create } from "zustand";

export type OpenMode = "split" | "new-window";
export type CursorStyle = "block" | "line" | "underline";

interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  openMode: OpenMode;
  lineHeight: number;
  showMinimap: boolean;
  showLineNumbers: boolean;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  cursorWidth: number;
  renderWhitespace: boolean;
  bracketPairColorization: boolean;
}

interface EditorSettingsState extends EditorSettings {
  setFontSize: (v: number) => void;
  setFontFamily: (v: string) => void;
  setTabSize: (v: number) => void;
  setWordWrap: (v: boolean) => void;
  setOpenMode: (v: OpenMode) => void;
  setLineHeight: (v: number) => void;
  setShowMinimap: (v: boolean) => void;
  setShowLineNumbers: (v: boolean) => void;
  setCursorStyle: (v: CursorStyle) => void;
  setCursorBlink: (v: boolean) => void;
  setCursorWidth: (v: number) => void;
  setRenderWhitespace: (v: boolean) => void;
  setBracketPairColorization: (v: boolean) => void;
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
  showMinimap: load("showMinimap", true),
  showLineNumbers: load("showLineNumbers", true),
  cursorStyle: load("cursorStyle", "block" as CursorStyle),
  cursorBlink: load("cursorBlink", true),
  cursorWidth: load("cursorWidth", 2),
  renderWhitespace: load("renderWhitespace", false),
  bracketPairColorization: load("bracketPairColorization", true),

  setFontSize: (v) => { save("fontSize", v); set({ fontSize: v }); },
  setFontFamily: (v) => { save("fontFamily", v); set({ fontFamily: v }); },
  setTabSize: (v) => { save("tabSize", v); set({ tabSize: v }); },
  setWordWrap: (v) => { save("wordWrap", v); set({ wordWrap: v }); },
  setOpenMode: (v) => { save("openMode", v); set({ openMode: v }); },
  setLineHeight: (v) => { save("lineHeight", v); set({ lineHeight: v }); },
  setShowMinimap: (v) => { save("showMinimap", v); set({ showMinimap: v }); },
  setShowLineNumbers: (v) => { save("showLineNumbers", v); set({ showLineNumbers: v }); },
  setCursorStyle: (v) => { save("cursorStyle", v); set({ cursorStyle: v }); },
  setCursorBlink: (v) => { save("cursorBlink", v); set({ cursorBlink: v }); },
  setCursorWidth: (v) => { save("cursorWidth", v); set({ cursorWidth: v }); },
  setRenderWhitespace: (v) => { save("renderWhitespace", v); set({ renderWhitespace: v }); },
  setBracketPairColorization: (v) => { save("bracketPairColorization", v); set({ bracketPairColorization: v }); },
}));
