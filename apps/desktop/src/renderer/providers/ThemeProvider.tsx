import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import {
  getThemeById,
  createCssVars,
  createXtermTheme,
  listThemeVariants,
  listColorThemes,
  listFontThemes,
  listIconThemes,
  composeTheme,
} from "@orphix/themes";
import type { OrphixThemeVariant, OrphixColorTheme, OrphixFontTheme, OrphixIconTheme } from "@orphix/themes";
import { restoreCachedThemes } from "@/features/themes/theme-store";
import { useSizingStore } from "@/features/settings/stores/sizing-store";

const DEFAULT_COLOR_ID = "orphix.dark.colors";
const DEFAULT_FONT_ID = "orphix.default.fonts";
const DEFAULT_ICON_ID = "orphix.default.icons";

interface ThemeContextValue {
  // Active composed theme
  activeTheme: OrphixThemeVariant;
  activeThemeId: string;
  xtermTheme: ReturnType<typeof createXtermTheme>;

  // Full theme pack selection (legacy)
  setTheme: (themeId: string) => void;
  availableThemes: OrphixThemeVariant[];

  // Independent selection
  activeColorId: string;
  activeFontId: string;
  activeIconId: string;
  setColor: (colorId: string) => void;
  setFont: (fontId: string) => void;
  setIcon: (iconId: string) => void;

  // Lists for the picker
  colorThemes: OrphixColorTheme[];
  fontThemes: OrphixFontTheme[];
  iconThemes: OrphixIconTheme[];

  // Installed theme management
  themeVersion: number;
  bumpThemeVersion: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    restoreCachedThemes();
    useSizingStore.getState().apply();
  }, []);

  const [colorId, setColorId] = useState(() => {
    try { return localStorage.getItem("orphix-color-id") ?? DEFAULT_COLOR_ID; } catch { return DEFAULT_COLOR_ID; }
  });
  const [fontId, setFontId] = useState(() => {
    try { return localStorage.getItem("orphix-font-id") ?? DEFAULT_FONT_ID; } catch { return DEFAULT_FONT_ID; }
  });
  const [iconId, setIconId] = useState(() => {
    try { return localStorage.getItem("orphix-icon-id") ?? DEFAULT_ICON_ID; } catch { return DEFAULT_ICON_ID; }
  });

  const [themeVersion, setThemeVersion] = useState(0);
  const bumpThemeVersion = useCallback(() => setThemeVersion((v) => v + 1), []);

  // Compose the active theme from independent selections
  const activeTheme = useMemo(
    () => composeTheme(colorId, fontId, iconId),
    [colorId, fontId, iconId, themeVersion],
  );

  const xtermTheme = useMemo(() => createXtermTheme(activeTheme), [activeTheme]);
  const availableThemes = useMemo(() => listThemeVariants(), [themeVersion]);

  // Derive unique lists for the picker
  const colorThemes = useMemo(() => listColorThemes().map((v) => v.colors), [themeVersion]);
  const fontThemes = useMemo(() => listFontThemes().map((v) => v.fonts), [themeVersion]);
  const iconThemes = useMemo(() => listIconThemes().map((v) => v.icons), [themeVersion]);

  const applyTheme = useCallback((theme: OrphixThemeVariant) => {
    const vars = createCssVars(theme);
    const root = document.documentElement;

    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    const c = theme.colors.colors;
    root.style.setProperty("--ox-bg", c.base.background);
    root.style.setProperty("--ox-surface", c.base.surface);
    root.style.setProperty("--ox-muted", c.text.textMuted);
    root.style.setProperty("--ox-accent", c.brand.primary);
    root.style.setProperty("--ox-text", c.text.text);
    root.style.setProperty("--ox-text-dim", c.text.textSubtle);
    root.style.setProperty("--ox-border", c.base.border);
    root.style.setProperty("--ox-border-active", c.base.borderStrong);
    root.style.setProperty("--ox-panel-bg", c.base.surfaceElevated);

    root.dataset.theme = theme.id;
  }, []);

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme, applyTheme]);

  const setColor = useCallback((id: string) => {
    setColorId(id);
    try { localStorage.setItem("orphix-color-id", id); } catch {}
  }, []);

  const setFont = useCallback((id: string) => {
    setFontId(id);
    try { localStorage.setItem("orphix-font-id", id); } catch {}
  }, []);

  const setIcon = useCallback((id: string) => {
    setIconId(id);
    try { localStorage.setItem("orphix-icon-id", id); } catch {}
  }, []);

  // Legacy full-theme setter: sets all three at once
  const setTheme = useCallback((themeId: string) => {
    const theme = getThemeById(themeId);
    setColor(theme.colors.id);
    setFont(theme.fonts.id);
    setIcon(theme.icons.id);
  }, [setColor, setFont, setIcon]);

  const value = useMemo(
    () => ({
      activeTheme,
      activeThemeId: activeTheme.id,
      xtermTheme,
      setTheme,
      availableThemes,
      activeColorId: colorId,
      activeFontId: fontId,
      activeIconId: iconId,
      setColor,
      setFont,
      setIcon,
      colorThemes,
      fontThemes,
      iconThemes,
      themeVersion,
      bumpThemeVersion,
    }),
    [activeTheme, xtermTheme, setTheme, availableThemes, colorId, fontId, iconId, setColor, setFont, setIcon, colorThemes, fontThemes, iconThemes, themeVersion, bumpThemeVersion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
