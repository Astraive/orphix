import { useEffect, useRef, useCallback } from "react";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { createTerminal, type CreatedTerminal } from "../xterm/create-terminal";
import { fitTerminal } from "../xterm/fit";
import { attachTerminalOutput } from "../xterm/attach-terminal";
import {
  terminalWrite,
  terminalResize,
  terminalAttach,
} from "@/terminal/main/terminal-api";
import { onTerminalExit } from "@/terminal/main/terminal-events";

interface UseTerminalViewportOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  sessionId: string;
  isActive: boolean;
}

interface UseTerminalViewportResult {
  terminal: Terminal | null;
  fitAddon: FitAddon | null;
  isReady: boolean;
}

export function useTerminalViewport({
  containerRef,
  sessionId,
  isActive,
}: UseTerminalViewportOptions): UseTerminalViewportResult {
  const createdRef = useRef<CreatedTerminal | null>(null);
  const unlistenRefs = useRef<(() => void)[]>([]);
  const mountedRef = useRef(false);

  const cleanup = useCallback(() => {
    for (const fn of unlistenRefs.current) fn();
    unlistenRefs.current = [];
    createdRef.current?.terminal.dispose();
    createdRef.current = null;
    mountedRef.current = false;
  }, []);

  // Create terminal on mount
  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

    const created = createTerminal();
    created.terminal.open(containerRef.current);

    // Delay fit to ensure container has dimensions
    requestAnimationFrame(() => {
      created.fitAddon.fit();
    });

    createdRef.current = created;

    // Replay recent output
    terminalAttach(sessionId).then((snap) => {
      for (const chunk of snap.recent_chunks) {
        created.terminal.write(chunk.data);
      }
    }).catch(console.error);

    // Live output stream
    const unlistenOutput = attachTerminalOutput(created.terminal, sessionId);
    unlistenRefs.current.push(unlistenOutput);

    // Exit handler
    const unlistenExit = onTerminalExit((payload) => {
      if (payload.session_id === sessionId) {
        created.terminal.write("\r\n\x1b[38;5;245m[Process exited]\x1b[0m\r\n");
      }
    });
    unlistenRefs.current.push(unlistenExit);

    // Forward keyboard input to PTY
    const disposable = created.terminal.onData((data) => {
      terminalWrite(sessionId, data).catch(console.error);
    });

    // Forward terminal resize to PTY
    const resizeDisposable = created.terminal.onResize(({ cols, rows }) => {
      terminalResize(sessionId, cols, rows).catch(console.error);
    });

    // Observe container resize → fit xterm → resize PTY
    const observer = new ResizeObserver(() => {
      if (createdRef.current) {
        const dims = fitTerminal(createdRef.current.fitAddon);
        terminalResize(sessionId, dims.cols, dims.rows).catch(console.error);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      disposable.dispose();
      resizeDisposable.dispose();
      observer.disconnect();
      cleanup();
    };
  }, [sessionId, containerRef, cleanup]);

  // Focus terminal when it becomes active
  useEffect(() => {
    if (isActive && createdRef.current) {
      createdRef.current.terminal.focus();
    }
  }, [isActive]);

  return {
    terminal: createdRef.current?.terminal ?? null,
    fitAddon: createdRef.current?.fitAddon ?? null,
    isReady: mountedRef.current,
  };
}
