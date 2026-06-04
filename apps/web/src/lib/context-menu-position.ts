const EDGE_GAP_PX = 10;
const CURSOR_OFFSET_PX = 6;

export function resolveContextMenuPosition(x: number, y: number, width: number, height: number) {
  const preferredLeft = x + CURSOR_OFFSET_PX;
  const preferredTop = y + CURSOR_OFFSET_PX;

  const fitsRight = preferredLeft + width <= window.innerWidth - EDGE_GAP_PX;
  const fitsBottom = preferredTop + height <= window.innerHeight - EDGE_GAP_PX;

  const left = fitsRight
    ? preferredLeft
    : Math.max(EDGE_GAP_PX, x - width - CURSOR_OFFSET_PX);

  const top = fitsBottom
    ? preferredTop
    : Math.max(EDGE_GAP_PX, y - height - CURSOR_OFFSET_PX);

  return {
    left: Math.min(left, Math.max(EDGE_GAP_PX, window.innerWidth - width - EDGE_GAP_PX)),
    top: Math.min(top, Math.max(EDGE_GAP_PX, window.innerHeight - height - EDGE_GAP_PX)),
  };
}
