import { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";

export interface TerminalSize {
  cols: number;
  rows: number;
}

export function createFitAddon(terminal: Terminal): FitAddon {
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  return fitAddon;
}

const normalizeDimension = (value: number): number => Math.max(2, Math.floor(value));

export function fitTerminal(terminal: Terminal, fitAddon: FitAddon): TerminalSize {
  fitAddon.fit();
  return {
    cols: normalizeDimension(terminal.cols),
    rows: normalizeDimension(terminal.rows),
  };
}

/**
 * Observe container resize and fit terminal. Deduplicates: only fires callback]
 */
export function observeTerminalSize(
  container: HTMLElement,
  terminal: Terminal,
  fitAddon: FitAddon,
  onResize: (size: TerminalSize) => void,
): () => void {
  let pendingFrame: number | null = null;
  let previousSize: TerminalSize | null = null;

  const scheduleFit = (): void => {
    if (pendingFrame !== null) {
      window.cancelAnimationFrame(pendingFrame);
    }
    pendingFrame = window.requestAnimationFrame(() => {
      pendingFrame = null;
      fitAddon.fit();
      const nextSize: TerminalSize = {
        cols: normalizeDimension(terminal.cols),
        rows: normalizeDimension(terminal.rows),
      };
      if (
        previousSize &&
        previousSize.cols === nextSize.cols &&
        previousSize.rows === nextSize.rows
      ) {
        return;
      }
      previousSize = nextSize;
      onResize(nextSize);
    });
  };

  const observer = new ResizeObserver(() => {
    scheduleFit();
  });
  observer.observe(container);
  scheduleFit();

  return () => {
    observer.disconnect();
    if (pendingFrame !== null) {
      window.cancelAnimationFrame(pendingFrame);
    }
  };
}
