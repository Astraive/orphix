import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import type { ITheme } from "@xterm/xterm";

export interface XtermOptions {
  theme: ITheme;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  scrollback: number;
  cursorStyle?: string;
  cursorBlink?: boolean;
}

export interface XtermInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
}

export const createXterm = (options?: XtermOptions): XtermInstance => {
  const terminal = new Terminal({
    allowTransparency: false,
    convertEol: false,
    cursorBlink: options?.cursorBlink ?? true,
    cursorStyle: (options?.cursorStyle as any) ?? "block",
    fontFamily: options?.fontFamily ?? "'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    fontSize: options?.fontSize ?? 14,
    lineHeight: options?.lineHeight ?? 1.25,
    macOptionIsMeta: true,
    minimumContrastRatio: 1,
    rescaleOverlappingGlyphs: true,
    scrollback: options?.scrollback ?? 10000,
    theme: options?.theme,
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  const searchAddon = new SearchAddon();
  terminal.loadAddon(searchAddon);

  // WebGL renderer with graceful fallback to canvas
  try {
    const webglAddon = new WebglAddon();
    webglAddon.onContextLoss(() => webglAddon.dispose());
    terminal.loadAddon(webglAddon);
  } catch {
    // Canvas renderer is the fallback — no action needed
  }

  return { terminal, fitAddon, searchAddon };
};
