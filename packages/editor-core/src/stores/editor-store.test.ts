import { describe, it, expect, vi, beforeEach } from "vitest";
import { extToLanguage, isMarkdownFile, createEditorStore } from "./editor-store";

vi.mock("../lib/tokenizer", () => ({
  detectLanguage: (filePath: string) => {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      ts: "typescript", tsx: "typescript", mts: "typescript",
      js: "javascript", jsx: "javascript", mjs: "javascript",
      py: "python", pyi: "python",
      rs: "rust", go: "go",
      html: "html", htm: "html",
      css: "css", scss: "css", less: "css",
      json: "json", jsonc: "json",
      md: "markdown", mdx: "markdown",
      sh: "shell", bash: "shell", zsh: "shell",
      yaml: "yaml", yml: "yaml",
      toml: "toml",
      c: "c", h: "c",
      cpp: "cpp", cxx: "cpp", cc: "cpp", hpp: "cpp",
      cs: "csharp", java: "java",
      kt: "kotlin", kts: "kotlin",
      swift: "swift", zig: "zig",
      sql: "sql", xml: "xml",
      graphql: "graphql", gql: "graphql",
      ini: "ini", lua: "lua", rb: "ruby", php: "php",
    };
    return map[ext] ?? "text";
  },
}));

function createMockProvider() {
  return {
    readFile: vi.fn(async (_path: string) => "file content"),
    writeFile: vi.fn(async (_path: string, _content: string) => {}),
  };
}

describe("editor-store", () => {
  describe("extToLanguage", () => {
    it("maps .ts to typescript", () => {
      expect(extToLanguage(".ts")).toBe("typescript");
    });

    it("maps .tsx to typescript", () => {
      expect(extToLanguage(".tsx")).toBe("typescript");
    });

    it("maps .js to javascript", () => {
      expect(extToLanguage(".js")).toBe("javascript");
    });

    it("maps .jsx to javascript", () => {
      expect(extToLanguage(".jsx")).toBe("javascript");
    });

    it("maps .py to python", () => {
      expect(extToLanguage(".py")).toBe("python");
    });

    it("maps .rs to rust", () => {
      expect(extToLanguage(".rs")).toBe("rust");
    });

    it("maps .go to go", () => {
      expect(extToLanguage(".go")).toBe("go");
    });

    it("maps .md to markdown", () => {
      expect(extToLanguage(".md")).toBe("markdown");
    });

    it("maps .json to json", () => {
      expect(extToLanguage(".json")).toBe("json");
    });

    it("maps unknown extension to text", () => {
      expect(extToLanguage(".xyz")).toBe("text");
    });

    it("is case-insensitive", () => {
      expect(extToLanguage(".TS")).toBe("typescript");
      expect(extToLanguage(".Py")).toBe("python");
    });
  });

  describe("isMarkdownFile", () => {
    it("identifies .md files", () => {
      expect(isMarkdownFile("readme.md")).toBe(true);
      expect(isMarkdownFile("/path/to/file.md")).toBe(true);
    });

    it("identifies .mdx files", () => {
      expect(isMarkdownFile("page.mdx")).toBe(true);
      expect(isMarkdownFile("/path/to/page.mdx")).toBe(true);
    });

    it("rejects non-markdown files", () => {
      expect(isMarkdownFile("file.ts")).toBe(false);
      expect(isMarkdownFile("file.html")).toBe(false);
      expect(isMarkdownFile("file.txt")).toBe(false);
    });

    it("handles Windows paths", () => {
      expect(isMarkdownFile("C:\\docs\\readme.md")).toBe(true);
    });

    it("is case-insensitive on extension", () => {
      expect(isMarkdownFile("file.MD")).toBe(true);
      expect(isMarkdownFile("file.MDX")).toBe(true);
    });
  });

  describe("createEditorStore", () => {
    it("creates a store with empty instances", () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);
      expect(useStore.getState().instances).toEqual({});
    });

    it("openFile loads file content via provider", async () => {
      const provider = createMockProvider();
      provider.readFile.mockResolvedValue("const x = 1;");
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/src/main.ts");

      expect(provider.readFile).toHaveBeenCalledWith("/src/main.ts");
      const instance = useStore.getState().instances["editor-1"];
      expect(instance).toBeDefined();
      expect(instance!.content).toBe("const x = 1;");
      expect(instance!.originalContent).toBe("const x = 1;");
      expect(instance!.filePath).toBe("/src/main.ts");
      expect(instance!.fileName).toBe("main.ts");
      expect(instance!.dirty).toBe(false);
    });

    it("openFile does not re-open an existing instance", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/src/a.ts");
      const callCount = provider.readFile.mock.calls.length;

      await useStore.getState().openFile("editor-1", "/src/a.ts");
      expect(provider.readFile).toHaveBeenCalledTimes(callCount);
    });

    it("closeFile removes the instance", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/src/a.ts");
      expect(useStore.getState().instances["editor-1"]).toBeDefined();

      useStore.getState().closeFile("editor-1");
      expect(useStore.getState().instances["editor-1"]).toBeUndefined();
    });

    it("updateContent updates content and marks dirty", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/src/a.ts");
      useStore.getState().updateContent("editor-1", "const y = 2;");

      const instance = useStore.getState().instances["editor-1"];
      expect(instance!.content).toBe("const y = 2;");
      expect(instance!.dirty).toBe(true);
    });

    it("updateContent to original content clears dirty", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/src/a.ts");
      useStore.getState().updateContent("editor-1", "changed");
      expect(useStore.getState().instances["editor-1"]!.dirty).toBe(true);

      useStore.getState().updateContent("editor-1", "file content");
      expect(useStore.getState().instances["editor-1"]!.dirty).toBe(false);
    });

    it("saveFile calls provider.writeFile and clears dirty", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/src/a.ts");
      useStore.getState().updateContent("editor-1", "new content");

      await useStore.getState().saveFile("editor-1");

      expect(provider.writeFile).toHaveBeenCalledWith(
        "/src/a.ts",
        "new content",
      );
      const instance = useStore.getState().instances["editor-1"];
      expect(instance!.dirty).toBe(false);
      expect(instance!.originalContent).toBe("new content");
    });

    it("saveFile does nothing when not dirty", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/src/a.ts");
      await useStore.getState().saveFile("editor-1");

      expect(provider.writeFile).not.toHaveBeenCalled();
    });

    it("detectLanguage maps .ts to typescript", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/src/index.ts");
      expect(useStore.getState().instances["editor-1"]!.language).toBe(
        "typescript",
      );
    });

    it("detectLanguage maps .py to python", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/src/main.py");
      expect(useStore.getState().instances["editor-1"]!.language).toBe(
        "python",
      );
    });

    it("detectLanguage maps .md to markdown", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/docs/readme.md");
      expect(useStore.getState().instances["editor-1"]!.language).toBe(
        "markdown",
      );
    });

    it("detectLanguage maps unknown extension to text", async () => {
      const provider = createMockProvider();
      const useStore = createEditorStore(provider);

      await useStore.getState().openFile("editor-1", "/data/file.xyz");
      expect(useStore.getState().instances["editor-1"]!.language).toBe("text");
    });
  });
});
