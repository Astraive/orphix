import { create } from "zustand";
import { MONOSPACE_FONTS, loadGoogleFontByName, type GoogleFont } from "@/lib/google-fonts";

const STORAGE_KEY = "orphix-terminal-font";

function loadSavedFont(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch {}
  return null;
}

function saveFont(name: string | null) {
  try {
    if (name) localStorage.setItem(STORAGE_KEY, name);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

interface TerminalFontStore {
  /** Currently selected font name. null = use theme default */
  selectedFont: string | null;
  /** Fonts currently being loaded */
  loadingFonts: Set<string>;
  /** Fonts that have been loaded into the page */
  loadedFonts: Set<string>;

  setSelectedFont: (name: string | null) => Promise<void>;
  ensureFontLoaded: (name: string) => Promise<void>;
  getFontFamily: (themeDefault: string) => string;
  getAvailableFonts: () => GoogleFont[];
}

export const useTerminalFontStore = create<TerminalFontStore>()((set, get) => ({
  selectedFont: loadSavedFont(),
  loadingFonts: new Set(),
  loadedFonts: new Set(),

  setSelectedFont: async (name) => {
    if (name) {
      await get().ensureFontLoaded(name);
    }
    saveFont(name);
    set({ selectedFont: name });
  },

  ensureFontLoaded: async (name) => {
    const { loadedFonts, loadingFonts } = get();
    if (loadedFonts.has(name) || loadingFonts.has(name)) return;

    const newLoading = new Set(loadingFonts);
    newLoading.add(name);
    set({ loadingFonts: newLoading });

    try {
      await loadGoogleFontByName(name);
      const newLoaded = new Set(get().loadedFonts);
      newLoaded.add(name);
      const stillLoading = new Set(get().loadingFonts);
      stillLoading.delete(name);
      set({ loadedFonts: newLoaded, loadingFonts: stillLoading });
    } catch {
      const stillLoading = new Set(get().loadingFonts);
      stillLoading.delete(name);
      set({ loadingFonts: stillLoading });
    }
  },

  getFontFamily: (themeDefault) => {
    const { selectedFont } = get();
    const fontName = selectedFont ?? themeDefault;
    const googleFont = MONOSPACE_FONTS.find((f) => f.name === fontName);
    if (googleFont) return `"${fontName}", ui-monospace, monospace`;
    return fontName;
  },

  getAvailableFonts: () => MONOSPACE_FONTS,
}));
