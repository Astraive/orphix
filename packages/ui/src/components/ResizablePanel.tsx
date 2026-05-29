import { useState, useCallback, type ReactNode, type CSSProperties } from "react";
import { cn } from "../cn";
import { ResizeHandle } from "./ResizeHandle";

interface ResizablePanelProps {
  children: ReactNode;
  side: "left" | "right";
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  style?: CSSProperties;
  onWidthChange?: (width: number) => void;
}

export function ResizablePanel({
  children,
  side,
  defaultWidth = 280,
  minWidth = 180,
  maxWidth = 600,
  className,
  style,
  onWidthChange,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);

  const handleResize = useCallback((delta: number) => {
    setWidth((prev) => {
      const next = Math.min(maxWidth, Math.max(minWidth, prev + delta));
      onWidthChange?.(next);
      return next;
    });
  }, [minWidth, maxWidth, onWidthChange]);

  const isLeft = side === "left";

  return (
    <div className={cn("flex shrink-0", isLeft ? "flex-row" : "flex-row-reverse")}>
      <div
        className={cn("shrink-0 flex flex-col overflow-hidden", className)}
        style={{ width: `${width}px`, ...style }}
      >
        {children}
      </div>
      <ResizeHandle
        direction="horizontal"
        onResize={(delta) => handleResize(isLeft ? delta : -delta)}
      />
    </div>
  );
}
