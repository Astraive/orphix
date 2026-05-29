import { useRef, useCallback, useState, useEffect, memo } from "react";

const MIN_THUMB_HEIGHT = 30; // px minimum thumb size
const THUMB_WIDTH = 8; // px
const TRACK_MARGIN = 2; // px from right edge

interface EditorScrollbarProps {
  viewportHeight: number;
  contentHeight: number;
  scrollTop: number;
  onScroll: (scrollTop: number) => void;
  visible?: boolean;
}

export const EditorScrollbar = memo(function EditorScrollbar({
  viewportHeight,
  contentHeight,
  scrollTop,
  onScroll,
  visible = true,
}: EditorScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dragStartRef = useRef({ y: 0, scrollTop: 0 });

  const maxScrollTop = Math.max(0, contentHeight - viewportHeight);
  const trackHeight = viewportHeight;

  // Thumb sizing
  const thumbHeight =
    maxScrollTop === 0
      ? trackHeight
      : Math.max(MIN_THUMB_HEIGHT, (viewportHeight / contentHeight) * trackHeight);

  // Thumb position
  const scrollRatio = maxScrollTop === 0 ? 0 : scrollTop / maxScrollTop;
  const thumbTop = scrollRatio * (trackHeight - thumbHeight);

  // Track click → jump to position
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== trackRef.current) return; // ignore thumb clicks
      e.preventDefault();
      const rect = trackRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const targetRatio = Math.max(0, Math.min(1, clickY / trackHeight));
      onScroll(targetRatio * maxScrollTop);
    },
    [trackHeight, maxScrollTop, onScroll],
  );

  // Thumb drag start
  const handleThumbPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = { y: e.clientY, scrollTop };

      // Capture pointer
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [scrollTop],
  );

  // Thumb drag move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      const deltaY = e.clientY - dragStartRef.current.y;
      const draggableTrackHeight = trackHeight - thumbHeight;
      if (draggableTrackHeight <= 0) return;

      const scrollDelta = (deltaY / draggableTrackHeight) * maxScrollTop;
      const nextScrollTop = Math.max(
        0,
        Math.min(maxScrollTop, dragStartRef.current.scrollTop + scrollDelta),
      );
      onScroll(nextScrollTop);
    },
    [isDragging, trackHeight, thumbHeight, maxScrollTop, onScroll],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Don't render if content fits in viewport
  if (!visible || maxScrollTop <= 0) return null;

  return (
    <div
      ref={trackRef}
      className="editor-scrollbar-track"
      style={{
        position: "absolute",
        top: 0,
        right: `${TRACK_MARGIN}px`,
        width: `${THUMB_WIDTH + TRACK_MARGIN * 2}px`,
        height: `${trackHeight}px`,
        cursor: "pointer",
        zIndex: 20,
      }}
      onClick={handleTrackClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Thumb */}
      <div
        className={`editor-scrollbar-thumb${isDragging ? " active" : ""}${isHovering ? " hovering" : ""}`}
        style={{
          position: "absolute",
          top: `${thumbTop}px`,
          right: `${TRACK_MARGIN}px`,
          width: `${THUMB_WIDTH}px`,
          height: `${thumbHeight}px`,
          borderRadius: "999px",
          cursor: "grab",
          touchAction: "none",
        }}
        onPointerDown={handleThumbPointerDown}
      />
    </div>
  );
});
