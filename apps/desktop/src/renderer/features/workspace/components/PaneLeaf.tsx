import type { PaneData } from "../stores/canvas-store";
import { TerminalPane } from "./WorkspaceTerminalPane";
import { FileEditor } from "@/features/editor/components/FileEditor";

interface PaneLeafProps {
  paneId: string;
  data: PaneData | undefined;
  isActive: boolean;
  onFocus: () => void;
  /** When false, omit the data-pane-id wrapper (tab mode reuses one slot). */
  tagged?: boolean;
}

/** Renders a single leaf pane (editor or terminal). Shared by tiling and tab layouts. */
export function PaneLeaf({ paneId, data, isActive, onFocus, tagged = true }: PaneLeafProps) {
  const inner =
    data?.kind === "editor" ? (
      <FileEditor paneId={paneId} filePath={data.filePath} isActive={isActive} onFocus={onFocus} />
    ) : (
      <TerminalPane
        paneId={paneId}
        sessionId={data && "sessionId" in data ? data.sessionId : null}
        isActive={isActive}
        onFocus={onFocus}
      />
    );

  return (
    <div {...(tagged ? { "data-pane-id": paneId } : {})} className="w-full h-full min-w-0 min-h-0">
      {inner}
    </div>
  );
}
