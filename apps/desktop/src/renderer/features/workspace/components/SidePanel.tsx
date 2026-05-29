import { X } from "lucide-react";
import { ResizablePanel } from "@orphix/ui";
import { FileExplorer } from "@/features/workspace/components/FileExplorer";
import { GitPanel } from "@/features/git/components/GitPanel";
import { DockerPanel } from "@/features/docker/components/DockerPanel";

interface SidePanelProps {
  activePanel: string | null;
  onClose: () => void;
}

export function SidePanel({ activePanel, onClose }: SidePanelProps) {
  if (!activePanel) return null;

  return (
    <ResizablePanel
      side="left"
      defaultWidth={300}
      minWidth={200}
      maxWidth={600}
      className="flex flex-col overflow-hidden anim-slide-right"
      style={{
        background: "color-mix(in srgb, var(--orphix-color-base-background) 95%, transparent)",
        borderRight: "1px solid var(--orphix-color-base-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-ox-border shrink-0">
        <span className="text-sm tracking-[0.15em] uppercase text-ox-accent font-semibold">
          {activePanel}
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orphix-hover-medium transition-colors"
        >
          <X size={14} className="text-ox-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === "files" && <FileExplorer />}
        {activePanel === "git" && <GitPanel />}
        {activePanel === "docker" && <DockerPanel />}
        {activePanel === "search" && <SearchPanel />}
        {activePanel === "extensions" && <ExtensionsPanel />}
      </div>
    </ResizablePanel>
  );
}

function SearchPanel() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-ox-border bg-orphix-hover-subtle">
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-ox-text outline-none flex-1 placeholder:text-ox-muted/50"
        />
      </div>
      <p className="text-sm text-ox-muted/40 mt-4 text-center">Search is not yet implemented.</p>
    </div>
  );
}

function ExtensionsPanel() {
  return (
    <div className="p-4">
      <p className="text-sm text-ox-muted/40 text-center">No extensions installed.</p>
    </div>
  );
}
