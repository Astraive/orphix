export interface ContextMenuAnchor {
  x: number;
  y: number;
}

export interface ContextMenuPosition {
  left: number;
  top: number;
}

const EDGE_GAP_PX = 10;
const CURSOR_OFFSET_PX = 6;

export function resolveContextMenuPosition(
  anchor: ContextMenuAnchor,
  menuWidth: number,
  menuHeight: number,
): ContextMenuPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const preferredLeft = anchor.x + CURSOR_OFFSET_PX;
  const preferredTop = anchor.y + CURSOR_OFFSET_PX;

  const fitsRight = preferredLeft + menuWidth <= viewportWidth - EDGE_GAP_PX;
  const fitsBottom = preferredTop + menuHeight <= viewportHeight - EDGE_GAP_PX;

  const left = fitsRight
    ? preferredLeft
    : Math.max(EDGE_GAP_PX, anchor.x - menuWidth - CURSOR_OFFSET_PX);

  const top = fitsBottom
    ? preferredTop
    : Math.max(EDGE_GAP_PX, anchor.y - menuHeight - CURSOR_OFFSET_PX);

  return {
    left: Math.min(left, Math.max(EDGE_GAP_PX, viewportWidth - menuWidth - EDGE_GAP_PX)),
    top: Math.min(top, Math.max(EDGE_GAP_PX, viewportHeight - menuHeight - EDGE_GAP_PX)),
  };
}
