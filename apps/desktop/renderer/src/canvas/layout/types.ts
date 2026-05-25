export type PaneKind = "terminal" | "agent" | "logs" | "preview" | "editor";

export type PaneNode =
  | { type: "leaf"; paneId: string; paneKind: PaneKind }
  | {
      type: "split";
      direction: "horizontal" | "vertical";
      ratio: number;
      first: PaneNode;
      second: PaneNode;
    };

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaneLayout {
  paneId: string;
  paneKind: PaneKind;
  rect: Rect;
}

export const PANE_GAP_PX = 4;
export const MIN_TERMINAL_PANE_WIDTH = 220;
export const MIN_TERMINAL_PANE_HEIGHT = 120;
