import type { ITheme } from "@xterm/xterm";

export const orphixTerminalTheme: ITheme = {
  background: "#050D10",
  foreground: "#EAF4EF",
  cursor: "#00D9F5",
  cursorAccent: "#050D10",
  selectionBackground: "rgba(0, 217, 245, 0.25)",
  black: "#050D10",
  red: "#FF6B6B",
  green: "#32E0C4",
  yellow: "#FFD93D",
  blue: "#00D9F5",
  magenta: "#C778DD",
  cyan: "#32E0C4",
  white: "#EAF4EF",
  brightBlack: "#0D7377",
  brightRed: "#FF8787",
  brightGreen: "#32E0C4",
  brightYellow: "#FFE066",
  brightBlue: "#00D9F5",
  brightMagenta: "#D68FFF",
  brightCyan: "#5EEAD4",
  brightWhite: "#ffffff",
};

// Identity function — Orphix uses a static theme for now.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const toXtermTheme = (_theme?: unknown): ITheme => orphixTerminalTheme;
