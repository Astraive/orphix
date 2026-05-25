import { FileText, Search, GitBranch, Puzzle } from "lucide-react";
import { useCanvasStore } from "./canvas-store";
import { cn } from "@/lib/cn";

interface LeftSidebarProps {
  activePanel: string | null;
  onTogglePanel: (panel: string | null) => void;
  visible: boolean;
}

const SIDEBAR_ITEMS = [
  { id: "files", Icon: FileText, label: "Files" },
  { id: "search", Icon: Search, label: "Search" },
  { id: "git", Icon: GitBranch, label: "Git" },
  { id: "extensions", Icon: Puzzle, label: "Extensions" },
] as const;

export function LeftSidebar({ activePanel, onTogglePanel, visible }: LeftSidebarProps) {
  const workspaces = useCanvasStore((s) => s.workspaces);
  const activeWsIdx = useCanvasStore((s) => s.activeWorkspaceIndex);
  const jumpToWorkspace = useCanvasStore((s) => s.jumpToWorkspace);

  return (
    <div
      className="flex flex-col items-center py-2 gap-1 w-12 shrink-0 z-40"
      style={{
        background: "rgba(5, 13, 16, 0.95)",
        borderRight: "1px solid var(--ox-border)",
      }}
    >
      {/* Top: tool buttons */}
      <div className="flex flex-col items-center gap-1">
        {SIDEBAR_ITEMS.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => onTogglePanel(activePanel === id ? null : id)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer",
              activePanel === id
                ? "text-ox-accent bg-ox-accent/10"
                : "text-ox-muted hover:text-ox-text-dim hover:bg-white/5",
            )}
            title={label}
          >
            <Icon size={18} strokeWidth={1.5} />
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: workspace squares */}
      <div className="flex flex-col items-center gap-1.5 pb-2">
        {workspaces.map((_, i) => (
          <button
            key={i}
            onClick={() => jumpToWorkspace(i)}
            title={`Workspace ${i + 1}`}
            className="transition-transform duration-300 hover:scale-125"
          >
            {i === activeWsIdx ? (
              <div className="w-3 h-3 rounded-sm bg-ox-accent" />
            ) : (
              <div className="w-3 h-3 rounded-sm border-[1.5px] border-ox-muted opacity-40" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
