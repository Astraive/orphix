import { getThemeById } from "@orphix/themes";

const defaultTheme = getThemeById("orphix.dark");
const terminalFont = defaultTheme.fonts.fonts.families.terminal;

export const DEFAULT_TERMINAL_CONFIG = {
  cols: 120,
  rows: 30,
  fontSize: parseInt(defaultTheme.fonts.fonts.sizes.terminal, 10) || 14,
  fontFamily: [quoteFont(terminalFont.family), ...terminalFont.fallback].join(", "),
  cursorBlink: true,
  cursorStyle: "block" as const,
  scrollback: 10000,
};

function quoteFont(font: string): string {
  return font.includes(" ") ? `"${font}"` : font;
}
