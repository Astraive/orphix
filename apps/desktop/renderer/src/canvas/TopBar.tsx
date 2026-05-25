import { StickyNote, Settings, Minus, Square, X } from "lucide-react";
import { useCanvasStore } from "./canvas-store";
import { cn } from "@/lib/cn";

interface TopBarProps {
  visible: boolean;
  popup: string | null;
  onTogglePopup: (popup: string | null) => void;
}

export function TopBar({ visible, popup, onTogglePopup }: TopBarProps) {
  const workspaces = useCanvasStore((s) => s.workspaces);
  const activeWsIdx = useCanvasStore((s) => s.activeWorkspaceIndex);

  const activeWs = workspaces[activeWsIdx];
  const winCount = activeWs?.windows.length ?? 0;
  const paneCount = activeWs?.windows.reduce((sum, w) => sum + Object.keys(w.paneData).length, 0) ?? 0;

  return (
    <div
      className="flex items-center justify-between h-9 shrink-0 z-50"
      style={{
        background: "rgba(5, 13, 16, 0.95)",
        borderBottom: "1px solid var(--ox-border)",
        WebkitAppRegion: "drag",
      }}
    >
      {/* Left: app name */}
      <div className="flex items-center pl-3">
        <span className="text-[10px] tracking-[0.2em] uppercase text-ox-accent font-mono font-semibold">
          Orphix
        </span>
      </div>

      {/* Center: window info */}
      <div className="flex items-center gap-4">
        {paneCount > 0 && (
          <span className="text-[9px] tracking-[0.15em] uppercase text-ox-muted font-mono">
            {winCount}w {paneCount}p
          </span>
        )}
      </div>

      {/* Right: popup buttons + window controls — all no-drag */}
      <div className="flex items-center">
        <div className="flex items-center gap-1 px-2" style={{ WebkitAppRegion: "no-drag" }}>
          <button
            onClick={() => onTogglePopup(popup === "notes" ? null : "notes")}
            className={cn("toolbar-btn !w-7 !h-7", popup === "notes" && "active")}
            title="Notes"
          >
            <StickyNote size={13} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => onTogglePopup(popup === "settings" ? null : "settings")}
            className={cn("toolbar-btn !w-7 !h-7", popup === "settings" && "active")}
            title="Settings"
          >
            <Settings size={13} strokeWidth={1.5} />
          </button>
        </div>

        {/* Window controls — Windows 10/11 style */}
        <div className="flex h-full" style={{ WebkitAppRegion: "no-drag" }}>
          <button
            onClick={() => window.orphix?.window?.minimize()}
            className="flex items-center justify-center w-11 h-full hover:bg-white/10 transition-colors"
            title="Minimize"
          >
            <Minus size={14} strokeWidth={1.5} className="text-ox-muted" />
          </button>
          <button
            onClick={() => window.orphix?.window?.maximize()}
            className="flex items-center justify-center w-11 h-full hover:bg-white/10 transition-colors"
            title="Maximize"
          >
            <Square size={11} strokeWidth={1.5} className="text-ox-muted" />
          </button>
          <button
            onClick={() => window.orphix?.window?.close()}
            className="flex items-center justify-center w-11 h-full hover:bg-red-500/80 transition-colors group"
            title="Close"
          >
            <X size={14} strokeWidth={1.5} className="text-ox-muted group-hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
