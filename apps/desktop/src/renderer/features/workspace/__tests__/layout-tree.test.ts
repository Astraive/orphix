import test from "node:test";
import assert from "node:assert/strict";
import {
  collectLeafIds,
  computeLeafLayouts,
  isValidBinaryTree,
  splitFocusedPane,
  type PaneNode,
  type Rect,
} from "../lib/layout-tree.ts";

const wideBounds: Rect = { x: 0, y: 0, width: 1200, height: 800 };

test("first split becomes vertical when root is wide", () => {
  const layout: PaneNode = { type: "leaf", paneId: "root", paneKind: "terminal" };

  const result = splitFocusedPane(layout, "new", wideBounds, { targetPaneId: "root" });

  assert.ok(result);
  assert.equal(result.direction, "vertical");
  assert.equal(result.layout.type, "split");
  assert.equal(result.layout.type === "split" ? result.layout.ratio : 0, 0.5);
  assert.deepEqual(collectLeafIds(result.layout), ["root", "new"]);
});

test("split becomes horizontal when focused pane is tall", () => {
  const layout: PaneNode = {
    type: "split",
    direction: "vertical",
    ratio: 0.75,
    first: { type: "leaf", paneId: "wide", paneKind: "terminal" },
    second: { type: "leaf", paneId: "tall", paneKind: "terminal" },
  };

  const result = splitFocusedPane(layout, "new", wideBounds, { targetPaneId: "tall" });

  assert.ok(result);
  assert.equal(result.targetPaneId, "tall");
  assert.equal(result.direction, "horizontal");
  assert.deepEqual(collectLeafIds(result.layout), ["wide", "tall", "new"]);
});

test("split becomes horizontal when focused pane is square", () => {
  const layout: PaneNode = { type: "leaf", paneId: "root", paneKind: "terminal" };

  const result = splitFocusedPane(
    layout,
    "new",
    { x: 0, y: 0, width: 600, height: 600 },
    { targetPaneId: "root" },
  );

  assert.ok(result);
  assert.equal(result.direction, "horizontal");
});

test("split rejects when below minimum size", () => {
  const layout: PaneNode = { type: "leaf", paneId: "only", paneKind: "terminal" };

  const result = splitFocusedPane(
    layout,
    "new",
    { x: 0, y: 0, width: 300, height: 140 },
    { targetPaneId: "only", minPaneWidth: 220, minPaneHeight: 120 },
  );

  assert.equal(result, null);
});

test("split only replaces the target leaf pane", () => {
  const originalNested: PaneNode = {
    type: "split",
    direction: "horizontal",
    ratio: 0.4,
    first: { type: "leaf", paneId: "b", paneKind: "terminal" },
    second: { type: "leaf", paneId: "c", paneKind: "terminal" },
  };
  const layout: PaneNode = {
    type: "split",
    direction: "vertical",
    ratio: 0.5,
    first: { type: "leaf", paneId: "a", paneKind: "terminal" },
    second: originalNested,
  };

  const result = splitFocusedPane(layout, "new", wideBounds, { targetPaneId: "a" });

  assert.ok(result);
  assert.equal(result.layout.type, "split");
  assert.deepEqual(result.layout.type === "split" ? result.layout.second : null, originalNested);
  assert.deepEqual(collectLeafIds(result.layout), ["a", "new", "b", "c"]);
});

test("existing split ratios are preserved", () => {
  const layout: PaneNode = {
    type: "split",
    direction: "vertical",
    ratio: 0.33,
    first: { type: "leaf", paneId: "a", paneKind: "terminal" },
    second: {
      type: "split",
      direction: "horizontal",
      ratio: 0.7,
      first: { type: "leaf", paneId: "b", paneKind: "terminal" },
      second: { type: "leaf", paneId: "c", paneKind: "terminal" },
    },
  };

  const result = splitFocusedPane(layout, "new", wideBounds, { targetPaneId: "c" });

  assert.ok(result);
  assert.equal(result.layout.type === "split" ? result.layout.ratio : 0, 0.33);
  const second = result.layout.type === "split" ? result.layout.second : null;
  assert.equal(second?.type === "split" ? second.ratio : 0, 0.7);
});

test("layout remains a valid binary tree after many splits", () => {
  let layout: PaneNode = { type: "leaf", paneId: "pane-0", paneKind: "terminal" };
  let focusedPaneId = "pane-0";

  for (let i = 1; i <= 20; i += 1) {
    const result = splitFocusedPane(layout, `pane-${i}`, wideBounds, { targetPaneId: focusedPaneId });
    if (!result) {
      break;
    }
    layout = result.layout;
    focusedPaneId = `pane-${i}`;
    assert.equal(isValidBinaryTree(layout), true);
  }

  const panes = computeLeafLayouts(layout, wideBounds);
  assert.equal(panes.length, collectLeafIds(layout).length);
  for (const pane of panes) {
    assert.ok(pane.rect.x >= 0);
    assert.ok(pane.rect.y >= 0);
    assert.ok(pane.rect.x + pane.rect.width <= wideBounds.width);
    assert.ok(pane.rect.y + pane.rect.height <= wideBounds.height);
  }
});
