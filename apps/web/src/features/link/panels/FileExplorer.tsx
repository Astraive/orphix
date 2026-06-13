import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkspaceFileTree, mapGitStatusEntries, type FileTreeEntry, type FileTreeGitEntry } from "@orphix/ui";
import { useLinkStore } from "../link-store";

interface FileEntry {
  name: string;
  path: string;
  is_dir?: boolean;
  isDir?: boolean;
  size?: number;
}

interface GitStatus {
  files: Array<{ path: string; status: string }>;
}

interface FileExplorerProps {
  cwd?: string | null;
  onOpenFile?: (path: string) => void;
}

async function collectTree(
  path: string,
  rpc: (method: string, params?: Record<string, unknown>, cwd?: string) => Promise<unknown>,
): Promise<FileTreeEntry[]> {
  const entries = await rpc("fs.list", { path }, path);
  const normalizedEntries = Array.isArray(entries)
    ? entries.map((entry) => ({
        isDir: Boolean((entry as FileEntry).isDir ?? (entry as FileEntry).is_dir),
        name: (entry as FileEntry).name,
        path: (entry as FileEntry).path,
        size: (entry as FileEntry).size,
      }))
    : [];

  const nested = await Promise.all(
    normalizedEntries
      .filter((entry) => entry.isDir)
      .map((entry) => collectTree(entry.path, rpc)),
  );

  return [...normalizedEntries, ...nested.flat()];
}

function pathSeparator(path: string): string {
  return path.includes("\\") ? "\\" : "/";
}

function renamePath(oldPath: string, nextName: string): string {
  const separator = pathSeparator(oldPath);
  const normalized = oldPath.replace(/[\\/]+$/, "");
  const cut = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (cut < 0) return nextName;
  return `${normalized.slice(0, cut + 1)}${nextName}`.replace(/[\\/]/g, separator);
}

function mapWebGitStatus(status: GitStatus | null, rootPath: string): FileTreeGitEntry[] {
  if (!status) return [];
  return status.files.map((file) => {
    const absolutePath = file.path.startsWith(rootPath)
      ? file.path
      : `${rootPath.replace(/[\\/]+$/, "")}${rootPath.includes("\\") ? "\\" : "/"}${file.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/")}`;

    switch (file.status) {
      case "A":
        return { path: absolutePath, status: "added" as const };
      case "D":
        return { path: absolutePath, status: "deleted" as const };
      case "R":
        return { path: absolutePath, status: "renamed" as const };
      case "??":
        return { path: absolutePath, status: "untracked" as const };
      case "M":
      case "C":
      case "U":
      default:
        return { path: absolutePath, status: "modified" as const };
    }
  });
}

function formatSize(size?: number): string | null {
  if (!size || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / (1024 * 102.4)) / 10} MB`;
}

export function FileExplorer({ cwd, onOpenFile }: FileExplorerProps) {
  const rpc = useLinkStore((state) => state.rpc);
  const [rootPath, setRootPath] = useState<string>(cwd ?? "~");
  const [treeEntries, setTreeEntries] = useState<FileTreeEntry[]>([]);
  const [gitEntries, setGitEntries] = useState<FileTreeGitEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [locked, setLocked] = useState(false);

  const loadRoot = useCallback(async (path?: string) => {
    const nextRoot = path ?? rootPath;
    const [entries, gitStatus] = await Promise.all([
      collectTree(nextRoot, rpc),
      rpc("git.status", {}, nextRoot).catch(() => null),
    ]);
    setTreeEntries(entries);
    setGitEntries(mapWebGitStatus((gitStatus as GitStatus | null), nextRoot));
    setRootPath(nextRoot);
  }, [rootPath, rpc]);

  useEffect(() => {
    void loadRoot(cwd ?? "~");
  }, []);

  useEffect(() => {
    if (locked || !cwd) return;
    if (cwd === rootPath) return;
    if (/^[A-Za-z]:\\?$/.test(cwd.trim())) return;
    void loadRoot(cwd);
  }, [cwd, loadRoot, locked, rootPath]);

  const loadFile = useCallback(async (path: string) => {
    if (onOpenFile) {
      onOpenFile(path);
      return;
    }
    const response = await rpc("fs.read", { path }, rootPath);
    setSelectedFile(path);
    setFileContent(typeof response?.content === "string" ? response.content : "");
  }, [rpc, onOpenFile]);

  const saveFile = useCallback(async () => {
    if (!selectedFile) return;
    await rpc("fs.write", { path: selectedFile, content: fileContent }, rootPath);
  }, [fileContent, rpc, selectedFile]);

  const theme = useMemo(() => ({
    type: "dark" as const,
    bg: "hsl(var(--background))",
    fg: "hsl(var(--foreground))",
    colors: {
      "panel.border": "hsl(var(--border))",
      "selection.background": "hsl(var(--primary) / 0.14)",
      "selection.foreground": "hsl(var(--primary))",
      "focus.ring": "hsl(var(--ring))",
      "input.background": "hsl(var(--background))",
      "input.foreground": "hsl(var(--foreground))",
    },
  }), []);

  const gitStatus = useMemo(() => mapGitStatusEntries(rootPath, gitEntries), [gitEntries, rootPath]);
  const sizeByPath = useMemo(() => new Map(treeEntries.map((entry) => [entry.path, formatSize(entry.size)])), [treeEntries]);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <WorkspaceFileTree
          createFileName="new-file.txt"
          gitStatus={gitStatus}
          isLocked={locked}
          onCreateFile={(path) => rpc("fs.create", { path, isDir: false }, rootPath)}
          onCreateFolder={(path) => rpc("fs.create", { path, isDir: true }, rootPath)}
          onDelete={async (path) => {
            await rpc("fs.delete", { path }, rootPath);
            if (selectedFile === path) {
              setSelectedFile(null);
              setFileContent("");
            }
          }}
          onMove={async (moves) => {
            for (const move of moves) {
              await rpc("fs.rename", { oldPath: move.from, newPath: move.to }, rootPath);
            }
          }}
          onOpenFile={loadFile}
          onRefresh={() => loadRoot()}
          onRename={(oldPath, newPath) => rpc("fs.rename", { oldPath, newPath }, rootPath)}
          onToggleLocked={() => setLocked((value) => !value)}
          renderRowDecoration={({ item }) => {
            const absolutePath = `${rootPath.replace(/[\\/]+$/, "")}${rootPath.includes("\\") ? "\\" : "/"}${item.path.replace(/\//g, rootPath.includes("\\") ? "\\" : "/")}`;
            const size = sizeByPath.get(absolutePath);
            return size ? { text: size, title: `Size: ${size}` } : null;
          }}
          rootPath={rootPath}
          theme={theme}
          treeEntries={treeEntries}
        />
      </div>

      <div className="border-t border-border p-3 shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-foreground">
            {selectedFile ? selectedFile.split(/[\\/]/).pop() : "Preview"}
          </span>
          <button
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-primary disabled:opacity-40"
            disabled={!selectedFile}
            onClick={() => void saveFile()}
            type="button"
          >
            Save
          </button>
        </div>
        <textarea
          className="h-40 w-full resize-none rounded border border-border bg-transparent p-2 text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-60"
          disabled={!selectedFile}
          onChange={(event) => setFileContent(event.target.value)}
          placeholder={selectedFile ? "Edit file..." : "Select a file to preview"}
          value={fileContent}
        />
      </div>
    </div>
  );
}
