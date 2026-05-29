import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";
import { cn } from "../cn";

export type ResizeDirection = "horizontal" | "vertical";

interface ResizeHandleProps {
  direction: ResizeDirection;
  onResize: (delta: number) => void;
  className?: string;
  style?: CSSProperties;
}

export function ResizeHandle({ direction, onResize, className, style }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startRef.current = direction === "horizontal" ? e.clientX : e.clientY;
    setIsDragging(true);
  }, [direction]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pos = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = pos - startRef.current;
      startRef.current = pos;
      onResize(delta);
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
  }, [isDragging, direction, onResize]);

  const isHorizontal = direction === "horizontal";

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "group relative z-10 shrink-0",
        isHorizontal ? "w-1 h-full cursor-col-resize" : "h-1 w-full cursor-row-resize",
        className,
      )}
      style={{
        userSelect: isDragging ? "none" : undefined,
        ...style,
      }}
    >
      <div
        className={cn(
          "absolute rounded-sm transition-colors",
          isHorizontal ? "inset-y-0 left-1/2 -translate-x-1/2 w-0.5" : "inset-x-0 top-1/2 -translate-y-1/2 h-0.5",
          isDragging
            ? "bg-[var(--orphix-color-primary)]"
            : "bg-transparent group-hover:bg-[color-mix(in_srgb,var(--orphix-color-primary)_40%,transparent)]",
        )}
      />
    </div>
  );
}
