import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
import { orphixTerminalTheme } from "./theme";

export interface CreatedTerminal {
  terminal: Terminal;
  fitAddon: FitAddon;
  webglAddon: WebglAddon | null;
}

export function createTerminal(): CreatedTerminal {
  const terminal = new Terminal({
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
    // WebGL not supported, fallback to canvas
  }

  return { terminal, fitAddon, webglAddon };
}
