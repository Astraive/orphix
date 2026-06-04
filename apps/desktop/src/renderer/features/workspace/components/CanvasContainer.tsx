import { useState, useEffect, useCallback, useRef } from "react";
import { useCanvasStore } from "../stores/canvas-store";
import { TopBar } from "./TopBar";
import { LeftSidebar } from "./LeftSidebar";
import { SidePanel } from "./SidePanel";
import { Popup } from "./Popup";
import { TerminalPicker } from "@/features/terminal/components/TerminalPicker";
import { WorkspaceRow } from "./WorkspaceRow";
import { useTerminalRuntime } from "@/features/terminal/hooks/useTerminalRuntime";
import type { ShellInfo } from "@shared/terminal/types";
import type { Rect } from "../lib/layout-tree";
import { getWorkspaceCwd } from "../lib/workspace-cwd";
import { useWalkawayStore } from "@/features/link/stores/walkaway-store";
import { Lock, Unlock } from "lucide-react";
import type { BrowserSessionSummaryDto } from "@shared/types/common";

import type { PaneData } from "../stores/canvas-store";

function getSessionId(pane: PaneData | undefined): string | null {
  if (!pane || pane.kind === "editor") return null;
  return pane.sessionId;
}

const OVERVIEW_SCALE = 0.35;
const TRANSITION_CANVAS = "850ms cubic-bezier(0.25, 1, 0.5, 1)";
const WS_GAP_VH = 0.8;

