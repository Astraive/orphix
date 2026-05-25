export type { PaneKind, PaneLayout, PaneNode, Rect } from "./layout/types.ts";
export {
  MIN_TERMINAL_PANE_HEIGHT,
  MIN_TERMINAL_PANE_WIDTH,
  PANE_GAP_PX,
} from "./layout/types.ts";
export { computeLeafLayouts, findLargestPane, findPaneRect } from "./layout/measure.ts";
export {
  isValidBinaryTree,
  replaceLeafWithSplit as splitLeafWithDirection,
  splitFocusedPane,
} from "./layout/split.ts";

import type { PaneNode, Rect } from "./layout/types.ts";
import { findPaneRect } from "./layout/measure.ts";
import { replaceLeafWithSplit as splitLeafWithDirection } from "./layout/split.ts";

export function findLeaf(root: PaneNode, paneId: string): PaneNode | null {
  if (root.type === "leaf") return root.paneId === paneId ? root : null;
  return findLeaf(root.first, paneId) ?? findLeaf(root.second, paneId);
}

export function findParent(root: PaneNode, paneId: string): PaneNode | null {
  if (root.type === "leaf") return null;
  if (
    (root.first.type === "leaf" && root.first.paneId === paneId) ||
    (root.second.type === "leaf" && root.second.paneId === paneId)
  ) {
    return root;
  }
  return findParent(root.first, paneId) ?? findParent(root.second, paneId);
}

export function collectLeafIds(root: PaneNode): string[] {
  if (root.type === "leaf") return [root.paneId];
  return [...collectLeafIds(root.first), ...collectLeafIds(root.second)];
}

export function countLeaves(root: PaneNode): number {
  if (root.type === "leaf") return 1;
  return countLeaves(root.first) + countLeaves(root.second);
}

export const findRect = findPaneRect;

export function splitLeaf(
  root: PaneNode,
  targetPaneId: string,
  newPaneId: string,
): PaneNode | null {
  return splitLeafWithDirection(root, targetPaneId, newPaneId, "vertical");
}

export function removeLeaf(root: PaneNode, paneId: string): PaneNode | null {
  if (root.type === "leaf") {
    return root.paneId === paneId ? null : root;
  }

  const newFirst = removeLeaf(root.first, paneId);
  const newSecond = removeLeaf(root.second, paneId);

  if (newFirst === null) return newSecond;
  if (newSecond === null) return newFirst;

  return { ...root, first: newFirst, second: newSecond };
}

export function getSiblingLeafId(root: PaneNode, paneId: string): string | null {
  const parent = findParent(root, paneId);
  if (!parent || parent.type === "leaf") return null;
  if (parent.first.type === "leaf" && parent.first.paneId === paneId) {
    return parent.second.type === "leaf" ? parent.second.paneId : null;
  }
  if (parent.second.type === "leaf" && parent.second.paneId === paneId) {
    return parent.first.type === "leaf" ? parent.first.paneId : null;
  }
  return null;
}

export function getAdjacentLeafId(
  root: PaneNode,
  paneId: string,
  bounds: Rect,
  direction: "left" | "right" | "up" | "down",
): string | null {
  const rect = findPaneRect(root, paneId, bounds);
  if (!rect) return null;

  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  let bestId: string | null = null;
  let bestDist = Infinity;

  for (const id of collectLeafIds(root)) {
    if (id === paneId) continue;
    const other = findPaneRect(root, id, bounds);
    if (!other) continue;

    const ox = other.x + other.width / 2;
    const oy = other.y + other.height / 2;
    const valid =
      (direction === "left" && ox < cx) ||
      (direction === "right" && ox > cx) ||
      (direction === "up" && oy < cy) ||
      (direction === "down" && oy > cy);

    if (!valid) continue;

    const dist = Math.hypot(ox - cx, oy - cy);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = id;
    }
  }

  return bestId;
}
