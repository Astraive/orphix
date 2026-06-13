import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceFileTree, mapGitStatusEntries, type FileTreeEntry, type FileTreeGitEntry } from "@orphix/ui";
import { ClipboardCopy, ExternalLink, FolderOpen, Terminal } from "lucide-react";
import { invoke } from "@/lib/ipc-client";
import { CHANNELS } from "@shared/ipc/channels";
import type { FileEntry, GitStatus as WorkspaceGitStatus } from "@shared/types/common";
import { useCanvasStore } from "../stores/canvas-store";
import { useFileTreeFontStore } from "../stores/file-tree-font-store";
import { useFocusedTerminalCwd } from "../hooks/use-focused-terminal-cwd";
import { getWorkspaceCwd } from "../lib/workspace-cwd";
import { useTheme } from "@/providers/ThemeProvider";

async function listTree(path: string, depth = 0): Promise<FileTreeEntry[]> {
  if (depth > 20) return [];
  let entries: FileEntry[];
  try {
    entries = await invoke<FileEntry[]>(CHANNELS.FILE_LIST, { path });
  } catch {
    return [];
  }
  const collected: FileTreeEntry[] = [];

  for (const entry of entries) {
    if (entry.isDir) {
      collected.push(...await listTree(entry.path, depth + 1));
    } else {
      collected.push({
        isDir: entry.isDir,
        name: entry.name,
        path: entry.path,
        size: entry.size,
      });
    }
  }

  return collected;
}

function mapDesktopGitStatus(status: WorkspaceGitStatus | null, rootPath: string): FileTreeGitEntry[] {
  if (!status) return [];
  return status.files.flatMap<FileTreeGitEntry>((file) => {
    const normalizedPath = file.path.replace(/\\/g, "/");
    const absolutePath = normalizedPath.startsWith(rootPath.replace(/\\/g, "/"))
      ? file.path
      : `${rootPath.replace(/[\\/]+$/, "")}${rootPath.includes("\\") ? "\\" : "/"}${normalizedPath.replace(/\//g, rootPath.includes("\\") ? "\\" : "/")}`;

    switch (file.status) {
      case "A":
        return [{ path: absolutePath, status: "added" as const }];
      case "D":
        return [{ path: absolutePath, status: "deleted" as const }];
      case "R":
        return [{ path: absolutePath, status: "renamed" as const }];
      case "??":
        return [{ path: absolutePath, status: "untracked" as const }];
      case "M":
      case "C":
      case "U":
      default:
        return [{ path: absolutePath, status: "modified" as const }];
    }
  });
}

