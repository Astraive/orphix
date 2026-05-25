import type { PaneNode } from "../layout/types";
import { PANE_GAP_PX } from "../layout/types";
import type { PaneData } from "../canvas-store";
import { TerminalPane } from "./TerminalPane";

interface SplitNodeProps {
  node: PaneNode;
  paneData: Record<string, PaneData>;
  focusedPaneId: string;
  onFocusPane: (paneId: string) => void;
}

export function SplitNode({ node, paneData, focusedPaneId, onFocusPane }: SplitNodeProps) {
  if (node.type === "leaf") {
    const data = paneData[node.paneId];
    return (
      <TerminalPane
        paneId={node.paneId}
        sessionId={data?.sessionId ?? null}
        isActive={node.paneId === focusedPaneId}
        onFocus={() => onFocusPane(node.paneId)}
      />
    );
  }

  const isVertical = node.direction === "vertical";

  return (
    <div
      className="w-full h-full min-w-0 min-h-0 overflow-hidden flex"
      style={{
        flexDirection: isVertical ? "row" : "column",
        gap: `${PANE_GAP_PX}px`,
      }}
    >
      <div className="min-w-0 min-h-0 overflow-hidden" style={{ flex: `${node.ratio} 1 0%` }}>
        <SplitNode
          node={node.first}
          paneData={paneData}
          focusedPaneId={focusedPaneId}
          onFocusPane={onFocusPane}
        />
      </div>
      <div className="min-w-0 min-h-0 overflow-hidden" style={{ flex: `${1 - node.ratio} 1 0%` }}>
        <SplitNode
          node={node.second}
          paneData={paneData}
          focusedPaneId={focusedPaneId}
          onFocusPane={onFocusPane}
        />
      </div>
    </div>
  );
}
