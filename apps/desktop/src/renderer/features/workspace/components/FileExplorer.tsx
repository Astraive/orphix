import { useCallback, useEffect, useRef, useState } from "react";
import { useFileStore } from "../stores/file-store";
import { FileTreeItem, FileContextMenu } from "./FileTreeItem";
import { useFocusedTerminalCwd } from "../hooks/use-focused-terminal-cwd";
import { getWorkspaceCwd } from "../lib/workspace-cwd";

export function FileExplorer() {
  const tree = useFileStore((s) => s.tree);
  const rootPath = useFileStore((s) => s.rootPath);
  const setRootPath = useFileStore((s) => s.setRootPath);
  const createFile = useFileStore((s) => s.createFile);
  const createFolder = useFileStore((s) => s.createFolder);
  const clearSelection = useFileStore((s) => s.clearSelection);
  const selectRange = useFileStore((s) => s.selectRange);
  const focusedTerminalCwd = useFocusedTerminalCwd();
  const loadedRef = useRef(false);
  const syncedPathRef = useRef<string | null>(null);
  const [locked, setLocked] = useState(false);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Marquee selection state
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const marqueeRef = useRef(marquee);
  marqueeRef.current = marquee;

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getWorkspaceCwd().then((workspaceDir) => {
      syncedPathRef.current = workspaceDir;
      setRootPath(workspaceDir);
    }).catch(console.error);
  }, [setRootPath]);

  useEffect(() => {
    if (locked) return;
    if (!focusedTerminalCwd || focusedTerminalCwd === syncedPathRef.current) return;
    if (/^[A-Za-z]:\\?$/.test(focusedTerminalCwd.trim())) return;
    syncedPathRef.current = focusedTerminalCwd;
    setRootPath(focusedTerminalCwd).catch(console.error);
  }, [focusedTerminalCwd, setRootPath, locked]);

  // Marquee selection handlers
  const handleMarqueeStart = useCallback((e: React.MouseEvent) => {
    // Only start marquee on direct click on the tree background (not on items)
    if ((e.target as HTMLElement).dataset.filePath) return;
    if (e.button !== 0) return;
    clearSelection();
    setMarquee({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
  }, [clearSelection]);

  useEffect(() => {
    if (!marquee) return;
    const handleMove = (e: MouseEvent) => {
      setMarquee((prev) => prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null);
    };
    const handleUp = () => {
      // Collect all file items within the marquee rect
      const m = marqueeRef.current;
      if (m) {
        const left = Math.min(m.startX, m.endX);
        const top = Math.min(m.startY, m.endY);
        const right = Math.max(m.startX, m.endX);
        const bottom = Math.max(m.startY, m.endY);
        const container = treeContainerRef.current;
        if (container) {
          const items = container.querySelectorAll("[data-file-path]");
          const paths: string[] = [];
          items.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) {
              const p = el.getAttribute("data-file-path");
              if (p) paths.push(p);
            }
          });
          if (paths.length > 0) selectRange(paths);
        }
      }
      setMarquee(null);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [marquee, selectRange]);

  // Marquee rect
  const marqueeRect = marquee ? {
    left: Math.min(marquee.startX, marquee.endX),
    top: Math.min(marquee.startY, marquee.endY),
    width: Math.abs(marquee.endX - marquee.startX),
    height: Math.abs(marquee.endY - marquee.startY),
  } : null;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-ox-border shrink-0">
        <span className="text-sm tracking-[0.15em] uppercase text-ox-accent font-semibold">
          Explorer
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setLocked((v) => !v)}
            className={`toolbar-btn !w-7 !h-7 ${locked ? "text-ox-accent" : "text-ox-muted/50"}`}
            title={locked ? "Unlock: follow terminal CWD" : "Lock: keep current path"}
          >
            {locked ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
          </button>
          <button
            onClick={() => rootPath && createFile(rootPath)}
            className="toolbar-btn !w-7 !h-7"
            title="New File"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15h6" />
            </svg>
          </button>
          <button
            onClick={() => rootPath && createFolder(rootPath)}
            className="toolbar-btn !w-7 !h-7"
            title="New Folder"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <path d="M12 10v6" /><path d="M9 13h6" />
            </svg>
          </button>
          <button
            onClick={() => useFileStore.getState().refresh()}
            className="toolbar-btn !w-7 !h-7"
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Root path label */}
      {rootPath && (
        <div className="px-3 py-1.5 text-sm text-ox-muted/50 font-mono truncate border-b border-ox-border/30 shrink-0">
          {rootPath}
        </div>
      )}

      {/* Tree — only root entries, children load lazily on expand */}
      <div ref={treeContainerRef} className="flex-1 overflow-auto relative" onMouseDown={handleMarqueeStart}>
        {tree.length === 0 && rootPath && (
          <div className="px-3 py-2 text-sm text-ox-muted/50 font-mono">Loading...</div>
        )}
        {tree.map((node) => (
          <FileTreeItem key={node.path} node={node} depth={0} />
        ))}

        {/* Marquee selection overlay */}
        {marqueeRect && marqueeRect.width > 3 && marqueeRect.height > 3 && (
          <div
            className="fixed pointer-events-none z-[150] rounded-sm"
            style={{
              left: marqueeRect.left,
              top: marqueeRect.top,
              width: marqueeRect.width,
              height: marqueeRect.height,
              background: "color-mix(in srgb, var(--orphix-color-primary) 15%, transparent)",
              border: "1px solid var(--orphix-color-primary)",
            }}
          />
        )}
      </div>

      {/* Global context menu */}
      <FileContextMenu />
    </div>
  );
}
