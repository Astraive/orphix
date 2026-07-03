import { useState, useRef, useCallback, useEffect } from "react";
import { Bell, Link2, StickyNote, Settings, Minus, Square, X, Lock, LayoutGrid, Columns2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@orphix/ui";
import { useCanvasStore } from "../stores/canvas-store";
import { useTheme } from "@/providers/ThemeProvider";
import { cn } from "@/lib/cn";
import { useWalkawayStore } from "@/features/link/stores/walkaway-store";
import {
  getTerminalUnreadSeverity,
  getUnreadCount,
  useNotificationStore,
} from "@/features/notifications/notification-store";
import { pickHighestNotificationSeverity } from "@orphix/types";

interface TopBarProps {
  visible: boolean;
  popup: string | null;
  onTogglePopup: (popup: string | null) => void;
}

const PREVIEW_SCALE = 0.22;

// Pseudo-random seeded generator for consistent line widths
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function renderWindowThumbnail(
  windowEl: HTMLElement,
  colors: ReturnType<typeof useTheme>["activeTheme"]["colors"]["colors"],
  term: ReturnType<typeof useTheme>["activeTheme"]["terminal"]["terminal"],
): HTMLCanvasElement | null {
  const rect = windowEl.getBoundingClientRect();
  const w = Math.round(rect.width * PREVIEW_SCALE);
  const h = Math.round(rect.height * PREVIEW_SCALE);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Window background
  ctx.fillStyle = term.pane.background;
  ctx.fillRect(0, 0, w, h);

  // Find pane containers
  const paneEls = Array.from(windowEl.querySelectorAll("[data-pane-id]")) as HTMLElement[];

  if (paneEls.length === 0) {
    // Empty window placeholder
    ctx.fillStyle = term.pane.foreground;
    ctx.globalAlpha = 0.2;
    ctx.font = `bold ${Math.max(5, Math.round(9 * PREVIEW_SCALE))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("empty", w / 2, h / 2);
    ctx.globalAlpha = 1;
    // Border
    ctx.strokeStyle = term.pane.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    return canvas;
  }

  for (let pi = 0; pi < paneEls.length; pi++) {
    const paneEl = paneEls[pi];
    const pr = paneEl.getBoundingClientRect();
    const px = (pr.left - rect.left) * PREVIEW_SCALE;
    const py = (pr.top - rect.top) * PREVIEW_SCALE;
    const pw = pr.width * PREVIEW_SCALE;
    const ph = pr.height * PREVIEW_SCALE;

    if (pw < 2 || ph < 2) continue;

    // Pane background
    ctx.fillStyle = term.pane.background;
    ctx.fillRect(px, py, pw, ph);

    // Try to capture xterm canvas
    let captured = false;
    const xtermCanvases = paneEl.querySelectorAll(".xterm-screen canvas") as NodeListOf<HTMLCanvasElement>;
    for (const xtermCanvas of xtermCanvases) {
      const cr = xtermCanvas.getBoundingClientRect();
      const cx = (cr.left - rect.left) * PREVIEW_SCALE;
      const cy = (cr.top - rect.top) * PREVIEW_SCALE;
      const cw = cr.width * PREVIEW_SCALE;
      const ch = cr.height * PREVIEW_SCALE;
      try {
        ctx.drawImage(xtermCanvas, cx, cy, cw, ch);
        captured = true;
      } catch {
        // tainted
      }
    }

    if (!captured) {
      // Draw themed terminal content simulation
      const fontSize = Math.max(4, Math.round(12 * PREVIEW_SCALE));
      const lineH = Math.max(3, Math.round(14 * PREVIEW_SCALE));
      const padX = Math.max(2, Math.round(6 * PREVIEW_SCALE));
      const padY = Math.max(2, Math.round(6 * PREVIEW_SCALE));
      let y = py + padY;
      let lineIdx = pi * 37; // seed per pane

      // ANSI-like colors from the theme
      const lineColors = [
        colors.brand.primary,       // prompt / command
        colors.terminal.green,      // success output
        colors.terminal.cyan,       // info
        colors.terminal.yellow,     // warning
        colors.text.textMuted,      // regular output
        colors.text.textSubtle,     // dim output
        colors.terminal.magenta,    // special
        colors.terminal.blue,       // paths
        colors.brand.accent,        // accent
      ];

      while (y + lineH < py + ph - padY) {
        lineIdx++;
        const r = seededRandom(lineIdx);
        const r2 = seededRandom(lineIdx + 1000);
        const r3 = seededRandom(lineIdx + 2000);

        // Determine line type
        if (r < 0.12) {
          // Prompt line: colored prefix + command
          ctx.fillStyle = colors.brand.primary;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(px + padX, y, Math.max(3, pw * 0.08), Math.max(1, lineH * 0.7));
          ctx.fillStyle = colors.text.text;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(px + padX + pw * 0.1, y, Math.max(3, pw * (0.2 + r2 * 0.45)), Math.max(1, lineH * 0.7));
        } else if (r < 0.2) {
          // Separator / divider
          ctx.fillStyle = colors.base.border;
          ctx.globalAlpha = 0.6;
          ctx.fillRect(px + padX, y + lineH * 0.35, pw - padX * 2, Math.max(1, lineH * 0.2));
        } else {
          // Regular output line
          const color = lineColors[Math.floor(r3 * lineColors.length)];
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.7 + r2 * 0.3;
          const lineW = pw * (0.3 + r2 * 0.55);
          ctx.fillRect(px + padX, y, Math.max(3, lineW), Math.max(1, lineH * 0.65));

          // Sometimes add a second segment on the same line
          if (r3 > 0.6) {
            const seg2Color = lineColors[Math.floor(seededRandom(lineIdx + 3000) * lineColors.length)];
            ctx.fillStyle = seg2Color;
            ctx.globalAlpha = 0.55;
            const seg2Start = px + padX + lineW + Math.max(1, pw * 0.03);
            const seg2W = pw * (0.08 + seededRandom(lineIdx + 4000) * 0.2);
            if (seg2Start + seg2W < px + pw - padX) {
              ctx.fillRect(seg2Start, y, Math.max(2, seg2W), Math.max(1, lineH * 0.65));
            }
          }
        }

        ctx.globalAlpha = 1;
        y += lineH;
      }

      // Cursor blink indicator
      const cursorY = py + padY + Math.floor((ph - padY * 2) / lineH / 2) * lineH;
      ctx.fillStyle = colors.brand.primary;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(px + padX, cursorY, Math.max(2, pw * 0.04), Math.max(1, lineH * 0.8));
      ctx.globalAlpha = 1;
    }

    // Pane border
    const isActive = paneEl.querySelector(".terminal-viewport-shell") !== null;
    ctx.strokeStyle = isActive ? term.pane.borderActive : term.pane.border;
    ctx.lineWidth = isActive ? 1.5 : 1;
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

    // Scrollbar indicator (right edge)
    const scrollbarH = ph * 0.25;
    const scrollbarY = py + (ph - scrollbarH) * 0.3;
    ctx.fillStyle = term.scrollbar.thumb;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(px + pw - 2, scrollbarY, 1.5, scrollbarH);
    ctx.globalAlpha = 1;
  }

  // Active pane glow
  ctx.strokeStyle = term.pane.borderActive;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

  return canvas;
}

export function TopBar({ visible, popup, onTogglePopup }: TopBarProps) {
  const workspaces = useCanvasStore((s) => s.workspaces);
  const activeWsIdx = useCanvasStore((s) => s.activeWorkspaceIndex);
  const walkawayEnabled = useWalkawayStore((s) => s.enabled);
  const toggleWalkaway = useWalkawayStore((s) => s.toggle);
  const layoutMode = useCanvasStore((s) => s.workspaces[s.activeWorkspaceIndex]?.layoutMode ?? "tiling");
  const toggleLayoutMode = useCanvasStore((s) => s.toggleWorkspaceLayoutMode);
  const { activeTheme } = useTheme();
  const notifications = useNotificationStore((state) => state.notifications);

  const activeWs = workspaces[activeWsIdx];
  const windows = activeWs?.windows ?? [];
  const activeWinIdx = activeWs?.activeWindowIndex ?? 0;
  const unreadCount = getUnreadCount(notifications);

  const [hoveredWinIdx, setHoveredWinIdx] = useState<number | null>(null);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const circleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const leaveTimerRef = useRef<number | null>(null);

  const term = activeTheme.terminal?.terminal ?? {
    pane: { background: "#0a0a0a", foreground: "#eee", border: "#333", borderActive: "#888", borderHover: "#555", borderDisabled: "#444", shadow: "none", shadowActive: "none" },
    tab: { background: "#111", activeBackground: "#0a0a0a", hoverBackground: "#1a1a1a", foreground: "#888", activeForeground: "#eee", disabledForeground: "#444", border: "#333" },
    status: { background: "rgba(0,0,0,0.2)", foreground: "rgba(255,255,255,0.3)" },
    scrollbar: { thumb: "#444", thumbHover: "#666", track: "transparent" },
    selection: { background: "rgba(255,255,255,0.1)", foreground: "#eee" },
  };
  const colors = activeTheme.colors?.colors ?? {
    brand: { primary: "#888", primaryForeground: "#fff", secondary: "#666", secondaryForeground: "#fff", accent: "#aaa", accentForeground: "#fff" },
    terminal: { green: "#8f8", cyan: "#8ff", yellow: "#ff8", magenta: "#f8f", blue: "#88f", background: "#0a0a0a", foreground: "#eee", cursor: "#eee", cursorAccent: "#000", selectionBackground: "#333", black: "#000", red: "#f00", white: "#fff", brightBlack: "#555", brightRed: "#f55", brightGreen: "#5f5", brightYellow: "#ff5", brightBlue: "#55f", brightMagenta: "#f5f", brightCyan: "#5ff", brightWhite: "#fff" },
    text: { text: "#eee", textMuted: "#888", textSubtle: "#666", textDisabled: "#444", textInverse: "#000", textAccent: "#aaa" },
    base: { background: "#0a0a0a", foreground: "#eee", surface: "#111", surfaceMuted: "#1a1a1a", surfaceElevated: "#222", surfaceDeep: "#050505", surfaceHover: "#1a1a1a", surfaceActive: "#222", border: "#333", borderMuted: "#222", borderStrong: "#555", overlay: "rgba(0,0,0,0.5)", ring: "#888" },
    status: { success: "#8f8", successForeground: "#000", warning: "#ff8", warningForeground: "#000", danger: "#f88", dangerForeground: "#000", info: "#88f", infoForeground: "#fff" },
    agents: { agentRunning: "#8f8", agentIdle: "#888", agentError: "#f88", agentPaused: "#ff8" },
    syntax: { keyword: "#f8f", string: "#8f8", number: "#ff8", boolean: "#8ff", comment: "#666", function: "#88f", variable: "#eee", type: "#8ff", className: "#8ff", constant: "#ff8", operator: "#888", punctuation: "#666", property: "#88f", tag: "#f88", attribute: "#ff8" },
  };

  const handleCircleEnter = useCallback((idx: number) => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    setHoveredWinIdx(idx);

    const circle = circleRefs.current[idx];
    if (circle) {
      const rect = circle.getBoundingClientRect();
      setPreviewPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    }

    requestAnimationFrame(() => {
      const win = windows[idx];
      if (!win) return;

      const windowEl = document.querySelector(`[data-window-id="${win.id}"]`) as HTMLElement | null;
      if (!windowEl) return;

      const canvas = renderWindowThumbnail(windowEl, colors, term);
      if (!canvas) return;

      setPreviewImg(canvas.toDataURL());
      setPreviewSize({ w: canvas.width, h: canvas.height });
    });
  }, [windows, colors, term]);

  const handleCircleLeave = useCallback(() => {
    leaveTimerRef.current = window.setTimeout(() => {
      setHoveredWinIdx(null);
      setPreviewPos(null);
      setPreviewImg(null);
    }, 150);
  }, []);

  const handleCircleClick = useCallback((idx: number) => {
    if (idx !== activeWinIdx) {
      useCanvasStore.setState((s) => ({
        workspaces: s.workspaces.map((w, i) =>
          i === activeWsIdx ? { ...w, activeWindowIndex: idx } : w,
        ),
      }));
    }
  }, [activeWinIdx, activeWsIdx]);

  const getWindowNotificationSeverity = useCallback((windowIndex: number) => {
    const win = windows[windowIndex];
    if (!win) return null;

    const terminalIds = Object.values(win.paneData)
      .map((pane) => ("sessionId" in pane ? pane.sessionId : null))
      .filter((sessionId): sessionId is string => Boolean(sessionId));

    return pickHighestNotificationSeverity(
      terminalIds.map((terminalId) => getTerminalUnreadSeverity(notifications, terminalId)),
    );
  }, [notifications, windows]);

  const getNotificationColor = useCallback((severity: string | null) => {
    switch (severity) {
      case "error":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      case "success":
        return "#10b981";
      case "info":
        return "var(--orphix-color-primary)";
      default:
        return "transparent";
    }
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  return (
    <div
      className="flex items-center justify-between h-12 shrink-0 z-50"
      style={{
        background: "color-mix(in srgb, var(--orphix-color-base-background) 95%, transparent)",
        borderBottom: "1px solid var(--orphix-color-base-border)",
        WebkitAppRegion: "drag",
      }}
    >
      {/* Left: app name */}
      <div className="flex items-center pl-4">
        <span className="text-sm tracking-[0.2em] uppercase text-ox-accent font-mono font-semibold">
          Orphix
        </span>
      </div>

      {/* Center: window circles */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" }}>
        {windows.map((win, idx) => (
          <button
            key={win.id}
            ref={(el) => { circleRefs.current[idx] = el; }}
            onClick={() => handleCircleClick(idx)}
            onMouseEnter={() => handleCircleEnter(idx)}
            onMouseLeave={handleCircleLeave}
            className="transition-all duration-200 hover:scale-125"
            title={`Window ${idx + 1}`}
          >
            <div className="relative">
              {idx === activeWinIdx ? (
                <div className="w-3.5 h-3.5 rounded-full" style={{ background: "var(--orphix-color-primary)" }} />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full" style={{ border: "1.5px solid var(--orphix-color-text-muted)", opacity: 0.5 }} />
              )}
              {getWindowNotificationSeverity(idx) && (
                <span
                  className="absolute -right-1 -top-1 size-2.5 rounded-full border"
                  style={{
                    background: getNotificationColor(getWindowNotificationSeverity(idx)),
                    borderColor: "var(--orphix-color-base-background)",
                  }}
                />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Hover preview tooltip */}
      {hoveredWinIdx !== null && previewPos && previewImg && (
        <div
          className="fixed z-[1000] pointer-events-none"
          style={{
            left: previewPos.x,
            top: previewPos.y,
            transform: "translateX(-50%)",
          }}
        >
          <div
            className="rounded-lg overflow-hidden"
            style={{
              border: `1px solid ${term.pane.borderActive}`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${term.pane.border}`,
              width: previewSize.w,
              height: previewSize.h,
            }}
          >
            <img
              src={previewImg}
              alt={`Window ${hoveredWinIdx + 1} preview`}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
          <div className="text-center mt-1">
            <span className="text-sm font-mono" style={{ color: term.tab.foreground }}>
              Window {hoveredWinIdx + 1}
            </span>
          </div>
        </div>
      )}

      {/* Right: popup buttons + window controls — all no-drag */}
      <div className="flex items-center">
        <div className="flex items-center gap-1 px-2" style={{ WebkitAppRegion: "no-drag" }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleLayoutMode}
                className={cn("toolbar-btn !w-10 !h-10 press-effect hover-scale", layoutMode === "tabs" && "active")}
              >
                {layoutMode === "tabs" ? <Columns2 size={18} strokeWidth={1.5} /> : <LayoutGrid size={18} strokeWidth={1.5} />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {layoutMode === "tabs"
                ? "This workspace: Tabs — switch to tiling (windows)"
                : "This workspace: Tiling (windows) — switch to tabs"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleWalkaway}
                className={cn("toolbar-btn !w-10 !h-10 press-effect hover-scale", walkawayEnabled && "active")}
              >
                <Lock size={18} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{walkawayEnabled ? "Unlock Walkaway mode" : "Walkaway mode"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onTogglePopup(popup === "notifications" ? null : "notifications")}
                className={cn("toolbar-btn !w-10 !h-10 press-effect hover-scale relative", popup === "notifications" && "active")}
              >
                <Bell size={18} strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span
                    className="absolute right-1.5 top-1.5 min-w-[1rem] rounded-full px-1 text-[10px] leading-4"
                    style={{
                      background: "var(--orphix-color-primary)",
                      color: "var(--orphix-color-primary-foreground, #041114)",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onTogglePopup(popup === "link" ? null : "link")}
                className={cn("toolbar-btn !w-10 !h-10 press-effect hover-scale", popup === "link" && "active")}
              >
                <Link2 size={18} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Link</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onTogglePopup(popup === "notes" ? null : "notes")}
                className={cn("toolbar-btn !w-10 !h-10 press-effect hover-scale", popup === "notes" && "active")}
              >
                <StickyNote size={18} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Notes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onTogglePopup(popup === "settings" ? null : "settings")}
                className={cn("toolbar-btn !w-10 !h-10 press-effect hover-scale", popup === "settings" && "active")}
              >
                <Settings size={18} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>

        {/* Window controls — Windows 10/11 style */}
        <div className="flex h-full" style={{ WebkitAppRegion: "no-drag" }}>
          <button
            onClick={() => window.orphix?.window?.minimize()}
            className="flex items-center justify-center w-11 h-full hover:bg-orphix-hover-medium transition-colors"
            title="Minimize"
          >
            <Minus size={16} strokeWidth={1.5} className="text-ox-muted" />
          </button>
          <button
            onClick={() => window.orphix?.window?.maximize()}
            className="flex items-center justify-center w-11 h-full hover:bg-orphix-hover-medium transition-colors"
            title="Maximize"
          >
            <Square size={14} strokeWidth={1.5} className="text-ox-muted" />
          </button>
          <button
            onClick={() => window.orphix?.window?.close()}
            className="flex items-center justify-center w-11 h-full hover:bg-red-500/80 transition-colors group"
            title="Close"
          >
            <X size={16} strokeWidth={1.5} className="text-ox-muted group-hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
