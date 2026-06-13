import { preparePresortedFileTreeInput, type FileTreePreparedInput, type GitStatusEntry, type GitStatus } from "@pierre/trees";

export interface FileTreeEntry {
  isDir: boolean;
  name: string;
  path: string;
  size?: number;
}

export interface PreparedTreeData {
  absoluteByRelative: Map<string, FileTreeEntry>;
  preparedInput: FileTreePreparedInput;
  relativePaths: string[];
}

export interface FileTreeGitEntry {
  path: string;
  status: GitStatus;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

function compareTreePaths(left: string, right: string): number {
  const leftParts = left.split("/");
  const rightParts = right.split("/");
  const length = Math.min(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const partComparison = leftParts[index].localeCompare(rightParts[index], undefined, { sensitivity: "base" });
    if (partComparison !== 0) return partComparison;
  }

  return leftParts.length - rightParts.length;
}

export function toRelativeTreePath(rootPath: string, absolutePath: string): string {
  const normalizedRoot = normalizePath(rootPath);
  const normalizedAbsolute = normalizePath(absolutePath);
  if (normalizedAbsolute === normalizedRoot) return "";
  const prefix = `${normalizedRoot}/`;
  return normalizedAbsolute.startsWith(prefix) ? normalizedAbsolute.slice(prefix.length) : normalizedAbsolute;
}

export function joinAbsolutePath(parentPath: string, childName: string): string {
  const separator = parentPath.includes("\\") ? "\\" : "/";
  return `${parentPath.replace(/[\\/]+$/, "")}${separator}${childName}`;
}

export function renameAbsolutePath(currentPath: string, nextName: string): string {
  const normalized = currentPath.replace(/[\\/]+$/, "");
  const cut = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (cut < 0) return nextName;
  return `${normalized.slice(0, cut + 1)}${nextName}`;
}

export function isAncestorPath(ancestorPath: string, candidatePath: string): boolean {
  const normalizedAncestor = normalizePath(ancestorPath);
  const normalizedCandidate = normalizePath(candidatePath);
  if (normalizedAncestor === normalizedCandidate) return true;
  return normalizedCandidate.startsWith(`${normalizedAncestor}/`);
}

export function mapGitStatusEntries(rootPath: string, entries: readonly FileTreeGitEntry[]): GitStatusEntry[] {
  return entries
    .map((entry) => ({
      path: toRelativeTreePath(rootPath, entry.path),
      status: entry.status,
    }))
    .filter((entry) => entry.path.length > 0);
}

export function buildPreparedTreeData(rootPath: string, entries: readonly FileTreeEntry[]): PreparedTreeData {
  const absoluteByRelative = new Map<string, FileTreeEntry>();
  const relativePaths: string[] = [];

  for (const entry of entries) {
    const relativePath = toRelativeTreePath(rootPath, entry.path);
    if (!relativePath) continue;
    if (absoluteByRelative.has(relativePath)) continue;
    absoluteByRelative.set(relativePath, entry);
    relativePaths.push(relativePath);
  }

  relativePaths.sort(compareTreePaths);

  return {
    absoluteByRelative,
    preparedInput: preparePresortedFileTreeInput(relativePaths),
    relativePaths,
  };
}
