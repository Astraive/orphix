import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";

export interface TerminalSize {
  cols: number;
  rows: number;
}

const normalizeDimension = (value: number): number => Math.max(2, Math.floor(value));

export const fitTerminal = (terminal: Terminal, fitAddon: FitAddon): TerminalSize => {
  const proposed = fitAddon.proposeDimensions();
  if (!proposed) {
    return {
      cols: normalizeDimension(terminal.cols),
      rows: normalizeDimension(terminal.rows),
    };
  }

  terminal.resize(
    normalizeDimension(proposed.cols),
    normalizeDimension(proposed.rows),
  );

  return {
    cols: normalizeDimension(terminal.cols),
    rows: normalizeDimension(terminal.rows),
  };
};

export const observeTerminalSize = (
  container: HTMLElement,
  terminal: Terminal,
  fitAddon: FitAddon,
  onResize: (size: TerminalSize) => void,
): (() => void) => {
  let pendingFrame: number | null = null;
  let previousSize: TerminalSize | null = null;

  const scheduleFit = (): void => {
    if (pendingFrame !== null) {
      window.cancelAnimationFrame(pendingFrame);
    }

    pendingFrame = window.requestAnimationFrame(() => {
      pendingFrame = null;
      if (container.clientWidth <= 0 || container.clientHeight <= 0) {
        return;
      }

      const nextSize = fitTerminal(terminal, fitAddon);
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
};
