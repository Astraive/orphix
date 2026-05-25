import type { Workspace } from "./canvas-store";
import { useCanvasStore } from "./canvas-store";
import { PaneRenderer } from "./PaneRenderer";

const TRANSITION_CANVAS = "850ms cubic-bezier(0.25, 1, 0.5, 1)";
const WS_GAP_VH = 0.8; // gap between workspaces (double the window gap)

interface WorkspaceRowProps {
  workspace: Workspace;
  wsIdx: number;
  isActiveWorkspace: boolean;
}

export function WorkspaceRow({ workspace, wsIdx, isActiveWorkspace }: WorkspaceRowProps) {
  const { windows, activeWindowIndex } = workspace;
  const winCount = windows.length;

  // Vertical offset: each workspace is 100vh + double gap
  const wsStride = 100 + WS_GAP_VH;
  const stripWidth = `${Math.max(1, winCount) * 100}%`;
  const windowWidth = `${100 / Math.max(1, winCount)}%`;
  const translateX = `-${activeWindowIndex * (100 / Math.max(1, winCount))}%`;

  return (
    <div
      className="absolute inset-0 w-full h-full flex items-center"
      style={{
        transition: "opacity 500ms ease",
        opacity: isActiveWorkspace ? 1 : 0.4,
        transform: `translateY(${wsIdx * wsStride}vh)`,
        pointerEvents: isActiveWorkspace ? "auto" : "none",
      }}
    >
      {winCount === 0 ? (
        <div className="w-full text-center select-none">
          {isActiveWorkspace ? (
            <p className="text-xs tracking-[0.4em] uppercase animate-pulse font-mono" style={{ color: "var(--ox-accent)", opacity: 0.5 }}>
              Alt+N to open window
            </p>
          ) : (
            <p className="text-xs tracking-[0.4em] uppercase font-mono" style={{ color: "var(--ox-text-dim)", opacity: 0.2 }}>
              empty workspace
            </p>
          )}
        </div>
      ) : (
        /* Horizontal camera: each window fills the screen, with gaps */
        <div
          className="flex h-full min-w-0 shrink-0 overflow-hidden"
          style={{
            width: stripWidth,
            flexBasis: stripWidth,
            maxWidth: "none",
            transition: `transform ${TRANSITION_CANVAS}`,
            transform: `translateX(${translateX})`,
          }}
        >
          {windows.map((win, winIdx) => {
            const isActiveWin = isActiveWorkspace && winIdx === activeWindowIndex;

            return (
              <div
                key={win.id}
                className="h-full shrink-0 min-w-0 overflow-hidden"
                style={{
                  width: windowWidth,
                  flexBasis: windowWidth,
                  maxWidth: "none",
                }}
              >
                <div
                  onClick={() => {
                    if (!isActiveWin) {
                      useCanvasStore.setState((s) => ({
                        workspaces: s.workspaces.map((w, i) =>
                          i === wsIdx ? { ...w, activeWindowIndex: winIdx } : w,
                        ),
                      }));
                    }
                  }}
                  className="w-full h-full min-w-0 min-h-0 transition-all duration-300"
                  style={{
                    borderRadius: "10px",
                    border: isActiveWin
                      ? "1.5px solid rgba(50, 224, 196, 0.5)"
                      : "1.5px solid rgba(50, 224, 196, 0.06)",
                    background: "rgba(5, 13, 16, 0.6)",
                    overflow: "hidden",
                    boxShadow: isActiveWin ? "0 0 24px rgba(50, 224, 196, 0.05)" : "none",
                  }}
                >
                  <PaneRenderer
                    layout={win.layout}
                    paneData={win.paneData}
                    focusedPaneId={win.focusedPaneId}
                    onFocusPane={(paneId) => {
                      useCanvasStore.setState((s) => ({
                        workspaces: s.workspaces.map((w, i) =>
                          i === wsIdx
                            ? {
                                ...w,
                                activeWindowIndex: winIdx,
                                windows: w.windows.map((wi, j) =>
                                  j === winIdx ? { ...wi, focusedPaneId: paneId } : wi,
                                ),
                              }
                            : w,
                        ),
                      }));
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
