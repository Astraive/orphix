import type { PaneNode } from "./layout/types";
import type { PaneData } from "./canvas-store";
import { SplitNode } from "./components/SplitNode";

interface PaneRendererProps {
  layout: PaneNode;
  paneData: Record<string, PaneData>;
  focusedPaneId: string;
  onFocusPane: (paneId: string) => void;
}

export function PaneRenderer({ layout, paneData, focusedPaneId, onFocusPane }: PaneRendererProps) {
  return (
    <div className="w-full h-full min-w-0 min-h-0 overflow-hidden">
      <SplitNode
        node={layout}
        paneData={paneData}
        focusedPaneId={focusedPaneId}
        onFocusPane={onFocusPane}
      />
    </div>
  );
}
