import type { PaneNode } from "../lib/layout/types";
import type { PaneData, LayoutMode } from "../stores/canvas-store";
import { SplitNode } from "./SplitNode";
import { TabbedPanes } from "./TabbedPanes";

interface PaneRendererProps {
  layout: PaneNode;
  paneData: Record<string, PaneData>;
  focusedPaneId: string;
  mode: LayoutMode;
  onFocusPane: (paneId: string) => void;
}

export function PaneRenderer({ layout, paneData, focusedPaneId, mode, onFocusPane }: PaneRendererProps) {
  return (
    <div className="w-full h-full min-w-0 min-h-0 overflow-hidden">
      {mode === "tabs" ? (
        <TabbedPanes
          layout={layout}
          paneData={paneData}
          focusedPaneId={focusedPaneId}
          onFocusPane={onFocusPane}
        />
      ) : (
        <SplitNode
          node={layout}
          paneData={paneData}
          focusedPaneId={focusedPaneId}
          onFocusPane={onFocusPane}
        />
      )}
    </div>
  );
}
