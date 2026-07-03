import { useEffect, useRef } from "react";
import { X, FileText, SquareTerminal } from "lucide-react";
import type { PaneNode } from "../lib/layout/types";
import type { PaneData } from "../stores/canvas-store";
import { useCanvasStore } from "../stores/canvas-store";
import { collectLeafIds } from "../lib/layout-tree";
import { PaneLeaf } from "./PaneLeaf";

interface TabbedPanesProps {
  layout: PaneNode;
  paneData: Record<string, PaneData>;
  focusedPaneId: string;
  onFocusPane: (paneId: string) => void;
}

function tabLabel(data: PaneData | undefined, terminalIndex: number): string {
  if (data?.kind === "editor") return data.filePath.split(/[/\\]/).pop() ?? "untitled";
  return `Terminal ${terminalIndex}`;
}

/** VS Code-style tab presentation: one pane visible, a tab strip to switch. */
export function TabbedPanes({ layout, paneData, focusedPaneId, onFocusPane }: TabbedPanesProps) {
  const closeEditorPane = useCanvasStore((s) => s.closeEditorPane);
  const closePane = useCanvasStore((s) => s.closePane);

  const leafIds = collectLeafIds(layout);
  const focusedId = leafIds.includes(focusedPaneId) ? focusedPaneId : leafIds[0];
  let terminalCount = 0;

  const activeTabRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focusedId]);

  const closeTab = (paneId: string, data: PaneData | undefined) => {
    if (data?.kind === "editor") {
      closeEditorPane(paneId);
    } else {
      onFocusPane(paneId);
      closePane();
    }
  };

  return (
    <div className="w-full h-full min-w-0 min-h-0 flex flex-col overflow-hidden">
      {/* Tab strip */}
      <div
        className="flex items-stretch shrink-0 overflow-x-auto editor-scroll"
        style={{
          background: "var(--orphix-editor-header-bg, var(--orphix-color-base-surface))",
          borderBottom: "1px solid var(--orphix-color-base-border)",
          minHeight: "34px",
        }}
      >
        {leafIds.map((id) => {
          const data = paneData[id];
          const isTerminal = data?.kind !== "editor";
          if (isTerminal) terminalCount++;
          const isActive = id === focusedId;
          return (
            <div
              key={id}
              ref={isActive ? activeTabRef : undefined}
              onClick={() => onFocusPane(id)}
              className="group flex items-center gap-2 px-3 cursor-pointer shrink-0 select-none"
              style={{
                background: isActive ? "var(--orphix-color-base-background)" : "transparent",
                borderRight: "1px solid var(--orphix-color-base-border)",
                borderTop: isActive ? "2px solid var(--orphix-color-primary)" : "2px solid transparent",
                color: isActive ? "var(--orphix-color-text)" : "var(--orphix-color-text-muted)",
                fontFamily: "var(--orphix-font-mono)",
              }}
            >
              {isTerminal ? <SquareTerminal size={13} /> : <FileText size={13} />}
              <span className="text-xs max-w-[180px] truncate">
                {tabLabel(data, terminalCount)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(id, data); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--orphix-color-danger)]"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Active pane */}
      <div className="flex-1 min-w-0 min-h-0">
        {focusedId && (
          <PaneLeaf
            paneId={focusedId}
            data={paneData[focusedId]}
            isActive
            onFocus={() => onFocusPane(focusedId)}
          />
        )}
      </div>
    </div>
  );
}
