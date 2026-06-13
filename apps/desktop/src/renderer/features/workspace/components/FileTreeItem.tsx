import { useState, useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { getFileIcon } from "@/icons/file-icons";
import { useFileStore, type FileNode } from "../stores/file-store";
import { useCanvasStore } from "../stores/canvas-store";
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
  ExternalLink,
} from "lucide-react";
import { resolveContextMenuPosition } from "../lib/context-menu-position";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
}

export function FileTreeItem({ node, depth }: FileTreeItemProps) {
  const expanded = useFileStore((s) => s.expanded);
  const selected = useFileStore((s) => s.selected);
  const selectedSet = useFileStore((s) => s.selectedSet);
  const renaming = useFileStore((s) => s.renaming);
  const toggleExpand = useFileStore((s) => s.toggleExpand);
  const select = useFileStore((s) => s.select);
  const selectMulti = useFileStore((s) => s.selectMulti);
  const setRenaming = useFileStore((s) => s.setRenaming);
  const renameNode = useFileStore((s) => s.renameNode);
  const setContextMenu = useFileStore((s) => s.setContextMenu);

  const isDir = node.isDir;
  const isExpanded = !!expanded[node.path];
  const isSelected = selectedSet.has(node.path) || selected === node.path;
  const isRenaming = renaming === node.path;
  const [renameValue, setRenameValue] = useState(node.name);
  const Icon = getFileIcon(node.name, isDir, isExpanded);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      selectMulti(node.path);
    } else {
      select(node.path);
    }
    if (isDir) toggleExpand(node.path);
  }, [node.path, isDir, select, selectMulti, toggleExpand]);

  const handleDoubleClick = useCallback(() => {
    if (!isDir) {
      useCanvasStore.getState().openEditorPane(node.path, node.name);
    }
  }, [node.path, node.name, isDir]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSet.has(node.path)) select(node.path);
    setContextMenu({ x: e.clientX, y: e.clientY, path: node.path, isDir });
  }, [node.path, isDir, select, selectedSet, setContextMenu]);

  const handleRenameSubmit = useCallback(() => {
    if (renameValue && renameValue !== node.name) {
      const dir = node.path.substring(0, node.path.lastIndexOf("/"));
      renameNode(node.path, `${dir}/${renameValue}`);
    }
    setRenaming(null);
  }, [renameValue, node.name, node.path, renameNode, setRenaming]);

  return (
    <>
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer text-sm font-mono transition-colors duration-100 hover:bg-orphix-hover-subtle"
        data-file-path={node.path}
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
    </>
  );
}

// ── Global Context Menu (rendered once, positioned at cursor) ──

export function FileContextMenu() {
  const contextMenu = useFileStore((s) => s.contextMenu);
  const setContextMenu = useFileStore((s) => s.setContextMenu);
  const clipboard = useFileStore((s) => s.clipboard);
  const createFile = useFileStore((s) => s.createFile);
  const createFolder = useFileStore((s) => s.createFolder);
  const renameNode = useFileStore((s) => s.renameNode);
  const deleteNode = useFileStore((s) => s.deleteNode);
  const copyNode = useFileStore((s) => s.copyNode);
  const cutNode = useFileStore((s) => s.cutNode);
  const pasteNode = useFileStore((s) => s.pasteNode);
  const setRenaming = useFileStore((s) => s.setRenaming);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const { x, y, path, isDir } = contextMenu ?? { x: 0, y: 0, path: "", isDir: false };

  useLayoutEffect(() => {
    if (!contextMenu || !menuRef.current) return;
    setPosition(
      resolveContextMenuPosition(
        { x, y },
        menuRef.current.offsetWidth,
        menuRef.current.offsetHeight,
      ),
    );
  }, [contextMenu, x, y]);

  if (!contextMenu) return null;

  const close = () => setContextMenu(null);

  return (
    <>
      {/* Backdrop to catch clicks outside */}
      <div className="fixed inset-0 z-[199]" onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
      <div
        ref={menuRef}
        className="fixed z-[200] min-w-[240px] py-1.5 rounded-xl shadow-xl anim-scale-in"
        style={{
          left: position.left,
          top: position.top,
          background: "color-mix(in srgb, var(--orphix-color-base-background) 95%, transparent)",
          border: "1px solid var(--orphix-color-base-border)",
          backdropFilter: "blur(16px)",
        }}
      >
        <CMItem icon={<FilePlus size={16} />} label="New File" onClick={() => { createFile(path); close(); }} />
        <CMItem icon={<FolderPlus size={16} />} label="New Folder" onClick={() => { createFolder(path); close(); }} />
        <div className="h-px bg-ox-border my-1" />
        <CMItem icon={<Scissors size={16} />} label="Cut" shortcut="Ctrl+X" onClick={() => { cutNode(path); close(); }} />
        <CMItem icon={<Copy size={16} />} label="Copy" shortcut="Ctrl+C" onClick={() => { copyNode(path); close(); }} />
        <CMItem icon={<Clipboard size={16} />} label="Paste" shortcut="Ctrl+V" onClick={() => { pasteNode(path); close(); }} disabled={!clipboard} />
        <div className="h-px bg-ox-border my-1" />
        <CMItem icon={<PenLine size={16} />} label="Rename" shortcut="F2" onClick={() => { setRenaming(path); close(); }} />
        <CMItem icon={<Trash2 size={16} />} label="Delete" shortcut="Del" onClick={() => { deleteNode(path); close(); }} danger />
        <div className="h-px bg-ox-border my-1" />
        <CMItem icon={<Terminal size={16} />} label="Open in Terminal" onClick={() => { window.orphix.invoke("file:open-terminal", { path }).catch(() => {}); close(); }} />
        <CMItem icon={<ClipboardCopy size={16} />} label="Copy Path" onClick={() => { navigator.clipboard.writeText(path); close(); }} />
        <CMItem icon={<FolderOpen size={16} />} label="Reveal in Explorer" onClick={() => { window.orphix.invoke("file:reveal", { path }).catch(() => {}); close(); }} />
        {!isDir && <CMItem icon={<ExternalLink size={16} />} label="Open Externally" onClick={() => { window.orphix.invoke("file:open-external", { path }).catch(() => {}); close(); }} />}
      </div>
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
