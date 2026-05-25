import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Terminal as XtermTerminal } from "@xterm/xterm";
import { useTerminalRuntime } from "../context/useTerminalRuntime";
import { observeTerminalSize } from "../utils/terminalSizing";
import { createXterm } from "../xterm/createXterm";
import type { TerminalSessionSnapshot } from "../../shared/terminal-types";

interface TerminalViewportProps {
  terminalId: string;
  isActive: boolean;
}

const getStatusLabel = (session: TerminalSessionSnapshot | undefined): string => {
  if (!session) return "starting...";
  if (session.status === "running") return "";
  if (session.status === "exited") return `exited (${session.exitCode ?? 0})`;
  if (session.status === "error") return session.errorMessage ?? "failed to start";
  return "starting...";
};

export const TerminalViewport: React.FC<TerminalViewportProps> = ({ terminalId, isActive }) => {
  const { sessions, registerOutputSink, writeTerminal, resizeTerminal } = useTerminalRuntime();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XtermTerminal | null>(null);
  const bootstrappedRef = useRef(false);

  const session = sessions.get(terminalId);

  // Create xterm and wire up I/O
  useEffect(() => {
    if (bootstrappedRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    bootstrappedRef.current = true;

    const { terminal, fitAddon } = createXterm();
    terminal.open(container);
    xtermRef.current = terminal;

    // Keyboard input → PTY
    const inputDisposable = terminal.onData((data) => {
      writeTerminal(terminalId, data).catch(() => {});
    });

    // ResizeObserver → fit → resize PTY
    const stopObserving = observeTerminalSize(container, terminal, fitAddon, ({ cols, rows }) => {
      resizeTerminal(terminalId, cols, rows).catch(() => {});
    });

    // Live output sink
    const detachOutput = registerOutputSink(terminalId, (data) => {
      terminal.write(data);
    });

    // Write "ready" message once session is running
    const detachState = window.orphix.on("terminal:state", (event: unknown) => {
      const { terminalId: tid, snapshot } = event as { terminalId: string; snapshot: TerminalSessionSnapshot };
      if (tid === terminalId && snapshot.status === "running") {
        terminal.write("\x1b[38;5;245m[terminal ready]\x1b[0m\r\n");
        detachState();
      }
    });

    return () => {
      stopObserving();
      inputDisposable.dispose();
      detachOutput();
      detachState();
      terminal.dispose();
      xtermRef.current = null;
      bootstrappedRef.current = false;
    };
  }, [terminalId, writeTerminal, resizeTerminal, registerOutputSink]);

  // Focus when active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus();
    }
  }, [isActive]);

  const statusLabel = getStatusLabel(session);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {statusLabel && (
        <div className="absolute bottom-1 right-2 text-[9px] font-mono text-ox-muted/60 pointer-events-none">
          {statusLabel}
        </div>
      )}
    </div>
  );
};
