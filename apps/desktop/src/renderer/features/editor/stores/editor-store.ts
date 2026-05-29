import { create } from "zustand";
import { invoke } from "@/lib/ipc-client";
import { CHANNELS } from "@shared/ipc/channels";

export interface EditorInstance {
  filePath: string;
  fileName: string;
  language: string;
  content: string;
  originalContent: string;
  dirty: boolean;
  previewMode: "code" | "preview";
}

interface EditorStore {
  instances: Record<string, EditorInstance>;
  openFile: (editorId: string, filePath: string) => Promise<void>;
  closeFile: (editorId: string) => void;
  updateContent: (editorId: string, content: string) => void;
  saveFile: (editorId: string) => Promise<void>;
  togglePreview: (editorId: string) => void;
}

function extToLanguage(ext: string): string {
  const map: Record<string, string> = {
    ".ts": "typescript", ".tsx": "typescript", ".mts": "typescript",
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript",
    ".py": "python", ".pyi": "python",
    ".rs": "rust",
    ".go": "go",
    ".html": "html", ".htm": "html",
    ".css": "css", ".scss": "css", ".less": "css",
    ".json": "json", ".jsonc": "json",
    ".md": "markdown", ".mdx": "markdown",
    ".sh": "shell", ".bash": "shell", ".zsh": "shell",
    ".yaml": "yaml", ".yml": "yaml",
    ".toml": "toml",
    ".c": "c", ".h": "c",
    ".cpp": "cpp", ".cxx": "cpp", ".cc": "cpp", ".hpp": "cpp",
    ".java": "java",
    ".rb": "ruby",
    ".php": "php",
    ".sql": "sql",
    ".xml": "xml", ".svg": "xml",
    ".graphql": "graphql", ".gql": "graphql",
    ".dockerfile": "dockerfile",
    ".makefile": "makefile",
    ".env": "dotenv", ".env.local": "dotenv",
    ".ini": "ini",
    ".lua": "lua",
    ".zig": "zig",
  };
  return map[ext.toLowerCase()] ?? "plaintext";
}

function detectLanguage(filePath: string): string {
  const name = filePath.split(/[/\\]/).pop() ?? "";
  if (name === "Dockerfile") return "dockerfile";
  if (name === "Makefile" || name === "makefile") return "makefile";
  if (name === ".env" || name.startsWith(".env.")) return "dotenv";
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "plaintext";
  return extToLanguage(name.slice(dot));
}

export function isMarkdownFile(filePath: string): boolean {
  const name = filePath.split(/[/\\]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  return ext === ".md" || ext === ".mdx";
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  instances: {},

  openFile: async (editorId: string, filePath: string) => {
    const existing = get().instances[editorId];
    if (existing) return;

    const { content } = await invoke<{ content: string }>(CHANNELS.FILE_READ, { path: filePath });
    const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
    const language = detectLanguage(filePath);
    const isMd = isMarkdownFile(filePath);

    set((s) => ({
      instances: {
        ...s.instances,
        [editorId]: {
          filePath,
          fileName,
          language,
          content,
          originalContent: content,
          dirty: false,
          previewMode: isMd ? "preview" : "code",
        },
      },
    }));
  },

  closeFile: (editorId: string) => {
    set((s) => {
      const next = { ...s.instances };
      delete next[editorId];
      return { instances: next };
    });
  },

  updateContent: (editorId: string, content: string) => {
    set((s) => {
      const inst = s.instances[editorId];
      if (!inst) return s;
      return {
        instances: {
          ...s.instances,
          [editorId]: {
            ...inst,
            content,
            dirty: content !== inst.originalContent,
          },
        },
      };
    });
  },

  saveFile: async (editorId: string) => {
    const inst = get().instances[editorId];
    if (!inst) return;
    await invoke(CHANNELS.FILE_WRITE, { path: inst.filePath, content: inst.content });
    set((s) => ({
      instances: {
        ...s.instances,
        [editorId]: { ...inst, originalContent: inst.content, dirty: false },
      },
    }));
  },

  togglePreview: (editorId: string) => {
    set((s) => {
      const inst = s.instances[editorId];
      if (!inst) return s;
      return {
        instances: {
          ...s.instances,
          [editorId]: {
            ...inst,
            previewMode: inst.previewMode === "code" ? "preview" : "code",
          },
        },
      };
    });
  },
}));
