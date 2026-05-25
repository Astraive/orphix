import type { PaneNode, Rect } from "./layout-tree";
import { computeLeafLayouts } from "./layout/measure.ts";

// ─── PaneLayout: computed position for a leaf ────────────────────────────

export interface PaneLayout {
  paneId: string;
  paneKind: string;
  rect: Rect;
}

// ─── Compute leaf positions from tree + bounds ───────────────────────────

export function computeLayout(root: PaneNode, bounds: Rect): PaneLayout[] {
  return computeLeafLayouts(root, bounds);
}
