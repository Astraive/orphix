import { useState, useEffect, useCallback, useRef } from "react";
import { useCanvasStore } from "./canvas-store";
import { TopBar } from "./TopBar";
import { LeftSidebar } from "./LeftSidebar";
import { SidePanel } from "./SidePanel";
import { Popup } from "./Popup";
import { TerminalPicker } from "../panels/terminal/TerminalPicker";
import { WorkspaceRow } from "./WorkspaceRow";
import { useTerminalRuntime } from "@terminal/renderer/context/useTerminalRuntime";
import type { ShellInfo } from "@terminal/shared/types";
import type { Rect } from "./layout-tree";

const OVERVIEW_SCALE = 0.35;
const TRANSITION_CANVAS = "850ms cubic-bezier(0.25, 1, 0.5, 1)";
const WS_GAP_VH = 0.8;

export function CanvasContainer() {
  const workspaces = useCanvasStore((s) => s.workspaces);
  const activeWsIdx = useCanvasStore((s) => s.activeWorkspaceIndex);
  const isOverview = useCanvasStore((s) => s.isOverview);

  const [sidebarPanel, setSidebarPanel] = useState<string | null>(null);
  const [popup, setPopup] = useState<string | null>(null);
  const [showTerminalPicker, setShowTerminalPicker] = useState(false);
  const [shells, setShells] = useState<ShellInfo[]>([]);

  const runtime = useTerminalRuntime();
  const initRef = useRef(false);
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

  // ── Actions ──

  const handleSplitPane = useCallback(async () => {
    try {
      const store = useCanvasStore.getState();
      const ws = store.workspaces[store.activeWorkspaceIndex];
      const win = ws?.windows[ws.activeWindowIndex];
      const pane = win ? win.paneData[win.focusedPaneId] : null;

      if (pane && !pane.sessionId) {
        const terminalId = crypto.randomUUID();
        await runtime.createTerminal({ terminalId, cols: 80, rows: 24 });
        store.setPaneSession(win!.focusedPaneId, terminalId);
      } else {
        const terminalId = crypto.randomUUID();
        const newPaneId = store.splitPane(terminalId, getActiveWindowBounds());
        if (!newPaneId) {
          console.warn("Split skipped because no pane has enough room.");
          return;
        }
        await runtime.createTerminal({ terminalId, cols: 80, rows: 24 });
      }
    } catch (err) {
      console.error("Failed to split pane:", err);
    }
  }, [getActiveWindowBounds, runtime]);

  const handleNewWindow = useCallback(async () => {
    try {
      const terminalId = crypto.randomUUID();
      await runtime.createTerminal({ terminalId, cols: 120, rows: 30 });
      const paneId = useCanvasStore.getState().addWindow();
      useCanvasStore.getState().setPaneSession(paneId, terminalId);
    } catch (err) {
      console.error("Failed to create window:", err);
    }
  }, [runtime]);

  const handleKillPane = useCallback(async () => {
    const store = useCanvasStore.getState();
    const ws = store.workspaces[store.activeWorkspaceIndex];
    if (!ws) return;
    const win = ws.windows[ws.activeWindowIndex];
    if (!win) return;
    const pane = win.paneData[win.focusedPaneId];
    if (pane?.sessionId) {
      try {
        await runtime.killTerminal({ terminalId: pane.sessionId });
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

      if (pane && !pane.sessionId) {
        const terminalId = crypto.randomUUID();
        await runtime.createTerminal({ terminalId, cols: 80, rows: 24, profileId: shell.id });
        store.setPaneSession(win!.focusedPaneId, terminalId);
      } else {
        const terminalId = crypto.randomUUID();
        const newPaneId = store.splitPane(terminalId, getActiveWindowBounds());
        if (!newPaneId) {
          console.warn("Split skipped because no pane has enough room.");
          return;
        }
        await runtime.createTerminal({ terminalId, cols: 80, rows: 24, profileId: shell.id });
      }
    } catch (err) {
      console.error("Failed to create terminal with shell:", err);
    }
  }, [getActiveWindowBounds, runtime]);

  // ── Keyboard ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      // Alt+Shift+Q: close window
      else if (code === "KeyQ" && shift) { store.closeWindow(); handled = true; }
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
    initRef.current = true;
    const ws = useCanvasStore.getState().workspaces[0];
    const win = ws?.windows[0];
    if (win) {
      const pane = win.paneData[win.focusedPaneId];
      if (pane && !pane.sessionId) handleSplitPane();
    }
  }, [handleSplitPane]);

  const wsStride = 100 + WS_GAP_VH;
  const translateY = -(activeWsIdx * wsStride);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden select-none" style={{ background: "var(--ox-bg)" }}>
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
              transform: isOverview ? `scale(${OVERVIEW_SCALE})` : "scale(1)",
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
    </div>
  );
}
