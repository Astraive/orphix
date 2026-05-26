import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckSquare,
  Clipboard,
  Columns2,
  Copy,
  Eraser,
  ExternalLink,
  Maximize2,
  Minimize2,
  Rows2,
  Terminal,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { TerminalViewport } from "@/features/terminal/components/TerminalViewport";
import { useCanvasStore } from "../stores/canvas-store";
import { useTerminalRuntime } from "@/features/terminal/hooks/useTerminalRuntime";
import { invoke } from "@/lib/ipc-client";
import { CHANNELS } from "@shared/ipc/channels";

interface TerminalPaneProps {
  paneId: string;
  sessionId: string | null;
  isActive: boolean;
  onFocus: () => void;
}

interface CtxItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: CtxItem[]; onClose: () => void }) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => { window.removeEventListener("click", close); window.removeEventListener("blur", close); };
  }, [onClose]);

  return (
    <div className="fixed z-[999] min-w-56 rounded-xl border py-1.5 shadow-xl"
      style={{ left: x, top: y, borderColor: "var(--orphix-color-base-border)", background: "var(--orphix-color-base-background)" }}>
      {items.map((item, i) => (
        item.label === "---" ? (
          <div key={i} className="my-1 h-px" style={{ background: "var(--orphix-color-base-border)" }} />
        ) : (
          <button key={i} onClick={(e) => { e.stopPropagation(); item.onClick?.(); onClose(); }} disabled={item.disabled}
            className="flex w-full items-center gap-3 px-4 py-2 min-h-[36px] text-left text-sm font-mono hover:bg-orphix-hover-subtle disabled:opacity-30"
            style={{ color: item.danger ? "var(--orphix-color-danger)" : "var(--orphix-color-text)" }}>
            {item.icon && <span className="w-4 flex items-center justify-center shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      ))}
    </div>
  );
}

export function TerminalPane({ paneId, sessionId, isActive, onFocus }: TerminalPaneProps) {
  const [ctx, setCtx] = useState<{ x: number; y: number; items: CtxItem[] } | null>(null);

  const splitPane = useCanvasStore((s) => s.splitPane);
  const closePane = useCanvasStore((s) => s.closePane);
  const addWindow = useCanvasStore((s) => s.addWindow);
  const movePaneFocus = useCanvasStore((s) => s.movePaneFocus);
  const toggleOverview = useCanvasStore((s) => s.toggleOverview);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const workspaces = useCanvasStore((s) => s.workspaces);
  const activeWsIdx = useCanvasStore((s) => s.activeWorkspaceIndex);
  const { killTerminal, createTerminal } = useTerminalRuntime();

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: CtxItem[] = [
      { label: "Copy selection", icon: <Copy size={16} />, onClick: () => document.execCommand("copy") },
      { label: "Paste", icon: <Clipboard size={16} />, onClick: async () => { const text = await navigator.clipboard.readText(); if (sessionId && text) invoke(CHANNELS.TERMINAL_WRITE, { terminalId: sessionId, data: text }); } },
      { label: "Clear terminal", icon: <Eraser size={16} />, onClick: () => { if (sessionId) invoke(CHANNELS.TERMINAL_WRITE, { terminalId: sessionId, data: "\x1b[2J\x1b[H" }); } },
      { label: "---" },
      { label: "Split horizontal", icon: <Columns2 size={16} />, onClick: () => { if (sessionId) splitPane(sessionId); } },
      { label: "Split vertical", icon: <Rows2 size={16} />, onClick: () => { if (sessionId) splitPane(sessionId); } },
      { label: "New terminal", icon: <Terminal size={16} />, onClick: () => { const id = `term-${Date.now()}`; createTerminal({ terminalId: id, cols: 120, rows: 30 }); splitPane(id); } },
      { label: "---" },
      { label: "Kill terminal", icon: <Trash2 size={16} />, danger: true, onClick: () => { if (sessionId) { killTerminal({ terminalId: sessionId }); closePane(); } } },
      { label: "Close pane", icon: <X size={16} />, danger: true, onClick: closePane },
      { label: "---" },
      { label: "Select All", icon: <CheckSquare size={18} />, onClick: () => {
        if (sessionId) {
          invoke(CHANNELS.TERMINAL_WRITE, { terminalId: sessionId, data: "\x1b" });
        }
      }},
      { label: "---" },
      { label: "Move focus left", icon: <ArrowLeft size={16} />, onClick: () => movePaneFocus("left") },
      { label: "Move focus right", icon: <ArrowRight size={16} />, onClick: () => movePaneFocus("right") },
      { label: "Move focus up", icon: <ArrowUp size={16} />, onClick: () => movePaneFocus("up") },
      { label: "Move focus down", icon: <ArrowDown size={16} />, onClick: () => movePaneFocus("down") },
      { label: "---" },
      { label: "Move to new window", icon: <ExternalLink size={16} />, disabled: !sessionId, onClick: () => {
        if (!sessionId) return;
        const newPaneId = addWindow();
        useCanvasStore.getState().setPaneSession(newPaneId, sessionId);
        closePane();
      }},
      { label: "Move to workspace ↑", icon: <ArrowUp size={16} />, disabled: activeWsIdx <= 0, onClick: () => {
        if (!sessionId) return;
        useCanvasStore.getState().moveWorkspace("up");
        const newPaneId = useCanvasStore.getState().splitPane(sessionId);
        if (newPaneId) closePane();
      }},
      { label: "Move to workspace ↓", icon: <ArrowDown size={16} />, disabled: activeWsIdx >= workspaces.length - 1, onClick: () => {
        if (!sessionId) return;
        useCanvasStore.getState().moveWorkspace("down");
        const newPaneId = useCanvasStore.getState().splitPane(sessionId);
        if (newPaneId) closePane();
      }},
      { label: "---" },
      { label: "Zoom in", icon: <ZoomIn size={16} />, onClick: () => setZoom(0.1) },
      { label: "Zoom out", icon: <ZoomOut size={16} />, onClick: () => setZoom(-0.1) },
      { label: "---" },
      { label: "Toggle overview", icon: <Maximize2 size={16} />, onClick: toggleOverview },
    ];

    setCtx({ x: e.clientX, y: e.clientY, items });
  }, [sessionId, splitPane, closePane, addWindow, movePaneFocus, toggleOverview, setZoom, killTerminal, createTerminal, workspaces.length, activeWsIdx]);

  if (!sessionId) {
    return (
      <div
        className="w-full h-full min-w-0 min-h-0 overflow-hidden flex items-center justify-center"
        style={{
          background: "var(--orphix-terminal-pane-bg)",
          borderRadius: "10px",
          border: "1.5px solid var(--orphix-terminal-pane-border)",
          boxSizing: "border-box",
        }}
        onClick={onFocus}
        onContextMenu={handleContextMenu}
      >
        <span className="text-sm text-ox-muted/40 font-mono tracking-wider">
          Alt+Enter to open terminal
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={onFocus}
        onContextMenu={handleContextMenu}
        className="w-full h-full min-w-0 min-h-0 overflow-hidden"
        style={{
          position: "relative",
          borderRadius: "10px",
          border: isActive
            ? "1.5px solid var(--orphix-terminal-pane-border-active)"
            : "1.5px solid var(--orphix-terminal-pane-border)",
          background: "var(--orphix-terminal-pane-bg)",
          cursor: "text",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
          boxShadow: isActive ? "var(--orphix-terminal-pane-shadow-active)" : "var(--orphix-terminal-pane-shadow)",
        }}
      >
        <TerminalViewport terminalId={sessionId} isActive={isActive} />
      </div>
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={() => setCtx(null)} />}
    </>
  );
}
