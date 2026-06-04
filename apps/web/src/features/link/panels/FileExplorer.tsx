import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RefreshCw, FileText, Folder, FolderOpen, ChevronRight, ChevronDown, Lock, Unlock, Plus, Pencil, Trash2 } from "lucide-react";
import { useLinkStore } from "../link-store";
import { resolveContextMenuPosition } from "@/lib/context-menu-position";

interface FileEntry { name: string; path: string; is_dir?: boolean; isDir?: boolean; size?: number; }
interface FileNode extends FileEntry { children?: FileNode[]; expanded?: boolean; loaded?: boolean; }

interface FileExplorerProps { cwd?: string | null; }
function pathSeparator(path: string): string {
  return path.includes("\\") ? "\\" : "/";
}

function joinPath(parent: string, child: string): string {
  const separator = pathSeparator(parent);
  return `${parent.replace(/[\\/]+$/, "")}${separator}${child}`;
}

function renamePath(oldPath: string, nextName: string): string {
  const separator = pathSeparator(oldPath);
  const normalized = oldPath.replace(/[\\/]+$/, "");
  const cut = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (cut < 0) return nextName;
  return `${normalized.slice(0, cut + 1)}${nextName}`;
}

export function FileExplorer({ cwd }: FileExplorerProps) {
  const rpc = useLinkStore((s) => s.rpc);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [rootPath, setRootPath] = useState<string>("~");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [locked, setLocked] = useState(false);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const syncedRef = useRef<string | null>(null);

  // Sync CWD from active terminal (like desktop's useFocusedTerminalCwd)
  useEffect(() => {
    if (locked) return;
    if (!cwd || cwd === syncedRef.current) return;
    if (/^[A-Za-z]:\\?$/.test(cwd.trim())) return; // skip bare drive roots
    syncedRef.current = cwd;
    setRootPath(cwd);
    loadRoot(cwd);
  }, [cwd, locked]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    setContextMenuPosition(
      resolveContextMenuPosition(
        contextMenu.x,
        contextMenu.y,
        contextMenuRef.current.offsetWidth,
        contextMenuRef.current.offsetHeight,
      ),
    );
  }, [contextMenu]);

  const loadDir = useCallback(async (path: string): Promise<FileNode[]> => {
    try {
      const res = await rpc("fs.list", { path });
      if (Array.isArray(res)) return res.map((f: FileEntry) => ({ ...f, children: undefined, expanded: false, loaded: false }));
      return [];
    } catch { return []; }
  }, [rpc]);

  const loadRoot = useCallback(async (path?: string) => {
    setLoading(true);
    const p = path ?? rootPath;
    const nodes = await loadDir(p);
    setTree(nodes);
    setLoading(false);
  }, [rootPath, loadDir]);

  useEffect(() => { loadRoot(); }, []);

  const toggleExpand = useCallback(async (node: FileNode) => {
    if (!(node.is_dir ?? node.isDir)) return;
    const update = (nodes: FileNode[]): FileNode[] =>
      nodes.map((n) => {
        if (n.path !== node.path) return { ...n, children: n.children ? update(n.children) : undefined };
        if (!n.expanded && !n.loaded) {
          return { ...n, expanded: true, loaded: true, children: undefined };
        }
        return { ...n, expanded: !n.expanded };
      });
    setTree(update);

    if (!node.expanded && !node.loaded) {
      const children = await loadDir(node.path);
      setTree((prev) => {
        const insert = (nodes: FileNode[]): FileNode[] =>
          nodes.map((n) => n.path === node.path ? { ...n, children, loaded: true } : { ...n, children: n.children ? insert(n.children) : undefined });
        return insert(prev);
      });
    }
  }, [loadDir]);

  const handleCreate = useCallback(async (parentPath: string, isDir: boolean) => {
    const name = isDir ? "new-folder" : "new-file.txt";
    const path = joinPath(parentPath, name);
    await rpc("fs.create", { path, isDir });
    setEditingPath(path);
    setEditName(name);
    await loadRoot();
  }, [rpc, loadRoot]);

  const handleRename = useCallback(async (oldPath: string) => {
    if (!editName.trim()) { setEditingPath(null); return; }
    const newPath = renamePath(oldPath, editName.trim());
    await rpc("fs.rename", { oldPath, newPath });
    setEditingPath(null);
    await loadRoot();
  }, [editName, rpc, loadRoot]);

  const handleDelete = useCallback(async (path: string) => {
    await rpc("fs.delete", { path });
    if (selectedFile === path) {
      setSelectedFile(null);
      setFileContent("");
    }
    setContextMenu(null);
    await loadRoot();
  }, [loadRoot, rpc, selectedFile]);

  const loadFile = useCallback(async (path: string) => {
    const response = await rpc("fs.read", { path });
    setSelectedFile(path);
    setFileContent(typeof response?.content === "string" ? response.content : "");
  }, [rpc]);

  const saveFile = useCallback(async () => {
    if (!selectedFile) return;
    await rpc("fs.write", { path: selectedFile, content: fileContent });
  }, [fileContent, rpc, selectedFile]);

  const renderNode = (node: FileNode, depth: number) => (
    <div key={node.path}>
      <div
        className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs cursor-pointer hover:bg-accent/10 ${editingPath === node.path ? "bg-accent/10" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => (node.is_dir ?? node.isDir) ? toggleExpand(node) : loadFile(node.path)}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, path: node.path, isDir: Boolean(node.is_dir ?? node.isDir) }); }}
        data-file-path={node.path}
      >
        {(node.is_dir ?? node.isDir) ? (
          node.expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : <span className="w-3" />}
        {(node.is_dir ?? node.isDir) ? (
          node.expanded ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        {editingPath === node.path ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(node.path); if (e.key === "Escape") setEditingPath(null); }}
            onBlur={() => handleRename(node.path)}
            className="flex-1 min-w-0 bg-transparent text-xs outline-none border-b border-primary"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 min-w-0 truncate">{node.name}</span>
        )}
      </div>
      {(node.is_dir ?? node.isDir) && node.expanded && node.children?.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Explorer</span>
        <div className="flex gap-0.5">
          <button onClick={() => setLocked(!locked)} className={`flex h-6 w-6 items-center justify-center rounded ${locked ? "text-primary" : "text-muted-foreground"}`} title={locked ? "Unlock" : "Lock"}>
            {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => handleCreate(rootPath, false)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="New File">
            <FileText className="h-3.5 w-3.5" /><Plus className="h-2 w-2 -ml-1 -mt-2" />
          </button>
          <button onClick={() => handleCreate(rootPath, true)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="New Folder">
            <Folder className="h-3.5 w-3.5" /><Plus className="h-2 w-2 -ml-1 -mt-2" />
          </button>
          <button onClick={() => loadRoot()} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <div className="px-3 py-1 text-[10px] font-mono text-muted-foreground truncate border-b border-border/30 shrink-0">{rootPath}</div>
      <div className="flex-1 overflow-y-auto p-1">
        {tree.map((node) => renderNode(node, 0))}
        {tree.length === 0 && !loading && <p className="px-3 py-4 text-center text-xs text-muted-foreground">Empty directory</p>}
      </div>
      <div className="border-t border-border p-3 shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-foreground">
            {selectedFile ? selectedFile.split(/[\\/]/).pop() : "Preview"}
          </span>
          <button
            onClick={() => saveFile()}
            disabled={!selectedFile}
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-primary disabled:opacity-40"
          >
            Save
          </button>
        </div>
        <textarea
          value={fileContent}
          onChange={(event) => setFileContent(event.target.value)}
          disabled={!selectedFile}
          placeholder={selectedFile ? "Edit file..." : "Select a file to preview"}
          className="h-40 w-full resize-none rounded border border-border bg-transparent p-2 text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-60"
        />
      </div>
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-32 rounded border border-border bg-card py-1 shadow-xl"
          style={{ left: contextMenuPosition?.left ?? contextMenu.x, top: contextMenuPosition?.top ?? contextMenu.y }}
        >
          {contextMenu.isDir && (
            <>
              <button onClick={() => { setContextMenu(null); handleCreate(contextMenu.path, false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/10"><FileText className="h-3 w-3" /> New File</button>
              <button onClick={() => { setContextMenu(null); handleCreate(contextMenu.path, true); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/10"><Folder className="h-3 w-3" /> New Folder</button>
            </>
          )}
          <button onClick={() => { setEditingPath(contextMenu.path); setEditName(contextMenu.path.split(/[\\/]/).pop() ?? ""); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/10"><Pencil className="h-3 w-3" /> Rename</button>
          <button onClick={() => handleDelete(contextMenu.path)} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /> Delete</button>
        </div>
      )}
    </div>
  );
}
