import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  BellDot,
  Terminal,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { TerminalViewport } from "@/features/terminal/components/TerminalViewport";
import { useCanvasStore } from "../stores/canvas-store";
import { useTerminalRuntime } from "@/features/terminal/hooks/useTerminalRuntime";
import { useTerminalSettingsStore } from "@/features/terminal/stores/terminal-settings-store";
import { useTerminalFontStore } from "@/features/terminal/stores/terminal-font-store";
import { useTheme } from "@/providers/ThemeProvider";
import { invoke } from "@/lib/ipc-client";
import { CHANNELS } from "@shared/ipc/channels";
import { resolveContextMenuPosition } from "../lib/context-menu-position";
import {
  getTerminalUnreadSeverity,
  useNotificationStore,
} from "@/features/notifications/notification-store";

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
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => { window.removeEventListener("click", close); window.removeEventListener("blur", close); };
  }, [onClose]);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    setPosition(resolveContextMenuPosition({ x, y }, menuRef.current.offsetWidth, menuRef.current.offsetHeight));
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[999] min-w-56 rounded-xl border py-1.5 shadow-xl anim-scale-in"
      style={{
        left: position.left,
        top: position.top,
        borderColor: "var(--orphix-color-base-border)",
        background: "var(--orphix-color-base-background)",
      }}
    >
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
  const headerPosition = useTerminalSettingsStore((s) => s.headerPosition);
  const { activeTheme } = useTheme();
  const { selectedFont } = useTerminalFontStore();
  const notifications = useNotificationStore((state) => state.notifications);
  const markTerminalRead = useNotificationStore((state) => state.markTerminalRead);
  const defaultFont = activeTheme.fonts.fonts.families.terminal.family;
  const resolvedFont = selectedFont ?? defaultFont;
  const terminalUnreadSeverity = getTerminalUnreadSeverity(notifications, sessionId);

  useEffect(() => {
    if (isActive && sessionId) {
      markTerminalRead(sessionId);
    }
  }, [isActive, markTerminalRead, sessionId]);

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

  const headerBar = headerPosition !== "hidden" && (
    <div
      className="flex items-center gap-2 px-3 shrink-0"
      style={{
        height: "28px",
        background: "var(--orphix-terminal-pane-header-bg, var(--orphix-terminal-status-bg))",
        borderBottom: headerPosition === "top" ? "1px solid var(--orphix-terminal-pane-border)" : "none",
        borderTop: headerPosition === "bottom" ? "1px solid var(--orphix-terminal-pane-border)" : "none",
        fontFamily: resolvedFont ? `"${resolvedFont}", monospace` : "var(--orphix-font-mono)",
        fontSize: "11px",
        color: "var(--orphix-terminal-status-fg)",
        order: headerPosition === "bottom" ? 1 : -1,
      }}
      onClick={onFocus}
    >
      <Terminal size={12} />
      <span className="truncate opacity-70">Terminal</span>
      {sessionId && (
        <span className="truncate opacity-40 hidden sm:inline">{sessionId}</span>
      )}
      {terminalUnreadSeverity && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
          style={{
            color: terminalUnreadSeverity === "error"
              ? "#fecaca"
              : terminalUnreadSeverity === "warning"
                ? "#fde68a"
                : terminalUnreadSeverity === "success"
                  ? "#bbf7d0"
                  : "var(--orphix-color-primary)",
            background: terminalUnreadSeverity === "error"
              ? "rgba(239,68,68,0.18)"
              : terminalUnreadSeverity === "warning"
                ? "rgba(245,158,11,0.18)"
                : terminalUnreadSeverity === "success"
                  ? "rgba(16,185,129,0.18)"
                  : "color-mix(in srgb, var(--orphix-color-primary) 18%, transparent)",
          }}
        >
          <BellDot size={10} />
          {terminalUnreadSeverity}
        </span>
      )}
      <div className="flex-1" />
      <button
        onClick={(e) => { e.stopPropagation(); if (sessionId) splitPane(sessionId); }}
        className="opacity-40 hover:opacity-100 transition-opacity"
        title="Split"
      >
        <Columns2 size={12} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); closePane(); }}
        className="opacity-40 hover:opacity-100 transition-opacity"
        title="Close"
      >
        <X size={12} />
      </button>
    </div>
  );

  return (
    <>
      <div
        onClick={onFocus}
        onContextMenu={handleContextMenu}
        className="w-full h-full min-w-0 min-h-0 overflow-hidden flex flex-col"
        style={{
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
        {headerPosition === "top" && headerBar}
        <div className="flex-1 min-h-0">
          <TerminalViewport terminalId={sessionId} isActive={isActive} />
        </div>
        {headerPosition === "bottom" && headerBar}
      </div>
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={() => setCtx(null)} />}
    </>
  );
}
