import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Terminal as XtermTerminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { useTerminalRuntime } from "../context/useTerminalRuntime";
import { useTerminalFit } from "../hooks/useTerminalFit";
import { createXterm } from "../xterm/createXterm";
import { toXtermTheme } from "../xterm/terminalTheme";
import type { TerminalSessionSnapshot } from "../../shared/types";

interface TerminalViewportProps {
  terminalId: string;
  isActive: boolean;
}

const getStatusLabel = (
  session: TerminalSessionSnapshot | undefined,
): string => {
  if (!session) return "starting...";
  if (session.status === "running") return "";
  if (session.status === "exited") return `exited (${session.exitCode ?? 0})`;
  if (session.status === "error") return session.errorMessage ?? "failed to start";
  return "starting...";
};

export const TerminalViewport: React.FC<TerminalViewportProps> = ({ terminalId, isActive }) => {
  const { sessions, getBufferedOutput, registerOutputSink, writeTerminal, resizeTerminal } = useTerminalRuntime();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const bootstrappedRef = useRef(false);
  const hideScrollbarTimerRef = useRef<number | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [fitVersion, setFitVersion] = useState(0);

  const session = sessions[terminalId];

  const handleFitResize = useCallback(({ cols, rows }: { cols: number; rows: number }) => {
    resizeTerminal({ terminalId, cols, rows }).catch(() => {});
  }, [resizeTerminal, terminalId]);

  useTerminalFit({
    containerRef,
    terminalRef: xtermRef,
    fitAddonRef,
    onResize: handleFitResize,
    version: fitVersion,
  });

  // Create xterm and wire up I/O
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const { terminal, fitAddon } = createXterm();
    terminal.open(container);
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;
    setFitVersion((version) => version + 1);

    // Replay buffered output for late-joining xterm instances
    const buffered = getBufferedOutput(terminalId);
    if (buffered) {
      terminal.write(buffered);
    }

    // Register output sink for live data
    const detachOutput = registerOutputSink(terminalId, (data) => {
      terminal.write(data);
    });

    // Keyboard input -> PTY
    const inputDisposable = terminal.onData((data) => {
      writeTerminal({ terminalId, data }).catch(() => {});
    });

    // Scroll activity for custom scrollbar styling
    const viewport = container.querySelector(".xterm-viewport");
    const onViewportActivity = (): void => {
      setIsScrolling(true);
      if (hideScrollbarTimerRef.current !== null) {
        window.clearTimeout(hideScrollbarTimerRef.current);
      }
      hideScrollbarTimerRef.current = window.setTimeout(() => {
        setIsScrolling(false);
        hideScrollbarTimerRef.current = null;
      }, 700);
    };
    if (viewport instanceof HTMLElement) {
      viewport.addEventListener("wheel", onViewportActivity, { passive: true });
      viewport.addEventListener("scroll", onViewportActivity, { passive: true });
    }

    return () => {
      if (viewport instanceof HTMLElement) {
        viewport.removeEventListener("wheel", onViewportActivity);
        viewport.removeEventListener("scroll", onViewportActivity);
      }
      if (hideScrollbarTimerRef.current !== null) {
        window.clearTimeout(hideScrollbarTimerRef.current);
        hideScrollbarTimerRef.current = null;
      }
      inputDisposable.dispose();
      detachOutput();
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      bootstrappedRef.current = false;
    };
  }, [terminalId, getBufferedOutput, registerOutputSink, writeTerminal]);

  // Focus when active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus();
    }
  }, [isActive]);

  const statusLabel = getStatusLabel(session);

  return (
    <div className={`relative w-full h-full terminal-viewport-shell ${isScrolling ? "is-scrolling" : ""}`}>
      <div ref={containerRef} className="terminal-xterm-host" />
      {statusLabel && (
        <div
          className="absolute right-2 bottom-1.5 rounded px-1.5 py-0.5 text-[9px] font-mono tracking-wider pointer-events-none"
          style={{
            color: "rgba(255,255,255,0.3)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          {statusLabel}
        </div>
      )}
    </div>
  );
};
