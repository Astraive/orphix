import { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";

export function createFitAddon(terminal: Terminal): FitAddon {
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  return fitAddon;
}

export interface TerminalSize {
  cols: number;
  rows: number;
}

const normalizeDimension = (value: number): number => Math.max(2, Math.floor(value));

export function fitTerminal(fitAddon: FitAddon): { cols: number; rows: number } {
  fitAddon.fit();
  const dims = fitAddon.proposeDimensions();
  return {
    cols: dims?.cols ?? 120,
    rows: dims?.rows ?? 30,
  };
}

/**
 * Observe container resize and fit terminal. Deduplicates: only fires callback
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

  // Initial fit
  scheduleFit();

  return () => {
    observer.disconnect();
    if (pendingFrame !== null) {
      window.cancelAnimationFrame(pendingFrame);
    }
  };
}
