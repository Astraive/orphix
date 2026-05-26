import { useState, useCallback, type ReactNode } from "react";
import { getFileIcon } from "@/icons/file-icons";
import { useFileStore, type FileNode } from "../stores/file-store";
import {
  FilePlus,
  FolderPlus,
  Scissors,
  Copy,
  Clipboard,
  PenLine,
  Trash2,
  Terminal,
  FolderOpen,
  ClipboardCopy,
} from "lucide-react";

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
        className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer text-sm font-mono transition-colors duration-100 hover:bg-orphix-hover-subtle"
        style={{
          paddingLeft: `${depth * 12 + 8}px`,
          background: isSelected ? "color-mix(in srgb, var(--orphix-color-primary) 8%, transparent)" : "transparent",
          color: isSelected ? "var(--orphix-color-primary)" : "var(--orphix-color-text-subtle)",
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {isDir ? (
          <span className="w-3 text-center text-sm" style={{ opacity: 0.5 }}>
            {isExpanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="w-3" />
        )}
        <span className="w-5 h-5 flex items-center justify-center"><Icon size={16} /></span>
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
            className="flex-1 bg-transparent outline-none border-b border-ox-accent text-ox-text text-sm"
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
          className="text-sm text-ox-muted/50 font-mono py-0.5"
          style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
        >
          Loading...
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[200] min-w-[240px] py-1.5 rounded-xl shadow-xl"
          style={{
            left: contextMenu.x, top: contextMenu.y,
            background: "color-mix(in srgb, var(--orphix-color-base-background) 95%, transparent)",
            border: "1px solid var(--orphix-color-base-border)",
            backdropFilter: "blur(16px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <CMItem icon={<FilePlus size={16} />} label="New File" onClick={() => { createFile(node.path); setContextMenu(null); }} />
          <CMItem icon={<FolderPlus size={16} />} label="New Folder" onClick={() => { createFolder(node.path); setContextMenu(null); }} />
          <div className="h-px bg-ox-border my-1" />
          <CMItem icon={<Scissors size={16} />} label="Cut" shortcut="Ctrl+X" onClick={() => { cutNode(node.path); setContextMenu(null); }} />
          <CMItem icon={<Copy size={16} />} label="Copy" shortcut="Ctrl+C" onClick={() => { copyNode(node.path); setContextMenu(null); }} />
          <CMItem icon={<Clipboard size={16} />} label="Paste" shortcut="Ctrl+V" onClick={() => { pasteNode(node.path); setContextMenu(null); }} disabled={!clipboard} />
          <div className="h-px bg-ox-border my-1" />
          <CMItem icon={<PenLine size={16} />} label="Rename" shortcut="F2" onClick={() => { setRenaming(node.path); setContextMenu(null); }} />
          <CMItem icon={<Trash2 size={16} />} label="Delete" shortcut="Del" onClick={() => { deleteNode(node.path); setContextMenu(null); }} danger />
          <div className="h-px bg-ox-border my-1" />
          <CMItem icon={<Terminal size={16} />} label="Open in Terminal" onClick={() => { window.orphix.invoke("file:open-terminal", { path: node.path }).catch(() => {}); setContextMenu(null); }} />
          <CMItem icon={<ClipboardCopy size={16} />} label="Copy Path" onClick={() => { navigator.clipboard.writeText(node.path); setContextMenu(null); }} />
          <CMItem icon={<FolderOpen size={16} />} label="Reveal in Explorer" onClick={() => { window.orphix.invoke("file:reveal", { path: node.path }).catch(() => {}); setContextMenu(null); }} />
        </div>
      )}
    </>
  );
}

function CMItem({ icon, label, shortcut, onClick, disabled, danger }: {
  icon?: ReactNode; label: string; shortcut?: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-2 min-h-[36px] text-sm font-mono text-left flex items-center gap-3 hover:bg-ox-accent/10 transition-colors disabled:opacity-30"
      style={{ color: danger ? "var(--orphix-color-danger)" : "var(--orphix-color-text-subtle)" }}
    >
      {icon && <span className="w-4 flex items-center justify-center shrink-0">{icon}</span>}
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-ox-muted/50 ml-4 text-xs">{shortcut}</span>}
    </button>
  );
}
