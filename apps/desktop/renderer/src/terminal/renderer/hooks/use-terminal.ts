import { useEffect, useRef, useCallback, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import { createTerminal, type CreatedTerminal } from "../xterm/create-terminal";
import { fitTerminal } from "../xterm/fit";
import { attachTerminalOutput } from "../xterm/attach-terminal";
import {
  terminalCreate,
  terminalWrite,
  terminalResize,
  terminalKill,
  terminalAttach,
} from "@/terminal/main/terminal-api";
import { onTerminalExit } from "@/terminal/main/terminal-events";
import { useTerminalStore } from "../stores/terminal-store";
import type { TerminalSessionInfo } from "@/types/terminal";

interface UseTerminalResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  terminal: Terminal | null;
  session: TerminalSessionInfo | null;
  isReady: boolean;
  createSession: () => Promise<void>;
  killSession: () => Promise<void>;
}

export function useTerminal(): UseTerminalResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef<CreatedTerminal | null>(null);
  const sessionRef = useRef<TerminalSessionInfo | null>(null);
  const unlistenRefs = useRef<(() => void)[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<TerminalSessionInfo | null>(null);

  const { setTerminal, removeTerminal } = useTerminalStore();

  const cleanup = useCallback(() => {
    for (const unlisten of unlistenRefs.current) {
      unlisten();
    }
    unlistenRefs.current = [];
    if (createdRef.current) {
      createdRef.current.terminal.dispose();
      createdRef.current = null;
    }
  }, []);

  const createSession = useCallback(async () => {
    if (!containerRef.current || createdRef.current) return;

    // Create xterm instance
    const created = createTerminal();
    created.terminal.open(containerRef.current);
    created.fitAddon.fit();
    createdRef.current = created;

    // Create PTY session
    const dims = created.fitAddon.proposeDimensions();
    const sessionInfo = await terminalCreate({
      cols: dims?.cols,
      rows: dims?.rows,
    });

    sessionRef.current = sessionInfo;
    setSession(sessionInfo);
    setTerminal(sessionInfo);

    // Replay recent output
    const snap = await terminalAttach(sessionInfo.id);
    for (const chunk of snap.recent_chunks) {
      created.terminal.write(chunk.data);
    }

    // Attach live output
    const unlistenOutput = attachTerminalOutput(created.terminal, sessionInfo.id);
    unlistenRefs.current.push(unlistenOutput);

    // Listen for exit
    const unlistenExit = onTerminalExit((payload) => {
      if (payload.session_id === sessionInfo.id) {
        created.terminal.write("\r\n[Process exited]\r\n");
      }
    });
    unlistenRefs.current.push(unlistenExit);

    // Forward keyboard input to PTY
    const unlistenInput = created.terminal.onData((data) => {
      if (sessionRef.current) {
        terminalWrite(sessionRef.current.id, data);
      }
    });
    unlistenRefs.current.push(() => unlistenInput.dispose());

    // Handle resize
    const unlistenResize = created.terminal.onResize(({ cols, rows }) => {
      if (sessionRef.current) {
        terminalResize(sessionRef.current.id, cols, rows);
      }
    });
    unlistenRefs.current.push(() => unlistenResize.dispose());

    // Observe container resize
    const observer = new ResizeObserver(() => {
      if (createdRef.current) {
        const { cols, rows } = fitTerminal(createdRef.current.fitAddon);
        if (sessionRef.current) {
          terminalResize(sessionRef.current.id, cols, rows);
        }
      }
    });
    observer.observe(containerRef.current);
    unlistenRefs.current.push(() => observer.disconnect());

    setIsReady(true);
  }, [setTerminal]);

  const killSession = useCallback(async () => {
    if (sessionRef.current) {
      await terminalKill(sessionRef.current.id);
      removeTerminal(sessionRef.current.id);
      sessionRef.current = null;
    }
    cleanup();
    setIsReady(false);
    setSession(null);
  }, [cleanup, removeTerminal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        terminalKill(sessionRef.current.id).catch(() => {});
      }
      cleanup();
    };
  }, [cleanup]);

  return {
    containerRef,
    terminal: createdRef.current?.terminal ?? null,
    session,
    isReady,
    createSession,
    killSession,
  };
}
