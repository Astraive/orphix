import { useEffect } from "react";
import type { RefObject } from "react";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";
import { normalizeDimension } from "@shared/terminal/sizing";

interface TerminalSize {
  cols: number;
  rows: number;
}

interface UseTerminalFitOptions {
  containerRef: RefObject<HTMLElement | null>;
  terminalRef: RefObject<Terminal | null>;
  fitAddonRef: RefObject<FitAddon | null>;
  onResize: (size: TerminalSize) => void;
  version: number;
}

export function useTerminalFit({
  containerRef,
  terminalRef,
  fitAddonRef,
  onResize,
  version,
}: UseTerminalFitOptions): void {
  useEffect(() => {
    const container = containerRef.current;
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;

    if (!container || !terminal || !fitAddon) {
      return undefined;
    }

    let pendingFrame: number | null = null;
    let previousSize: TerminalSize | null = null;

    const fit = (): void => {
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }

      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = null;

        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }

        fitAddon.fit();

        const nextSize = {
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

    const observer = new ResizeObserver(fit);
    observer.observe(container);
    fit();

    window.addEventListener("resize", fit);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
      }
    };
  }, [containerRef, fitAddonRef, onResize, terminalRef, version]);
}
