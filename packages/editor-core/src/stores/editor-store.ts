import { create } from "zustand";
import { detectLanguage } from "../lib/tokenizer";

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

export function extToLanguage(ext: string): string {
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
    ".cs": "csharp",
    ".java": "java",
    ".kt": "kotlin", ".kts": "kotlin",
    ".swift": "swift",
    ".tf": "terraform", ".hcl": "terraform",
    ".zig": "zig",
    ".sql": "sql",
    ".xml": "xml", ".svg": "xml",
    ".graphql": "graphql", ".gql": "graphql",
    ".ini": "ini",
    ".lua": "lua",
    ".rb": "ruby",
    ".php": "php",
  };
  return map[ext.toLowerCase()] ?? "text";
}

export function isMarkdownFile(filePath: string): boolean {
  const name = filePath.split(/[/\\]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  return ext === ".md" || ext === ".mdx";
}

// File provider interface - abstracts IPC (desktop) vs RPC (web)
export interface FileProvider {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
}

// Create store with injected file provider
export function createEditorStore(provider: FileProvider) {
  return create<EditorStore>()((set, get) => ({
    instances: {},

    openFile: async (editorId: string, filePath: string) => {
      const existing = get().instances[editorId];
      if (existing) return;

      try {
        const content = await provider.readFile(filePath);
        const name = filePath.split(/[/\\]/).pop() ?? filePath;
        const language = detectLanguage(filePath);

        set((state) => ({
          instances: {
            ...state.instances,
            [editorId]: {
              filePath,
              fileName: name,
              language,
              content,
              originalContent: content,
              dirty: false,
              previewMode: "code",
            },
          },
        }));
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    },

    closeFile: (editorId: string) => {
      set((state) => {
        const { [editorId]: _, ...rest } = state.instances;
        return { instances: rest };
      });
    },

    updateContent: (editorId: string, content: string) => {
      set((state) => {
        const instance = state.instances[editorId];
        if (!instance) return state;
        return {
          instances: {
            ...state.instances,
            [editorId]: {
              ...instance,
              content,
              dirty: content !== instance.originalContent,
            },
          },
        };
      });
    },

    saveFile: async (editorId: string) => {
      const instance = get().instances[editorId];
      if (!instance || !instance.dirty) return;

      try {
        await provider.writeFile(instance.filePath, instance.content);
        set((state) => ({
          instances: {
            ...state.instances,
            [editorId]: {
              ...instance,
              originalContent: instance.content,
              dirty: false,
            },
          },
        }));
      } catch (err) {
        console.error("Failed to save file:", err);
      }
    },

    togglePreview: (editorId: string) => {
      set((state) => {
        const instance = state.instances[editorId];
        if (!instance) return state;
        return {
          instances: {
            ...state.instances,
            [editorId]: {
              ...instance,
              previewMode: instance.previewMode === "code" ? "preview" : "code",
            },
          },
        };
      });
    },
  }));
}
