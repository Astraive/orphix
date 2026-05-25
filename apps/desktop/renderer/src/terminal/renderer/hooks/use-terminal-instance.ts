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

interface UseTerminalInstanceOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  sessionId: string;
}

interface UseTerminalInstanceResult {
  terminal: Terminal | null;
  fitAddon: FitAddon | null;
  isReady: boolean;
}

export function useTerminalInstance({
  containerRef,
  sessionId,
}: UseTerminalInstanceOptions): UseTerminalInstanceResult {
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

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

    const created = createTerminal();
    created.terminal.open(containerRef.current);
    created.fitAddon.fit();
    createdRef.current = created;

    // Replay recent output
    terminalAttach(sessionId).then((snap) => {
      for (const chunk of snap.recent_chunks) {
        created.terminal.write(chunk.data);
      }
    });

    // Live output stream
    const unlistenOutput = attachTerminalOutput(created.terminal, sessionId);
    unlistenRefs.current.push(unlistenOutput);

    // Exit handler
    const unlistenExit = onTerminalExit((payload) => {
      if (payload.session_id === sessionId) {
        created.terminal.write("\r\n[Process exited]\r\n");
      }
    });
    unlistenRefs.current.push(unlistenExit);

    // Forward input to PTY
    const disposable = created.terminal.onData((data) => {
      terminalWrite(sessionId, data);
    });

    // Forward resize
    const resizeDisposable = created.terminal.onResize(({ cols, rows }) => {
      terminalResize(sessionId, cols, rows);
    });

    // Observe container resize
    const observer = new ResizeObserver(() => {
      if (createdRef.current) {
        fitTerminal(createdRef.current.fitAddon);
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

  return {
    terminal: createdRef.current?.terminal ?? null,
    fitAddon: createdRef.current?.fitAddon ?? null,
    isReady: mountedRef.current,
  };
}
