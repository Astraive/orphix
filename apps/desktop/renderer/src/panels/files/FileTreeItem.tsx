import { useState, useCallback } from "react";
import { getFileIcon } from "../../icons/file-icons";
import { useFileStore, type FileNode } from "./file-store";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
}

export function FileTreeItem({ node, depth }: FileTreeItemProps) {
  const expanded = useFileStore((s) => s.expanded);
  const selected = useFileStore((s) => s.selected);
  const renaming = useFileStore((s) => s.renaming);
  const toggleExpand = useFileStore((s) => s.toggleExpand);
  const select = useFileStore((s) => s.select);
  const setRenaming = useFileStore((s) => s.setRenaming);
  const renameNode = useFileStore((s) => s.renameNode);
  const createFile = useFileStore((s) => s.createFile);
  const createFolder = useFileStore((s) => s.createFolder);
  const deleteNode = useFileStore((s) => s.deleteNode);
  const copyNode = useFileStore((s) => s.copyNode);
  const cutNode = useFileStore((s) => s.cutNode);
  const pasteNode = useFileStore((s) => s.pasteNode);
  const clipboard = useFileStore((s) => s.clipboard);

  const isDir = node.isDir;
  const isExpanded = !!expanded[node.path];
  const isSelected = selected === node.path;
  const isRenaming = renaming === node.path;
  const [renameValue, setRenameValue] = useState(node.name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const Icon = getFileIcon(node.name, isDir, isExpanded);

  const handleClick = useCallback(() => {
    select(node.path);
    if (isDir) toggleExpand(node.path);
  }, [node.path, isDir, select, toggleExpand]);

  const handleDoubleClick = useCallback(() => {
    if (!isDir) {
      window.orphix.invoke("file:open-external", { path: node.path }).catch(() => {});
    }
  }, [node.path, isDir]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    select(node.path);
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [node.path, select]);

  const handleRenameSubmit = useCallback(() => {
    if (renameValue && renameValue !== node.name) {
      const dir = node.path.substring(0, node.path.lastIndexOf("/"));
      renameNode(node.path, `${dir}/${renameValue}`);
    }
    setRenaming(null);
  }, [renameValue, node.name, node.path, renameNode, setRenaming]);

  // Close context menu on any click
  if (contextMenu) {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close, { once: true });
  }

  return (
    <>
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer text-xs font-mono transition-colors duration-100 hover:bg-white/5"
        style={{
          paddingLeft: `${depth * 12 + 8}px`,
          background: isSelected ? "rgba(50, 224, 196, 0.08)" : "transparent",
          color: isSelected ? "var(--ox-accent)" : "var(--ox-text-dim)",
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {isDir ? (
          <span className="w-3 text-center text-[10px]" style={{ opacity: 0.5 }}>
            {isExpanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="w-3" />
        )}
        <span className="w-4 h-4 flex items-center justify-center"><Icon size={14} /></span>
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") setRenaming(null);
            }}
            className="flex-1 bg-transparent outline-none border-b border-ox-accent text-ox-text text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{node.name}</span>
        )}
      </div>

      {/* Only render children if expanded AND loaded */}
      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isDir && isExpanded && node.children === undefined && (
        <div
          className="text-[10px] text-ox-muted/50 font-mono py-0.5"
          style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
        >
          Loading...
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[200] min-w-[160px] py-1 rounded-lg shadow-xl"
          style={{
            left: contextMenu.x, top: contextMenu.y,
            background: "rgba(5, 13, 16, 0.95)",
            border: "1px solid var(--ox-border)",
            backdropFilter: "blur(16px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <CMItem label="New File" onClick={() => { createFile(node.path); setContextMenu(null); }} />
          <CMItem label="New Folder" onClick={() => { createFolder(node.path); setContextMenu(null); }} />
          <div className="h-px bg-ox-border my-1" />
          <CMItem label="Cut" onClick={() => { cutNode(node.path); setContextMenu(null); }} />
          <CMItem label="Copy" onClick={() => { copyNode(node.path); setContextMenu(null); }} />
          <CMItem label="Paste" onClick={() => { pasteNode(node.path); setContextMenu(null); }} disabled={!clipboard} />
          <div className="h-px bg-ox-border my-1" />
          <CMItem label="Rename" onClick={() => { setRenaming(node.path); setContextMenu(null); }} />
          <CMItem label="Delete" onClick={() => { deleteNode(node.path); setContextMenu(null); }} danger />
        </div>
      )}
    </>
  );
}

function CMItem({ label, onClick, disabled, danger }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-3 py-1 text-xs font-mono text-left hover:bg-ox-accent/10 transition-colors disabled:opacity-30"
      style={{ color: danger ? "#FF6B6B" : "var(--ox-text-dim)" }}
    >
      {label}
    </button>
  );
}
