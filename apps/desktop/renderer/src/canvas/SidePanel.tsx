import { X } from "lucide-react";
import { FileExplorer } from "@/panels/files/FileExplorer";
import { GitPanel } from "@/panels/git/GitPanel";

interface SidePanelProps {
  activePanel: string | null;
  onClose: () => void;
}

export function SidePanel({ activePanel, onClose }: SidePanelProps) {
  if (!activePanel) return null;

  return (
    <div
      className="shrink-0 flex flex-col overflow-hidden"
      style={{
        width: "280px",
        background: "rgba(5, 13, 16, 0.95)",
        borderRight: "1px solid var(--ox-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-ox-border shrink-0">
        <span className="text-[10px] tracking-[0.15em] uppercase text-ox-accent font-semibold">
          {activePanel}
        </span>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
        >
          <X size={10} className="text-ox-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === "files" && <FileExplorer />}
        {activePanel === "git" && <GitPanel />}
        {activePanel === "search" && <SearchPanel />}
        {activePanel === "extensions" && <ExtensionsPanel />}
      </div>
    </div>
  );
}

function SearchPanel() {
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-ox-border bg-black/20">
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-xs text-ox-text outline-none flex-1 placeholder:text-ox-muted/50"
        />
      </div>
      <p className="text-[10px] text-ox-muted/40 mt-4 text-center">Search is not yet implemented.</p>
    </div>
  );
}

function ExtensionsPanel() {
  return (
    <div className="p-3">
      <p className="text-[10px] text-ox-muted/40 text-center">No extensions installed.</p>
    </div>
  );
}
