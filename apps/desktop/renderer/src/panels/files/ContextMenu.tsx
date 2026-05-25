import { useEffect, useRef } from "react";

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
}

export function ContextMenu({
  x, y, onClose,
  onNewFile, onNewFolder, onRename, onDelete,
  onCopy, onCut, onPaste, hasClipboard,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[200] min-w-[160px] py-1 rounded-lg shadow-xl"
      style={{
        left: x, top: y,
        background: "rgba(5, 13, 16, 0.97)",
        border: "1px solid var(--ox-border)",
        backdropFilter: "blur(16px)",
      }}
    >
      <Item label="New File" onClick={onNewFile} />
      <Item label="New Folder" onClick={onNewFolder} />
      <div className="h-px bg-ox-border my-1" />
      <Item label="Cut" shortcut="Ctrl+X" onClick={onCut} />
      <Item label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
      <Item label="Paste" shortcut="Ctrl+V" onClick={onPaste} disabled={!hasClipboard} />
      <div className="h-px bg-ox-border my-1" />
      <Item label="Rename" shortcut="F2" onClick={onRename} />
      <Item label="Delete" shortcut="Del" onClick={onDelete} danger />
    </div>
  );
}

function Item({ label, shortcut, onClick, disabled, danger }: {
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
      className="w-full px-3 py-1 text-xs font-mono text-left flex items-center justify-between hover:bg-ox-accent/10 transition-colors disabled:opacity-30"
      style={{ color: danger ? "#FF6B6B" : "var(--ox-text-dim)" }}
    >
      <span>{label}</span>
      {shortcut && <span className="text-ox-muted/50 ml-4">{shortcut}</span>}
    </button>
  );
}
