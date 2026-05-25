import { createContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { TERMINAL_CHANNELS } from "../../shared/terminal-ipc";
import type {
  CreateTerminalRequest,
  KillTerminalRequest,
  ResizeTerminalRequest,
  TerminalExitEvent,
  TerminalOutputEvent,
  TerminalSessionSnapshot,
  TerminalStateEvent,
  WriteTerminalRequest,
} from "../../shared/terminal-types";

export interface TerminalRuntimeContextValue {
  sessions: Map<string, TerminalSessionSnapshot>;
  createTerminal: (request: CreateTerminalRequest) => Promise<TerminalSessionSnapshot>;
  writeTerminal: (request: WriteTerminalRequest) => Promise<void>;
  resizeTerminal: (request: ResizeTerminalRequest) => Promise<void>;
  killTerminal: (request: KillTerminalRequest) => Promise<void>;
  registerOutputSink: (terminalId: string, handler: (data: string) => void) => () => void;
}

export const TerminalRuntimeContext = createContext<TerminalRuntimeContextValue | null>(null);

export function TerminalRuntimeProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Map<string, TerminalSessionSnapshot>>(new Map());
  const outputHandlersRef = useRef(new Map<string, Set<(data: string) => void>>());

  // Subscribe to terminal events from main process
  useEffect(() => {
    const unlistenOutput = window.orphix.on(TERMINAL_CHANNELS.output, (event: unknown) => {
      const { terminalId, data } = event as TerminalOutputEvent;
      const handlers = outputHandlersRef.current.get(terminalId);
      if (handlers) {
        for (const handler of handlers) {
          handler(data);
        }
      }
    });

    const unlistenState = window.orphix.on(TERMINAL_CHANNELS.state, (event: unknown) => {
      const { terminalId, snapshot } = event as TerminalStateEvent;
      setSessions((prev) => {
        const next = new Map(prev);
        next.set(terminalId, snapshot);
        return next;
      });
    });

    const unlistenExit = window.orphix.on(TERMINAL_CHANNELS.exit, (event: unknown) => {
      const { terminalId } = event as TerminalExitEvent;
      setSessions((prev) => {
        const next = new Map(prev);
        const existing = next.get(terminalId);
        if (existing) {
          next.set(terminalId, { ...existing, status: "exited" });
        }
        return next;
      });
    });

    return () => {
      unlistenOutput();
      unlistenState();
      unlistenExit();
    };
  }, []);

  const createTerminal = useCallback(async (request: CreateTerminalRequest) => {
    const snapshot = await window.orphix.invoke<TerminalSessionSnapshot>(
      TERMINAL_CHANNELS.create,
      request as unknown as Record<string, unknown>,
    );
    setSessions((prev) => {
      const next = new Map(prev);
      next.set(snapshot.terminalId, snapshot);
      return next;
    });
    return snapshot;
  }, []);

  const writeTerminal = useCallback(async (request: WriteTerminalRequest) => {
    await window.orphix.invoke(TERMINAL_CHANNELS.write, request as unknown as Record<string, unknown>);
  }, []);

  const resizeTerminal = useCallback(async (request: ResizeTerminalRequest) => {
    await window.orphix.invoke(TERMINAL_CHANNELS.resize, request as unknown as Record<string, unknown>);
  }, []);

  const killTerminal = useCallback(async (request: KillTerminalRequest) => {
    await window.orphix.invoke(TERMINAL_CHANNELS.kill, request as unknown as Record<string, unknown>);
  }, []);

  const registerOutputSink = useCallback((terminalId: string, handler: (data: string) => void) => {
    let handlers = outputHandlersRef.current.get(terminalId);
    if (!handlers) {
      handlers = new Set();
      outputHandlersRef.current.set(terminalId, handlers);
    }
    handlers.add(handler);
    return () => {
      handlers!.delete(handler);
      if (handlers!.size === 0) {
        outputHandlersRef.current.delete(terminalId);
      }
    };
  }, []);

  return (
    <TerminalRuntimeContext.Provider
      value={{ sessions, createTerminal, writeTerminal, resizeTerminal, killTerminal, registerOutputSink }}
    >
      {children}
    </TerminalRuntimeContext.Provider>
  );
}
