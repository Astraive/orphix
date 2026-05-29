// Re-export themes from @orphix/themes — this file is a compatibility shim
import { getThemeById } from "@orphix/themes";
import type { OrphixTheme } from "./types";

function fromPackageTheme(id: string): OrphixTheme {
  const t = getThemeById(id);
  const c = t.colors.colors;
  return {
    name: t.name,
    bg: c.base.background,
    surface: c.base.surface,
    muted: c.text.textMuted,
    accent: c.brand.primary,
    text: c.text.text,
    textDim: c.text.textSubtle,
    border: c.base.border,
    borderActive: c.base.borderStrong,
    panelBg: c.base.surfaceElevated,
    terminalBg: c.terminal.background,
    terminalFg: c.terminal.foreground,
    terminalCursor: c.terminal.cursor,
    terminalSelection: c.terminal.selectionBackground,
  } as OrphixTheme;
}

export const orphixDefault: OrphixTheme = fromPackageTheme("orphix.dark");
export const orphixAbyssGreen: OrphixTheme = {
  name: "Orphix Abyss Green",
  bg: "#040D12",
  surface: "#183D3D",
  muted: "#5C8374",
  accent: "#93B1A6",
  text: "#EAF4EF",
  textDim: "#93B1A6",
  border: "rgba(147, 177, 166, 0.18)",
  borderActive: "#93B1A6",
  panelBg: "rgba(24, 61, 61, 0.62)",
  terminalBg: "#0D1F23",
  terminalFg: "#EAF4EF",
  terminalCursor: "#93B1A6",
  terminalSelection: "rgba(147, 177, 166, 0.35)",
};
