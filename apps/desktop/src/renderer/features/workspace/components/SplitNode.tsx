import { useState, useCallback, useRef, useEffect } from "react";
import type { PaneNode } from "../lib/layout/types";
import { PANE_GAP_PX } from "../lib/layout/types";
import type { PaneData } from "../stores/canvas-store";
import { useCanvasStore } from "../stores/canvas-store";
import { PaneLeaf } from "./PaneLeaf";

function getFirstLeafId(node: PaneNode): string | null {
  if (node.type === "leaf") return node.paneId;
  return getFirstLeafId(node.first);
}

interface SplitNodeProps {
  node: PaneNode;
  paneData: Record<string, PaneData>;
  focusedPaneId: string;
  onFocusPane: (paneId: string) => void;
}

export function SplitNode({ node, paneData, focusedPaneId, onFocusPane }: SplitNodeProps) {
  if (node.type === "leaf") {
    return (
      <PaneLeaf
        paneId={node.paneId}
        data={paneData[node.paneId]}
        isActive={node.paneId === focusedPaneId}
        onFocus={() => onFocusPane(node.paneId)}
      />
    );
  }

  const isVertical = node.direction === "vertical";
  const firstLeafId = getFirstLeafId(node.first);

  return (
    <div
      className="w-full h-full min-w-0 min-h-0 overflow-hidden flex relative"
      style={{
        flexDirection: isVertical ? "row" : "column",
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
      <ResizeHandle
        isVertical={isVertical}
        firstLeafId={firstLeafId}
        ratio={node.ratio}
      />
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

interface ResizeHandleProps {
  isVertical: boolean;
  firstLeafId: string | null;
  ratio: number;
}

function ResizeHandle({ isVertical, firstLeafId, ratio }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setSplitRatio = useCanvasStore((s) => s.setSplitRatio);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!firstLeafId) return;
      // Find the parent container (the flex div)
      const handle = containerRef.current;
      if (!handle) return;
      const parent = handle.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      let newRatio: number;
      if (isVertical) {
        newRatio = (e.clientX - rect.left) / rect.width;
      } else {
        newRatio = (e.clientY - rect.top) / rect.height;
      }
      setSplitRatio(firstLeafId, newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isVertical, firstLeafId, setSplitRatio]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        flex: "0 0 auto",
        width: isVertical ? `${PANE_GAP_PX}px` : "100%",
        height: isVertical ? "100%" : `${PANE_GAP_PX}px`,
        cursor: isVertical ? "col-resize" : "row-resize",
        userSelect: isDragging ? "none" : undefined,
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: isDragging
            ? "var(--orphix-color-primary)"
            : "transparent",
          transition: isDragging ? "none" : "background 150ms ease",
          borderRadius: "2px",
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            (e.target as HTMLDivElement).style.background = "color-mix(in srgb, var(--orphix-color-primary) 40%, transparent)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            (e.target as HTMLDivElement).style.background = "transparent";
          }
        }}
      />
    </div>
  );
}