export function CanvasContainer() {
  const workspaces = useCanvasStore((s) => s.workspaces);
  const activeWsIdx = useCanvasStore((s) => s.activeWorkspaceIndex);
  const isOverview = useCanvasStore((s) => s.isOverview);
  const zoomLevel = useCanvasStore((s) => s.zoomLevel);
  const walkawayEnabled = useWalkawayStore((s) => s.enabled);
  const setWalkawayEnabled = useWalkawayStore((s) => s.setEnabled);

  const [sidebarPanel, setSidebarPanel] = useState<string | null>(null);
  const [popup, setPopup] = useState<string | null>(null);
  const [showTerminalPicker, setShowTerminalPicker] = useState(false);
  const [shells, setShells] = useState<ShellInfo[]>([]);
  const [workspaceCwd, setWorkspaceCwd] = useState<string>("");
  const [browserSessions, setBrowserSessions] = useState<BrowserSessionSummaryDto[]>([]);

  const runtime = useTerminalRuntime();
  const initRef = useRef(false);
  const workspacePublishTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const getActiveWindowBounds = useCallback((): Rect => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: 0,
      y: 0,
      width: Math.max(0, Math.floor(rect?.width ?? window.innerWidth)),
      height: Math.max(0, Math.floor(rect?.height ?? window.innerHeight)),
    };
  }, []);

  const getFocusedTerminalCwd = useCallback((): string => {
    const store = useCanvasStore.getState();
    const ws = store.workspaces[store.activeWorkspaceIndex];
    const win = ws?.windows[ws.activeWindowIndex];
    const pane = win ? win.paneData[win.focusedPaneId] : null;
    const sessionId = getSessionId(pane ?? undefined);
    const rawCwd = sessionId ? runtime.sessions[sessionId]?.cwd : null;
    // Ignore bare drive roots (e.g. "C:\") — fall back to workspace cwd
    if (rawCwd && /^[A-Za-z]:\\?$/.test(rawCwd.trim())) return workspaceCwd;
    return rawCwd || workspaceCwd;
  }, [runtime.sessions, workspaceCwd]);

  useEffect(() => {
    getWorkspaceCwd().then(setWorkspaceCwd).catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBrowserSessions = async () => {
      try {
        const sessions = await window.orphix?.browser?.listSessions?.();
        if (!cancelled && Array.isArray(sessions)) {
          setBrowserSessions(sessions);
        }
      } catch (error) {
        console.error("Failed to load browser sessions:", error);
      }
    };

    loadBrowserSessions();
    const unsubscribe = window.orphix?.browser?.onSessionsChanged?.((sessions) => {
      if (!cancelled) {
        setBrowserSessions(Array.isArray(sessions) ? sessions : []);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (workspacePublishTimerRef.current !== null) {
      window.clearTimeout(workspacePublishTimerRef.current);
    }

    workspacePublishTimerRef.current = window.setTimeout(() => {
      const browserPaneLookup = new Map<string, Array<Record<string, unknown>>>();
      for (const session of browserSessions) {
        for (const tab of session.tabs) {
          if (!tab.attachment?.workspaceId || !tab.attachment.windowId) continue;
          const key = `${tab.attachment.workspaceId}:${tab.attachment.windowId}`;
          const panes = browserPaneLookup.get(key) ?? [];
          panes.push({
            id: tab.attachment.paneId || `browser:${tab.id}`,
            kind: "browser",
            title: tab.title || tab.url || "Browser",
            browserSessionId: session.id,
            tabId: tab.id,
            url: tab.url,
            snapshotDataUrl: tab.snapshotDataUrl ?? null,
          });
          browserPaneLookup.set(key, panes);
        }
      }

      const focusedPath = getFocusedTerminalCwd() || workspaceCwd || ".";
      const snapshot = {
        snapshotVersion: 2,
        workspaces: workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.title,
          windows: workspace.windows.map((win, index) => {
            const terminalPanes = Object.values(win.paneData)
              .filter((pane) => pane.kind !== "editor" && pane.sessionId)
              .map((pane) => {
                const session = pane.sessionId ? runtime.sessions[pane.sessionId] : null;
                return {
                  id: pane.id,
                  kind: "terminal",
                  title: session?.shell || "Terminal",
                  sessionId: pane.sessionId,
                  status: session?.status || "starting",
                  cwd: session?.cwd || null,
                  shell: session?.shell || null,
                };
              });
            const editorPanes = Object.values(win.paneData)
              .filter((pane): pane is Extract<PaneData, { kind: "editor" }> => pane.kind === "editor")
              .map((pane) => ({
                id: pane.id,
                kind: "editor",
                title: pane.filePath.split(/[\\/]/).pop() || "Editor",
                filePath: pane.filePath,
              }));
            const browserPanes = browserPaneLookup.get(`${workspace.id}:${win.id}`) ?? [];
            const terminals = terminalPanes.map((pane) => ({
              id: pane.sessionId,
              name: pane.title,
              status: pane.status,
              cwd: pane.cwd,
              shell: pane.shell,
            }));
            return {
              id: win.id,
              name: `Window ${index + 1}`,
              panes: [...terminalPanes, ...editorPanes, ...browserPanes],
              terminals,
            };
          }),
        })),
        browserSessions,
        capabilities: {
          filesystem: {
            root: workspaceCwd || focusedPath,
            canWrite: true,
            focusedPath,
          },
          git: {
            available: Boolean(focusedPath),
            repoPath: focusedPath || null,
            branch: null,
          },
          docker: {
            available: true,
            workspacePath: focusedPath || workspaceCwd || null,
            hasCompose: false,
            runningContainers: 0,
          },
          browser: {
            available: true,
            sessionCount: browserSessions.length,
          },
          notifications: {
            available: true,
            unreadCount: 0,
          },
        },
      };
      window.orphix?.link?.updateWorkspace?.(snapshot).catch(() => {});
    }, 120);

    return () => {
      if (workspacePublishTimerRef.current !== null) {
        window.clearTimeout(workspacePublishTimerRef.current);
        workspacePublishTimerRef.current = null;
      }
    };
  }, [browserSessions, getFocusedTerminalCwd, runtime.sessions, workspaceCwd, workspaces]);

  // ── Actions ──

  const handleSplitPane = useCallback(async () => {
    try {
      const store = useCanvasStore.getState();
      const ws = store.workspaces[store.activeWorkspaceIndex];
      const win = ws?.windows[ws.activeWindowIndex];
      const pane = win ? win.paneData[win.focusedPaneId] : null;

      if (pane && !getSessionId(pane)) {
        const terminalId = crypto.randomUUID();
        store.setPaneSession(win!.focusedPaneId, terminalId);
        await runtime.createTerminal({ terminalId, cols: 80, rows: 24, cwd: getFocusedTerminalCwd() });
      } else {
        const terminalId = crypto.randomUUID();
        const newPaneId = store.splitPane(terminalId, getActiveWindowBounds());
        if (!newPaneId) {
          console.warn("Split skipped because no pane has enough room.");
          return;
        }
        await runtime.createTerminal({ terminalId, cols: 80, rows: 24, cwd: getFocusedTerminalCwd() });
      }
    } catch (err) {
      console.error("Failed to split pane:", err);
    }
  }, [getActiveWindowBounds, getFocusedTerminalCwd, runtime]);

  const handleNewWindow = useCallback(async () => {
    try {
      const terminalId = crypto.randomUUID();
      const paneId = useCanvasStore.getState().addWindow();
      useCanvasStore.getState().setPaneSession(paneId, terminalId);
      await runtime.createTerminal({ terminalId, cols: 120, rows: 30, cwd: getFocusedTerminalCwd() });
    } catch (err) {
      console.error("Failed to create window:", err);
    }
  }, [getFocusedTerminalCwd, runtime]);

  const handleKillPane = useCallback(async () => {
    const store = useCanvasStore.getState();
    const ws = store.workspaces[store.activeWorkspaceIndex];
    if (!ws) return;
    const win = ws.windows[ws.activeWindowIndex];
    if (!win) return;
    const pane = win.paneData[win.focusedPaneId];
    const sid = getSessionId(pane);
    if (sid) {
      try {
        await runtime.killTerminal({ terminalId: sid });
      } catch {}
    }
    store.closePane();
  }, [runtime]);

  const handleOpenTerminalPicker = useCallback(async () => {
    try {
      const list = await runtime.listShells();
      setShells(list);
      setShowTerminalPicker(true);
    } catch (err) {
      console.error("Failed to list shells:", err);
    }
  }, [runtime]);

  const handlePickShell = useCallback(async (shell: ShellInfo) => {
    setShowTerminalPicker(false);
    try {
      const store = useCanvasStore.getState();
      const ws = store.workspaces[store.activeWorkspaceIndex];
      const win = ws?.windows[ws.activeWindowIndex];
      const pane = win ? win.paneData[win.focusedPaneId] : null;

      if (pane && !getSessionId(pane)) {
        const terminalId = crypto.randomUUID();
        store.setPaneSession(win!.focusedPaneId, terminalId);
        await runtime.createTerminal({ terminalId, cols: 80, rows: 24, cwd: getFocusedTerminalCwd(), profileId: shell.id });
      } else {
        const terminalId = crypto.randomUUID();
        const newPaneId = store.splitPane(terminalId, getActiveWindowBounds());
        if (!newPaneId) {
          console.warn("Split skipped because no pane has enough room.");
          return;
        }
        await runtime.createTerminal({ terminalId, cols: 80, rows: 24, cwd: getFocusedTerminalCwd(), profileId: shell.id });
      }
    } catch (err) {
      console.error("Failed to create terminal with shell:", err);
    }
  }, [getActiveWindowBounds, getFocusedTerminalCwd, runtime]);

  // ── Keyboard ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (useWalkawayStore.getState().enabled) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      const store = useCanvasStore.getState();
      const key = e.key.toLowerCase();
      const code = e.code;

      // Overview mode - plain arrows
      if (store.isOverview) {
        let handled = false;
        if (key === "arrowup") { store.moveWorkspace("up"); handled = true; }
        else if (key === "arrowdown") { store.moveWorkspace("down"); handled = true; }
        else if (key === "arrowleft") { store.moveWindowFocus("left"); handled = true; }
        else if (key === "arrowright") { store.moveWindowFocus("right"); handled = true; }
        else if (key === "enter") { store.toggleOverview(); handled = true; }
        else if (key === "escape") { store.toggleOverview(); handled = true; }
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        return;
      }

      // Terminal picker open
      if (showTerminalPicker) {
        if (key === "escape") {
          setShowTerminalPicker(false);
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab: cycle panes (= tabs in tab mode) in the active window
      if (e.ctrlKey && key === "tab") {
        store.cycleFocusedPane(e.shiftKey ? "prev" : "next");
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      // Ctrl+Plus/Minus: zoom
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (key === "=" || key === "+") { store.setZoom(0.1); e.preventDefault(); return; }
        if (key === "-") { store.setZoom(-0.1); e.preventDefault(); return; }
      }

      // Normal mode: requires Alt
      if (!e.altKey) return;

      const shift = e.shiftKey;
      let handled = false;

      // Alt+Shift+Enter: terminal picker
      if (key === "enter" && shift) { handleOpenTerminalPicker(); handled = true; }
      // Alt+Enter: split pane (default shell)
      else if (key === "enter" && !shift) { handleSplitPane(); handled = true; }
      // Alt+Shift+N: new workspace
      else if (code === "KeyN" && shift) { store.addWorkspace(); handled = true; }
      // Alt+N: new window
      else if (code === "KeyN" && !shift) { handleNewWindow(); handled = true; }
      // Alt+Q: close pane
      else if (code === "KeyQ" && !shift) { handleKillPane(); handled = true; }
      // Alt+Shift+Q: close workspace
      else if (code === "KeyQ" && shift) { store.closeWorkspace(); handled = true; }
      // Window focus
      else if (key === "arrowleft" && shift) { store.moveWindowFocus("left"); handled = true; }
      else if (key === "arrowright" && shift) { store.moveWindowFocus("right"); handled = true; }
      // Workspace
      else if (key === "arrowup" && shift) { store.moveWorkspace("up"); handled = true; }
      else if (key === "arrowdown" && shift) { store.moveWorkspace("down"); handled = true; }
      // Pane focus
      else if ((key === "arrowleft" || key === "h") && !shift) { store.movePaneFocus("left"); handled = true; }
      else if ((key === "arrowright" || key === "l") && !shift) { store.movePaneFocus("right"); handled = true; }
      else if ((key === "arrowup" || key === "k") && !shift) { store.movePaneFocus("up"); handled = true; }
      else if ((key === "arrowdown" || key === "j") && !shift) { store.movePaneFocus("down"); handled = true; }
      // Jump workspace
      else if (/^Digit[1-9]$/.test(code) && !shift) { store.jumpToWorkspace(parseInt(code[5], 10) - 1); handled = true; }
      else if (code === "Digit0" && !shift) { store.jumpToWorkspace(9); handled = true; }
      // Overview
      else if (code === "KeyO" && !shift) { store.toggleOverview(); handled = true; }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleSplitPane, handleNewWindow, handleKillPane, handleOpenTerminalPicker, showTerminalPicker]);

  // Auto-create first terminal on mount
  useEffect(() => {
    if (initRef.current) return;
    if (!workspaceCwd) return;
    initRef.current = true;
    const ws = useCanvasStore.getState().workspaces[0];
    const win = ws?.windows[0];
    if (win) {
      const pane = win.paneData[win.focusedPaneId];
      if (pane && !getSessionId(pane)) handleSplitPane();
    }
  }, [handleSplitPane, workspaceCwd]);

  const wsStride = 100 + WS_GAP_VH;
  const translateY = -(activeWsIdx * wsStride);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden select-none" style={{ background: "var(--orphix-color-base-background)" }}>
      <TopBar visible={true} popup={popup} onTogglePopup={setPopup} />
      <Popup popup={popup} onClose={() => setPopup(null)} />

      <div className="flex flex-1 min-h-0">
        <LeftSidebar activePanel={sidebarPanel} onTogglePanel={setSidebarPanel} visible={true} />
        <SidePanel activePanel={sidebarPanel} onClose={() => setSidebarPanel(null)} />

        <div ref={canvasRef} className="flex-1 min-w-0 relative overflow-hidden">
          <div
            className="w-full h-full"
            style={{
              transition: `transform ${TRANSITION_CANVAS}`,
              transform: isOverview ? `scale(${OVERVIEW_SCALE})` : `scale(${zoomLevel})`,
              transformOrigin: "center center",
            }}
          >
            <div
              className="w-full h-full"
              style={{
                transition: `transform ${TRANSITION_CANVAS}`,
                transform: `translateY(${translateY}vh)`,
              }}
            >
              {workspaces.map((ws, wsIdx) => (
                <WorkspaceRow
                  key={ws.id}
                  workspace={ws}
                  wsIdx={wsIdx}
                  isActiveWorkspace={wsIdx === activeWsIdx}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Picker Popup */}
      {showTerminalPicker && (
        <TerminalPicker
          shells={shells}
          onSelect={handlePickShell}
          onClose={() => setShowTerminalPicker(false)}
        />
      )}

      {walkawayEnabled && (
        <div
          className="fixed inset-0 z-[900] flex items-start justify-end bg-black/45 backdrop-blur-[2px]"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setWalkawayEnabled(false)}
            className="m-3 inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-xl transition-colors hover:bg-white/10"
            style={{
              color: "var(--orphix-color-text)",
              background: "color-mix(in srgb, var(--orphix-color-base-surface) 88%, transparent)",
              borderColor: "var(--orphix-color-base-border)",
              WebkitAppRegion: "no-drag",
            }}
            title="Unlock Walkaway mode"
          >
            <Lock size={16} strokeWidth={1.75} />
            <span>Walkaway mode</span>
            <Unlock size={15} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}
