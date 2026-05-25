import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
import { orphixTerminalTheme } from "./terminalTheme";

export interface XtermInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  webglAddon: WebglAddon | null;
}

export const createXterm = (): XtermInstance => {
  const terminal = new Terminal({
    allowTransparency: true,
    convertEol: true,
    cursorBlink: true,
    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    fontSize: 12,
    lineHeight: 1.25,
    scrollback: 5000,
    theme: orphixTerminalTheme,
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  let webglAddon: WebglAddon | null = null;
  try {
    webglAddon = new WebglAddon();
    terminal.loadAddon(webglAddon);
  } catch {
    // WebGL not supported — fall back to canvas renderer
  }

  return { terminal, fitAddon, webglAddon };
};
