import type { PaneKind, PaneNode, Rect } from "./types.ts";
import {
  MIN_TERMINAL_PANE_HEIGHT,
  MIN_TERMINAL_PANE_WIDTH,
  PANE_GAP_PX,
} from "./types.ts";
import { findLargestPane, findPaneRect } from "./measure.ts";

export interface SplitPaneOptions {
  targetPaneId?: string | null;
  gap?: number;
  minPaneWidth?: number;
  minPaneHeight?: number;
  newPaneKind?: PaneKind;
}

export interface SplitPaneResult {
  layout: PaneNode;
  targetPaneId: string;
  direction: "horizontal" | "vertical";
}

export function splitFocusedPane(
  root: PaneNode,
  newPaneId: string,
  bounds: Rect,
  options: SplitPaneOptions = {},
): SplitPaneResult | null {
  const gap = options.gap ?? PANE_GAP_PX;
  const minPaneWidth = options.minPaneWidth ?? MIN_TERMINAL_PANE_WIDTH;
  const minPaneHeight = options.minPaneHeight ?? MIN_TERMINAL_PANE_HEIGHT;
  const newPaneKind = options.newPaneKind ?? "terminal";
  const requestedTarget = options.targetPaneId ?? null;

  const targetRect = requestedTarget
    ? findPaneRect(root, requestedTarget, bounds, gap)
    : null;
  const targetPaneId = targetRect
    ? requestedTarget
    : findLargestPane(root, bounds, gap)?.paneId ?? null;
  const rect = targetPaneId ? findPaneRect(root, targetPaneId, bounds, gap) : null;

  if (!targetPaneId || !rect) {
    return null;
  }

  const preferredDirection = rect.width > rect.height ? "vertical" : "horizontal";
  const fallbackDirection = preferredDirection === "vertical" ? "horizontal" : "vertical";
  const direction = canSplit(rect, preferredDirection, minPaneWidth, minPaneHeight, gap)
    ? preferredDirection
    : canSplit(rect, fallbackDirection, minPaneWidth, minPaneHeight, gap)
      ? fallbackDirection
      : null;

  if (!direction) {
    return null;
  }

  const layout = replaceLeafWithSplit(root, targetPaneId, newPaneId, direction, newPaneKind);
  if (!layout) {
    return null;
  }

  return { layout, targetPaneId, direction };
}

export function replaceLeafWithSplit(
  root: PaneNode,
  targetPaneId: string,
  newPaneId: string,
  direction: "horizontal" | "vertical",
  newPaneKind: PaneKind = "terminal",
): PaneNode | null {
  if (root.type === "leaf") {
    if (root.paneId !== targetPaneId) {
      return null;
    }
    return {
      type: "split",
      direction,
      ratio: 0.5,
      first: { ...root },
      second: { type: "leaf", paneId: newPaneId, paneKind: newPaneKind },
    };
  }

  const first = replaceLeafWithSplit(root.first, targetPaneId, newPaneId, direction, newPaneKind);
  if (first) {
    return { ...root, first };
  }

  const second = replaceLeafWithSplit(root.second, targetPaneId, newPaneId, direction, newPaneKind);
  if (second) {
    return { ...root, second };
  }

  return null;
}

export function isValidBinaryTree(root: PaneNode): boolean {
  if (root.type === "leaf") {
    return root.paneId.trim().length > 0;
  }
  return (
    (root.direction === "horizontal" || root.direction === "vertical") &&
    Number.isFinite(root.ratio) &&
    root.ratio > 0 &&
    root.ratio < 1 &&
    isValidBinaryTree(root.first) &&
    isValidBinaryTree(root.second)
  );
}

const canSplit = (
  rect: Rect,
  direction: "horizontal" | "vertical",
  minPaneWidth: number,
  minPaneHeight: number,
  gap: number,
): boolean => {
  if (direction === "vertical") {
    return rect.width >= minPaneWidth * 2 + gap && rect.height >= minPaneHeight;
  }
  return rect.height >= minPaneHeight * 2 + gap && rect.width >= minPaneWidth;
};
