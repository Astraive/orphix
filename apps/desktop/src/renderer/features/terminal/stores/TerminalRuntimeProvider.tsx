import { createContext, useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from "react";
import { TERMINAL_CHANNELS } from "@shared/terminal/terminal-ipc";
import { useCanvasStore } from "@/features/workspace/stores/canvas-store";
import {
  createTerminalExitNotification,
  inspectTerminalOutput,
} from "@orphix/types";
import { useNotificationStore } from "@/features/notifications/notification-store";
import type {
  CreateTerminalRequest,
  KillTerminalRequest,
  ResizeTerminalRequest,
  ShellInfo,
  TerminalExitEvent,
  TerminalOutputEvent,
  TerminalSessionSnapshot,
  TerminalStateEvent,
  WriteTerminalRequest,
} from "@shared/terminal/types";

type TerminalOutputSink = (data: string) => void;

export interface TerminalRuntimeContextValue {
  sessions: Record<string, TerminalSessionSnapshot>;
  getBufferedOutput: (terminalId: string) => string;
  createTerminal: (request: CreateTerminalRequest) => Promise<TerminalSessionSnapshot>;
  writeTerminal: (request: WriteTerminalRequest) => Promise<void>;
  resizeTerminal: (request: ResizeTerminalRequest) => Promise<void>;
  killTerminal: (request: KillTerminalRequest) => Promise<void>;
  listShells: () => Promise<ShellInfo[]>;
  registerOutputSink: (terminalId: string, handler: TerminalOutputSink) => () => void;
}

export const TerminalRuntimeContext = createContext<TerminalRuntimeContextValue | null>(null);

const MAX_BUFFERED_OUTPUT = 4000;
const CREATE_RETRY_DELAY_MS = 120;
const MAX_CREATE_RETRIES = 20;

function toStartingSnapshot(terminalId: string): TerminalSessionSnapshot {
  return {
    terminalId,
    pid: null,
    shell: '',
    cwd: '',
    cols: 80,
    rows: 24,
    status: 'starting',
  };
}

function toErrorSnapshot(terminalId: string, message: string): TerminalSessionSnapshot {
  return {
    terminalId,
    pid: null,
    shell: '',
    cwd: '',
    cols: 80,
    rows: 24,
    status: 'error',
    errorMessage: message,
  };
}

function hasPaneForSession(terminalId: string): boolean {
  return useCanvasStore.getState().workspaces.some((workspace) =>
    workspace.windows.some((win) =>
      Object.values(win.paneData).some((pane) => "sessionId" in pane && pane.sessionId === terminalId),
    ),
  );
}

function ensurePaneForSession(terminalId: string): void {
  if (hasPaneForSession(terminalId)) return;
  const store = useCanvasStore.getState();
  const previousWorkspaceIndex = store.activeWorkspaceIndex;
  const previousWindowIndexes = store.workspaces.map((workspace) => workspace.activeWindowIndex);
  const paneId = store.addWindow();
  store.setPaneSession(paneId, terminalId);
  useCanvasStore.setState((state) => ({
    activeWorkspaceIndex: previousWorkspaceIndex,
    workspaces: state.workspaces.map((workspace, index) => ({
      ...workspace,
      activeWindowIndex: previousWindowIndexes[index] ?? workspace.activeWindowIndex,
    })),
  }));
}

function dispatchNativeNotification(title: string, body: string, severity: "info" | "success" | "warning" | "error"): void {
  const shouldNotify = severity === "error" || severity === "warning" || !document.hasFocus();
  if (!shouldNotify) return;

  window.orphix.system.notify({ title, body, severity }).catch(() => {});
}

export function TerminalRuntimeProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, TerminalSessionSnapshot>>({});
  const outputSinksRef = useRef(new Map<string, Set<TerminalOutputSink>>());
  const outputBuffersRef = useRef(new Map<string, string>());
  const writeQueuesRef = useRef(new Map<string, string[]>());
  const flushFrameRef = useRef<number | null>(null);

  const flushWriteQueues = useCallback(() => {
    flushFrameRef.current = null;
    for (const [terminalId, chunks] of writeQueuesRef.current) {
      if (chunks.length === 0) continue;
      const combined = chunks.join('');
      chunks.length = 0;
      const sinks = outputSinksRef.current.get(terminalId);
      if (sinks) {
        for (const sink of sinks) {
          sink(combined);
        }
      }
    }
  }, []);

  // Subscribe to terminal events from main process
  useEffect(() => {
    const unlistenOutput = window.orphix.on(TERMINAL_CHANNELS.output, (event: unknown) => {
      const { terminalId, data } = event as TerminalOutputEvent;

      // Buffer output so late-joining xterm instances can catch up
      const prev = outputBuffersRef.current.get(terminalId) ?? '';
      outputBuffersRef.current.set(terminalId, `${prev}${data}`.slice(-MAX_BUFFERED_OUTPUT));

      // Queue for batched write
      let queue = writeQueuesRef.current.get(terminalId);
      if (!queue) {
        queue = [];
        writeQueuesRef.current.set(terminalId, queue);
      }
      queue.push(data);

      // Schedule flush on next animation frame
      if (flushFrameRef.current === null) {
        flushFrameRef.current = requestAnimationFrame(flushWriteQueues);
      }

      const draft = inspectTerminalOutput(terminalId, data);
      if (draft) {
        useNotificationStore.getState().push(draft);
        dispatchNativeNotification(draft.title, draft.message, draft.severity);
      }
    });

    const unlistenState = window.orphix.on(TERMINAL_CHANNELS.state, (event: unknown) => {
      const { terminalId, snapshot } = event as TerminalStateEvent;
      setSessions((prev) => ({ ...prev, [terminalId]: snapshot }));
      if ((event as { linked?: boolean }).linked) {
        ensurePaneForSession(terminalId);
      }
    });

    const unlistenExit = window.orphix.on(TERMINAL_CHANNELS.exit, (event: unknown) => {
      const { terminalId, exitCode } = event as TerminalExitEvent;
      setSessions((prev) => {
        const existing = prev[terminalId];
        if (!existing) return prev;
        return { ...prev, [terminalId]: { ...existing, status: 'exited', exitCode } };
      });
      // Auto-close the terminal pane when the shell exits
      useCanvasStore.getState().closePaneBySessionId(terminalId);

      const draft = createTerminalExitNotification(terminalId, exitCode);
      if (draft) {
        useNotificationStore.getState().push(draft);
        dispatchNativeNotification(draft.title, draft.message, draft.severity);
      }
    });

    const unlistenError = window.orphix.on(TERMINAL_CHANNELS.error, (event: unknown) => {
      const { terminalId, message } = event as { terminalId: string; message: string };
      setSessions((prev) => {
        const existing = prev[terminalId];
        return {
          ...prev,
          [terminalId]: existing
            ? { ...existing, status: 'error', errorMessage: message }
            : toErrorSnapshot(terminalId, message),
        };
      });

      useNotificationStore.getState().push({
        source: "terminal",
        severity: "error",
        title: "Terminal error",
        message,
        terminalId,
        dedupeKey: `terminal:error:${terminalId}:${message.toLowerCase()}`,
      });
      dispatchNativeNotification("Terminal error", message, "error");
    });

    return () => {
      unlistenOutput();
      unlistenState();
      unlistenExit();
      unlistenError();
      if (flushFrameRef.current !== null) {
        cancelAnimationFrame(flushFrameRef.current);
        flushFrameRef.current = null;
      }
    };
  }, []);

  const createTerminal = useCallback(async (request: CreateTerminalRequest): Promise<TerminalSessionSnapshot> => {
    // Optimistically set a starting snapshot
    setSessions((prev) => ({
      ...prev,
      [request.terminalId]: prev[request.terminalId] ?? toStartingSnapshot(request.terminalId),
    }));

    // Retry logic for race with IPC handler registration
    const attemptCreate = async (attempt: number): Promise<TerminalSessionSnapshot> => {
      try {
        const snapshot = await window.orphix.invoke<TerminalSessionSnapshot>(
          TERMINAL_CHANNELS.create,
          request as unknown as Record<string, unknown>,
        );
        setSessions((prev) => ({ ...prev, [snapshot.terminalId]: snapshot }));
        return snapshot;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const shouldRetry = /no handler registered/i.test(message) && attempt < MAX_CREATE_RETRIES;
        if (shouldRetry) {
          await new Promise((r) => setTimeout(r, CREATE_RETRY_DELAY_MS));
          return attemptCreate(attempt + 1);
        }
        setSessions((prev) => ({
          ...prev,
          [request.terminalId]: toErrorSnapshot(request.terminalId, message),
        }));
        throw error;
      }
    };

    return attemptCreate(0);
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

  const listShells = useCallback(async (): Promise<ShellInfo[]> => {
    return window.orphix.invoke<ShellInfo[]>(TERMINAL_CHANNELS.listShells);
  }, []);

  const registerOutputSink = useCallback((terminalId: string, handler: TerminalOutputSink) => {
    let sinks = outputSinksRef.current.get(terminalId);
    if (!sinks) {
      sinks = new Set();
      outputSinksRef.current.set(terminalId, sinks);
    }
    sinks.add(handler);
    return () => {
      sinks!.delete(handler);
      if (sinks!.size === 0) {
        outputSinksRef.current.delete(terminalId);
      }
    };
  }, []);

  const getBufferedOutput = useCallback((terminalId: string): string => {
    return outputBuffersRef.current.get(terminalId) ?? '';
  }, []);

  const value = useMemo(() => ({
    sessions,
    getBufferedOutput,
    createTerminal,
    writeTerminal,
    resizeTerminal,
    killTerminal,
    listShells,
    registerOutputSink,
  }), [sessions, getBufferedOutput, createTerminal, writeTerminal, resizeTerminal, killTerminal, listShells, registerOutputSink]);

  return (
    <TerminalRuntimeContext.Provider value={value}>
      {children}
    </TerminalRuntimeContext.Provider>
  );
}
