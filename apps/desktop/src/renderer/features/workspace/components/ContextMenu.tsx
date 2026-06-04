import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
import { resolveContextMenuPosition } from "../lib/context-menu-position";

interface ContextMenuProps {
  x: number;
  y: number;
  isDir: boolean;
  path: string;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  hasClipboard: boolean;
  onOpenInTerminal?: () => void;
  onCopyPath?: () => void;
  onRevealInExplorer?: () => void;
}

export function ContextMenu({
  x, y, onClose,
  onNewFile, onNewFolder, onRename, onDelete,
  onCopy, onCut, onPaste, hasClipboard,
  onOpenInTerminal, onCopyPath, onRevealInExplorer,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const { offsetWidth, offsetHeight } = ref.current;
    setPosition(resolveContextMenuPosition({ x, y }, offsetWidth, offsetHeight));
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="fixed z-[200] min-w-[240px] py-1.5 rounded-xl shadow-xl anim-scale-in"
      style={{
        left: position.left,
        top: position.top,
        background: "color-mix(in srgb, var(--orphix-color-base-background) 97%, transparent)",
        border: "1px solid var(--orphix-color-base-border)",
        backdropFilter: "blur(16px)",
      }}
    >
      <Item icon={<FilePlus size={16} />} label="New File" onClick={onNewFile} />
      <Item icon={<FolderPlus size={16} />} label="New Folder" onClick={onNewFolder} />
      <div className="h-px bg-ox-border my-1" />
      <Item icon={<Scissors size={16} />} label="Cut" shortcut="Ctrl+X" onClick={onCut} />
      <Item icon={<Copy size={16} />} label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
      <Item icon={<Clipboard size={16} />} label="Paste" shortcut="Ctrl+V" onClick={onPaste} disabled={!hasClipboard} />
      <div className="h-px bg-ox-border my-1" />
      <Item icon={<PenLine size={16} />} label="Rename" shortcut="F2" onClick={onRename} />
      <Item icon={<Trash2 size={16} />} label="Delete" shortcut="Del" onClick={onDelete} danger />
      <div className="h-px bg-ox-border my-1" />
      <Item icon={<Terminal size={16} />} label="Open in Terminal" onClick={onOpenInTerminal ?? (() => {})} disabled={!onOpenInTerminal} />
      <Item icon={<ClipboardCopy size={16} />} label="Copy Path" onClick={onCopyPath ?? (() => {})} />
      <Item icon={<FolderOpen size={16} />} label="Reveal in Explorer" onClick={onRevealInExplorer ?? (() => {})} disabled={!onRevealInExplorer} />
    </div>
  );
}

function Item({ icon, label, shortcut, onClick, disabled, danger }: {
  icon?: ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-2 min-h-[36px] text-sm font-mono text-left flex items-center gap-3 hover:bg-ox-accent/10 transition-all-fast disabled:opacity-30 hover-scale"
      style={{ color: danger ? "var(--orphix-color-danger)" : "var(--orphix-color-text-subtle)" }}
    >
      {icon && <span className="w-4 flex items-center justify-center shrink-0">{icon}</span>}
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-ox-muted/50 ml-4 text-sm">{shortcut}</span>}
    </button>
  );
}
