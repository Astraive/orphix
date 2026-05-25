import type { PaneLayout, PaneNode, Rect } from "./types.ts";
import { PANE_GAP_PX } from "./types.ts";

const clampSplitRatio = (ratio: number): number => {
  if (!Number.isFinite(ratio)) {
    return 0.5;
  }
  return Math.max(0.1, Math.min(0.9, ratio));
};

export function computeLeafLayouts(root: PaneNode, bounds: Rect, gap = PANE_GAP_PX): PaneLayout[] {
  if (root.type === "leaf") {
    return [{ paneId: root.paneId, paneKind: root.paneKind, rect: bounds }];
  }

  const ratio = clampSplitRatio(root.ratio);
  if (root.direction === "vertical") {
    const usableWidth = Math.max(0, bounds.width - gap);
    const firstWidth = Math.round(usableWidth * ratio);
    const secondWidth = Math.max(0, bounds.width - firstWidth - gap);
    return [
      ...computeLeafLayouts(root.first, {
        x: bounds.x,
        y: bounds.y,
        width: firstWidth,
        height: bounds.height,
      }, gap),
      ...computeLeafLayouts(root.second, {
        x: bounds.x + firstWidth + gap,
        y: bounds.y,
        width: secondWidth,
        height: bounds.height,
      }, gap),
    ];
  }

  const usableHeight = Math.max(0, bounds.height - gap);
  const firstHeight = Math.round(usableHeight * ratio);
  const secondHeight = Math.max(0, bounds.height - firstHeight - gap);
  return [
    ...computeLeafLayouts(root.first, {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: firstHeight,
    }, gap),
    ...computeLeafLayouts(root.second, {
      x: bounds.x,
      y: bounds.y + firstHeight + gap,
      width: bounds.width,
      height: secondHeight,
    }, gap),
  ];
}

export function findPaneRect(
  root: PaneNode,
  paneId: string,
  bounds: Rect,
  gap = PANE_GAP_PX,
): Rect | null {
  return computeLeafLayouts(root, bounds, gap).find((pane) => pane.paneId === paneId)?.rect ?? null;
}

export function findLargestPane(root: PaneNode, bounds: Rect, gap = PANE_GAP_PX): PaneLayout | null {
  const panes = computeLeafLayouts(root, bounds, gap);
  return panes.sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height))[0] ?? null;
}
