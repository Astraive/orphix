import type { OrphixThemeVariant } from "../types";

export function createXtermTheme(theme: OrphixThemeVariant) {
  const terminal = theme.colors.colors.terminal;

  return {
    background: terminal.background,
    foreground: terminal.foreground,

    cursor: terminal.cursor,
    cursorAccent: terminal.cursorAccent,

    selectionBackground: terminal.selectionBackground,
    selectionForeground: terminal.selectionForeground,

    black: terminal.black,
    red: terminal.red,
    green: terminal.green,
    yellow: terminal.yellow,
    blue: terminal.blue,
    magenta: terminal.magenta,
    cyan: terminal.cyan,
    white: terminal.white,

    brightBlack: terminal.brightBlack,
    brightRed: terminal.brightRed,
    brightGreen: terminal.brightGreen,
    brightYellow: terminal.brightYellow,
    brightBlue: terminal.brightBlue,
    brightMagenta: terminal.brightMagenta,
    brightCyan: terminal.brightCyan,
    brightWhite: terminal.brightWhite,
  };
}
