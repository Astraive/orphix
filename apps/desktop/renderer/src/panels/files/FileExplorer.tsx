import { useEffect, useRef } from "react";
import { useFileStore } from "./file-store";
import { FileTreeItem } from "./FileTreeItem";
import { invoke } from "@/lib/electron-ipc";
import { CHANNELS } from "../../../../shared/channels";

export function FileExplorer() {
  const tree = useFileStore((s) => s.tree);
  const rootPath = useFileStore((s) => s.rootPath);
  const setRootPath = useFileStore((s) => s.setRootPath);
  const createFile = useFileStore((s) => s.createFile);
  const createFolder = useFileStore((s) => s.createFolder);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    invoke<string>(CHANNELS.SYSTEM_HOME_DIR).then((home) => {
      setRootPath(home);
    }).catch(console.error);
  }, [setRootPath]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-ox-border shrink-0">
        <span className="text-[10px] tracking-[0.15em] uppercase text-ox-accent font-semibold">
          Explorer
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => rootPath && createFile(rootPath)}
            className="toolbar-btn !w-6 !h-6"
            title="New File"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15h6" />
            </svg>
          </button>
          <button
            onClick={() => rootPath && createFolder(rootPath)}
            className="toolbar-btn !w-6 !h-6"
            title="New Folder"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <path d="M12 10v6" /><path d="M9 13h6" />
            </svg>
          </button>
          <button
            onClick={() => useFileStore.getState().refresh()}
            className="toolbar-btn !w-6 !h-6"
            title="Refresh"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Root path label */}
      {rootPath && (
        <div className="px-3 py-1 text-[9px] text-ox-muted/50 font-mono truncate border-b border-ox-border/30 shrink-0">
          {rootPath}
        </div>
      )}

      {/* Tree — only root entries, children load lazily on expand */}
      <div className="flex-1 overflow-auto">
        {tree.length === 0 && rootPath && (
          <div className="px-3 py-2 text-[10px] text-ox-muted/50 font-mono">Loading...</div>
        )}
        {tree.map((node) => (
          <FileTreeItem key={node.path} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}
