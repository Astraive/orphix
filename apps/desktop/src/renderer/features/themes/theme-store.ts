import { create } from "zustand";
import {
  registerThemeFamily,
  getThemeById,
  listThemeVariants,
  createCssVars,
  createXtermTheme,
} from "@orphix/themes";
import type {
  OrphixThemeFamily,
  OrphixThemeVariant,
  OrphixColorTheme,
  OrphixFontTheme,
  OrphixIconTheme,
  OrphixTerminalTheme,
} from "@orphix/themes";

const GITHUB_RAW = import.meta.env.VITE_THEMES_URL ?? "https://raw.githubusercontent.com/Astraive/orphix-themes/main";
const STORAGE_KEY = "orphix-installed-themes";

interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  mode: string;
  tags: string[];
}

interface StoredThemeData {
  colors: OrphixColorTheme;
  terminal?: OrphixTerminalTheme;
}

interface ThemeStoreState {
  available: ThemeMeta[];
  installedIds: Set<string>;
  activeThemeId: string;
  loading: boolean;
  error: string | null;

  fetchCatalog: () => Promise<void>;
  installTheme: (themeId: string) => Promise<void>;
  uninstallTheme: (themeId: string) => void;
  setActiveTheme: (themeId: string) => void;
}

function getDefaultFonts(): OrphixFontTheme {
  const t = getThemeById("orphix.dark");
  return t.fonts;
}

function getDefaultIcons(): OrphixIconTheme {
  const t = getThemeById("orphix.dark");
  return t.icons;
}

function getDefaultTerminal(): OrphixTerminalTheme {
  const t = getThemeById("orphix.dark");
  return t.terminal;
}

function convertToThemeFamily(meta: ThemeMeta, colors: OrphixColorTheme, terminal?: OrphixTerminalTheme): OrphixThemeFamily {
  const fonts = getDefaultFonts();
  const icons = getDefaultIcons();
  terminal = terminal ?? getDefaultTerminal();

  const variant: OrphixThemeVariant = {
    id: meta.id,
    themeId: meta.id,
    variantId: "default",
    name: meta.name,
    colors,
    fonts,
    icons,
    terminal,
  };

  return {
    id: meta.id,
    name: meta.name,
    author: meta.author,
    version: meta.version,
    description: meta.description,
    defaultVariant: "default",
    variants: { default: variant },
  };
}

function loadInstalledFromStorage(): Record<string, StoredThemeData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveInstalledToStorage(themes: Record<string, StoredThemeData>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  } catch {}
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  available: [],
  installedIds: new Set(Object.keys(loadInstalledFromStorage())),
  activeThemeId: (() => {
    try {
      return localStorage.getItem("orphix-theme-id") ?? "orphix.dark";
    } catch {
      return "orphix.dark";
    }
  })(),
  loading: false,
  error: null,

  fetchCatalog: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${GITHUB_RAW}/index.json`);
      if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.status}`);
      const data = await res.json();
      set({ available: data.themes, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch catalog",
        loading: false,
      });
    }
  },

  installTheme: async (themeId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${GITHUB_RAW}/themes/${themeId}/theme.json`);
      if (!res.ok) throw new Error(`Failed to fetch theme: ${res.status}`);
      const data = await res.json();

      const meta = get().available.find((t) => t.id === themeId) ?? {
        id: data.id,
        name: data.name,
        description: data.description ?? "",
        author: data.author ?? "Unknown",
        version: data.version ?? "1.0.0",
        mode: "dark",
        tags: [],
      };

      const terminal = data.terminal ?? getDefaultTerminal();
      const family = convertToThemeFamily(meta, data.colors, terminal);
      registerThemeFamily(family);

      // Persist to localStorage
      const stored = loadInstalledFromStorage();
      stored[themeId] = { colors: data.colors, terminal: data.terminal };
      saveInstalledToStorage(stored);

      const newInstalled = new Set(get().installedIds);
      newInstalled.add(themeId);
      set({ installedIds: newInstalled, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to install theme",
        loading: false,
      });
    }
  },

  uninstallTheme: (themeId: string) => {
    const stored = loadInstalledFromStorage();
    delete stored[themeId];
    saveInstalledToStorage(stored);

    const newInstalled = new Set(get().installedIds);
    newInstalled.delete(themeId);

    // If active theme was uninstalled, fall back to orphix.dark
    const updates: Partial<ThemeStoreState> = { installedIds: newInstalled };
    if (get().activeThemeId === themeId) {
      updates.activeThemeId = "orphix.dark";
      try {
        localStorage.setItem("orphix-theme-id", "orphix.dark");
      } catch {}
    }
    set(updates as ThemeStoreState);
  },

  setActiveTheme: (themeId: string) => {
    set({ activeThemeId: themeId });
    try {
      localStorage.setItem("orphix-theme-id", themeId);
    } catch {}
  },
}));

/**
 * Restore cached themes from localStorage on app start.
 * Called once at boot before render.
 */
export function restoreCachedThemes(): void {
  const stored = loadInstalledFromStorage();
  const fonts = getDefaultFonts();
  const icons = getDefaultIcons();
  const defaultTerminal = getDefaultTerminal();

  for (const [themeId, data] of Object.entries(stored)) {
    const colors = data.colors ?? (data as unknown as OrphixColorTheme);
    const terminal = data.terminal ?? defaultTerminal;
    const family: OrphixThemeFamily = {
      id: themeId,
      name: colors.name ?? themeId,
      author: "Community",
      version: "1.0.0",
      defaultVariant: "default",
      variants: {
        default: {
          id: themeId,
          themeId,
          variantId: "default",
          name: colors.name ?? themeId,
          colors,
          fonts,
          icons,
          terminal,
        },
      },
    };
    registerThemeFamily(family);
  }
}
