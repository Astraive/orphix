import { create } from "zustand";
import { invoke } from "@/lib/electron-ipc";
import { CHANNELS } from "../../../../shared/channels";
import type { FileEntry } from "../../../../shared/types";

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  mtime: number;
  children?: FileNode[]; // undefined = not loaded, [] = empty dir
}

interface FileStore {
  rootPath: string;
  tree: FileNode[];
  expanded: Record<string, boolean>;
  selected: string | null;
  renaming: string | null;
  clipboard: { path: string; action: "copy" | "cut" } | null;

  setRootPath: (path: string) => Promise<void>;
  loadChildren: (dirPath: string, children: FileNode[]) => void;
  toggleExpand: (path: string) => void;
  select: (path: string | null) => void;
  setRenaming: (path: string | null) => void;
  renameNode: (oldPath: string, newPath: string) => Promise<void>;
  createFile: (parentDir: string) => Promise<void>;
  createFolder: (parentDir: string) => Promise<void>;
  deleteNode: (path: string) => Promise<void>;
  copyNode: (path: string) => void;
  cutNode: (path: string) => void;
  pasteNode: (destDir: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function updateChildren(tree: FileNode[], dirPath: string, children: FileNode[]): FileNode[] {
  return tree.map((n) => {
    if (n.path === dirPath) return { ...n, children };
    if (n.children) return { ...n, children: updateChildren(n.children, dirPath, children) };
    return n;
  });
}

function findNode(tree: FileNode[], path: string): FileNode | undefined {
  for (const n of tree) {
    if (n.path === path) return n;
    if (n.children) {
      const found = findNode(n.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

export const useFileStore = create<FileStore>()((set, get) => ({
  rootPath: "",
  tree: [],
  expanded: {},
  selected: null,
  renaming: null,
  clipboard: null,

  setRootPath: async (path: string) => {
    set({ rootPath: path, tree: [], expanded: {} });
    try {
      const entries = await invoke<FileEntry[]>(CHANNELS.FILE_LIST, { path });
      const nodes: FileNode[] = entries.map((e) => ({
        name: e.name, path: e.path, isDir: e.isDir, size: e.size, mtime: e.mtime,
      }));
      set({ tree: nodes });
    } catch (err) {
      console.error("Failed to load root:", err);
    }
  },

  loadChildren: (dirPath: string, children: FileNode[]) => {
    set((s) => ({ tree: updateChildren(s.tree, dirPath, children) }));
  },

  toggleExpand: (path: string) => {
    const s = get();
    const isExpanded = !!s.expanded[path];
    const nextExpanded = { ...s.expanded };

    if (isExpanded) {
      delete nextExpanded[path];
      set({ expanded: nextExpanded });
    } else {
      nextExpanded[path] = true;
      set({ expanded: nextExpanded });

      const node = findNode(s.tree, path);
      if (node && node.isDir && node.children === undefined) {
        invoke<FileEntry[]>(CHANNELS.FILE_LIST, { path }).then((entries) => {
          const childNodes: FileNode[] = entries.map((e) => ({
            name: e.name, path: e.path, isDir: e.isDir, size: e.size, mtime: e.mtime,
          }));
          set((prev) => ({ tree: updateChildren(prev.tree, path, childNodes) }));
        }).catch(console.error);
      }
    }
  },

  select: (path) => set({ selected: path }),
  setRenaming: (path) => set({ renaming: path }),

  renameNode: async (oldPath: string, newPath: string) => {
    try {
      await invoke(CHANNELS.FILE_RENAME, { oldPath, newPath });
      set({ renaming: null });
      await get().refresh();
    } catch (err) {
      console.error("Rename failed:", err);
    }
  },

  createFile: async (parentDir: string) => {
    try {
      const path = parentDir + "/untitled";
      await invoke(CHANNELS.FILE_CREATE, { path, isDir: false });
      const entries = await invoke<FileEntry[]>(CHANNELS.FILE_LIST, { path: parentDir });
      const nodes: FileNode[] = entries.map((e) => ({
        name: e.name, path: e.path, isDir: e.isDir, size: e.size, mtime: e.mtime,
      }));
      set((s) => ({
        expanded: { ...s.expanded, [parentDir]: true },
        tree: updateChildren(s.tree, parentDir, nodes),
        renaming: path, selected: path,
      }));
    } catch (err) {
      console.error("Create file failed:", err);
    }
  },

  createFolder: async (parentDir: string) => {
    try {
      const path = parentDir + "/new-folder";
      await invoke(CHANNELS.FILE_CREATE, { path, isDir: true });
      const entries = await invoke<FileEntry[]>(CHANNELS.FILE_LIST, { path: parentDir });
      const nodes: FileNode[] = entries.map((e) => ({
        name: e.name, path: e.path, isDir: e.isDir, size: e.size, mtime: e.mtime,
      }));
      set((s) => ({
        expanded: { ...s.expanded, [parentDir]: true },
        tree: updateChildren(s.tree, parentDir, nodes),
        renaming: path, selected: path,
      }));
    } catch (err) {
      console.error("Create folder failed:", err);
    }
  },

  deleteNode: async (path: string) => {
    try {
      await invoke(CHANNELS.FILE_DELETE, { path });
      await get().refresh();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  },

  copyNode: (path) => set({ clipboard: { path, action: "copy" } }),
  cutNode: (path) => set({ clipboard: { path, action: "cut" } }),

  pasteNode: async (destDir: string) => {
    const { clipboard } = get();
    if (!clipboard) return;
    const name = clipboard.path.split(/[/\\]/).pop() || "file";
    const destPath = destDir + "/" + name;
    try {
      if (clipboard.action === "copy") {
        await invoke(CHANNELS.FILE_COPY, { srcPath: clipboard.path, destPath });
      } else {
        await invoke(CHANNELS.FILE_MOVE, { srcPath: clipboard.path, destPath });
      }
      set({ clipboard: null });
      const entries = await invoke<FileEntry[]>(CHANNELS.FILE_LIST, { path: destDir });
      const nodes: FileNode[] = entries.map((e) => ({
        name: e.name, path: e.path, isDir: e.isDir, size: e.size, mtime: e.mtime,
      }));
      set((s) => ({ tree: updateChildren(s.tree, destDir, nodes) }));
    } catch (err) {
      console.error("Paste failed:", err);
    }
  },

  refresh: async () => {
    const { rootPath, expanded } = get();
    if (!rootPath) return;
    try {
      const rootEntries = await invoke<FileEntry[]>(CHANNELS.FILE_LIST, { path: rootPath });
      let tree: FileNode[] = rootEntries.map((e) => ({
        name: e.name, path: e.path, isDir: e.isDir, size: e.size, mtime: e.mtime,
      }));
      for (const dirPath of Object.keys(expanded)) {
        try {
          const dirEntries = await invoke<FileEntry[]>(CHANNELS.FILE_LIST, { path: dirPath });
          const childNodes: FileNode[] = dirEntries.map((e) => ({
            name: e.name, path: e.path, isDir: e.isDir, size: e.size, mtime: e.mtime,
          }));
          tree = updateChildren(tree, dirPath, childNodes);
        } catch { /* skip */ }
      }
      set({ tree });
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  },
}));
