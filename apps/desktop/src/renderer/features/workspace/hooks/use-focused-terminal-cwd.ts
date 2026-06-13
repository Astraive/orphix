import { useMemo } from "react";
import { useTerminalRuntime } from "../../terminal/hooks/useTerminalRuntime";
import { useCanvasStore } from "../stores/canvas-store";

export function useFocusedTerminalCwd(): string | null {
  const workspaces = useCanvasStore((s) => s.workspaces);
  const activeWorkspaceIndex = useCanvasStore((s) => s.activeWorkspaceIndex);
  const { sessions } = useTerminalRuntime();

  return useMemo(() => {
    const workspace = workspaces[activeWorkspaceIndex];
    const window = workspace?.windows[workspace.activeWindowIndex];
    const pane = window ? window.paneData[window.focusedPaneId] : null;
    const sessionId = pane && "sessionId" in pane ? pane.sessionId : null;
    const cwd = sessionId ? sessions[sessionId]?.cwd : null;
    return cwd && cwd.trim().length > 0 ? cwd : null;
  }, [activeWorkspaceIndex, sessions, workspaces]);
}