function formatSize(size?: number): string | null {
  if (!size || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / (1024 * 102.4)) / 10} MB`;
}

export function FileExplorer() {
  const focusedTerminalCwd = useFocusedTerminalCwd();
  const { activeTheme } = useTheme();
  const treeFontStore = useFileTreeFontStore();
  const openedPathRef = useRef<string | null>(null);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [treeEntries, setTreeEntries] = useState<FileTreeEntry[]>([]);
  const [gitEntries, setGitEntries] = useState<FileTreeGitEntry[]>([]);
  const [locked, setLocked] = useState(false);
  const [clipboard, setClipboard] = useState<{ action: "copy" | "cut"; path: string } | null>(null);

  const loadTree = useCallback(async (path: string) => {
    try {
      const [entries, status] = await Promise.all([
        listTree(path),
        invoke<WorkspaceGitStatus | null>(CHANNELS.GIT_STATUS, { cwd: path }).catch(() => null),
      ]);
      setTreeEntries(entries);
      setGitEntries(mapDesktopGitStatus(status, path));
    } catch {
      setTreeEntries([]);
      setGitEntries([]);
    }
  }, []);

  useEffect(() => {
    getWorkspaceCwd().then(async (workspacePath) => {
      setRootPath(workspacePath);
      await loadTree(workspacePath);
    }).catch(console.error);
  }, [loadTree]);

  useEffect(() => {
    if (locked || !focusedTerminalCwd || !rootPath) return;
    if (focusedTerminalCwd === rootPath) return;
    if (/^[A-Za-z]:\\?$/.test(focusedTerminalCwd.trim())) return;
    setRootPath(focusedTerminalCwd);
    void loadTree(focusedTerminalCwd);
  }, [focusedTerminalCwd, loadTree, locked, rootPath]);

  const handleOpenFile = useCallback((path: string) => {
    if (openedPathRef.current === path) return;
    openedPathRef.current = path;
    const name = path.split(/[\\/]/).pop() ?? path;
    useCanvasStore.getState().openEditorPane(path, name);
  }, []);

  const theme = useMemo(() => ({
    type: "dark" as const,
    bg: "var(--orphix-color-base-background)",
    fg: "var(--orphix-color-text)",
    colors: {
      "panel.border": "var(--orphix-color-base-border)",
      "selection.background": "color-mix(in srgb, var(--orphix-color-primary) 12%, transparent)",
      "selection.foreground": "var(--orphix-color-primary)",
      "focus.ring": "var(--orphix-color-primary)",
      "input.background": "var(--orphix-color-base-background)",
      "input.foreground": "var(--orphix-color-text)",
    },
  }), []);

  const gitStatus = useMemo(() => (rootPath ? mapGitStatusEntries(rootPath, gitEntries) : []), [gitEntries, rootPath]);
  const sizeByPath = useMemo(() => new Map(treeEntries.map((entry) => [entry.path, formatSize(entry.size)])), [treeEntries]);
  const treeFontFamily = useMemo(() => {
    const themeDefault = activeTheme.fonts.fonts.families.code.family;
    return treeFontStore.getFontFamily(themeDefault);
  }, [activeTheme, treeFontStore]);

  return (
    <WorkspaceFileTree
      createFileName="untitled"
      fontFamily={treeFontFamily}
      gitStatus={gitStatus}
      isLocked={locked}
      onCopy={(path) => setClipboard({ action: "copy", path })}
      onCreateFile={(path) => invoke(CHANNELS.FILE_CREATE, { path, isDir: false })}
      onCreateFolder={(path) => invoke(CHANNELS.FILE_CREATE, { path, isDir: true })}
      onCut={(path) => setClipboard({ action: "cut", path })}
      onDelete={(path) => invoke(CHANNELS.FILE_DELETE, { path })}
      onMove={async (moves) => {
        for (const move of moves) {
          await invoke(CHANNELS.FILE_MOVE, { srcPath: move.from, destPath: move.to });
        }
      }}
      onOpenFile={handleOpenFile}
      onPaste={async (path) => {
        if (!clipboard) return;
        const name = clipboard.path.split(/[\\/]/).pop() ?? "item";
        const destination = `${path.replace(/[\\/]+$/, "")}${path.includes("\\") ? "\\" : "/"}${name}`;
        if (clipboard.action === "copy") {
          await invoke(CHANNELS.FILE_COPY, { srcPath: clipboard.path, destPath: destination });
        } else {
          await invoke(CHANNELS.FILE_MOVE, { srcPath: clipboard.path, destPath: destination });
          setClipboard(null);
        }
      }}
      onRefresh={async () => {
        if (rootPath) await loadTree(rootPath);
      }}
      onRename={(oldPath, newPath) => invoke(CHANNELS.FILE_RENAME, { oldPath, newPath })}
      onToggleLocked={() => setLocked((value) => !value)}
      renderRowDecoration={({ item }) => {
        if (item.kind === "directory") return null;
        const ext = item.path.split(".").pop()?.toUpperCase() ?? "";
        const absolutePath = rootPath
          ? `${rootPath.replace(/[\\/]+$/, "")}${rootPath.includes("\\") ? "\\" : "/"}${item.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/")}`
          : item.path;
        const size = sizeByPath.get(absolutePath);
        const parts: string[] = [];
        if (ext) parts.push(ext);
        if (size) parts.push(size);
        return parts.length > 0 ? { text: parts.join(" · "), title: parts.join(" | ") } : null;
      }}
      renderAdditionalContextActions={({ close, isDir, path }) => (
        <>
          <div className="my-1 h-px bg-border" />
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { close(); void invoke(CHANNELS.FILE_OPEN_TERMINAL, { path }); }} type="button">
            <Terminal className="h-4 w-4" /> Open in Terminal
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { close(); void navigator.clipboard.writeText(path); }} type="button">
            <ClipboardCopy className="h-4 w-4" /> Copy Path
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { close(); void invoke(CHANNELS.FILE_REVEAL, { path }); }} type="button">
            <FolderOpen className="h-4 w-4" /> Reveal in Explorer
          </button>
          {!isDir && (
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { close(); void invoke(CHANNELS.FILE_OPEN_EXTERNAL, { path }); }} type="button">
              <ExternalLink className="h-4 w-4" /> Open Externally
            </button>
          )}
        </>
      )}
      rootPath={rootPath}
      theme={theme}
      treeEntries={treeEntries}
    />
  );
}
