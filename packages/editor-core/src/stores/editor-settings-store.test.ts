import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    get length() {
      return store.size;
    },
    key: vi.fn((i: number) => [...store.keys()][i] ?? null),
    _store: store,
  };
}

let mockStorage: ReturnType<typeof createMockLocalStorage>;

beforeEach(() => {
  mockStorage = createMockLocalStorage();
  vi.stubGlobal("localStorage", mockStorage);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("editor-settings-store", () => {
  describe("defaults", () => {
    it("has correct default values", async () => {
      const { useEditorSettingsStore } = await import(
        "./editor-settings-store"
      );
      const s = useEditorSettingsStore.getState();
      expect(s.fontSize).toBe(14);
      expect(s.tabSize).toBe(2);
      expect(s.wordWrap).toBe(false);
      expect(s.openMode).toBe("split");
      expect(s.lineHeight).toBe(1.6);
      expect(s.showMinimap).toBe(true);
      expect(s.showLineNumbers).toBe(true);
      expect(s.cursorStyle).toBe("block");
      expect(s.cursorBlink).toBe(true);
      expect(s.cursorWidth).toBe(2);
      expect(s.renderWhitespace).toBe(false);
      expect(s.bracketPairColorization).toBe(true);
    });
  });

  describe("setters", () => {
    it("setFontSize updates the value", async () => {
      const { useEditorSettingsStore } = await import(
        "./editor-settings-store"
      );
      useEditorSettingsStore.getState().setFontSize(18);
      expect(useEditorSettingsStore.getState().fontSize).toBe(18);
    });

    it("setFontFamily updates the value", async () => {
      const { useEditorSettingsStore } = await import(
        "./editor-settings-store"
      );
      useEditorSettingsStore.getState().setFontFamily("Fira Code");
      expect(useEditorSettingsStore.getState().fontFamily).toBe("Fira Code");
    });

    it("setTabSize updates the value", async () => {
      const { useEditorSettingsStore } = await import(
        "./editor-settings-store"
      );
      useEditorSettingsStore.getState().setTabSize(4);
      expect(useEditorSettingsStore.getState().tabSize).toBe(4);
    });

    it("setWordWrap toggles the value", async () => {
      const { useEditorSettingsStore } = await import(
        "./editor-settings-store"
      );
      expect(useEditorSettingsStore.getState().wordWrap).toBe(false);
      useEditorSettingsStore.getState().setWordWrap(true);
      expect(useEditorSettingsStore.getState().wordWrap).toBe(true);
      useEditorSettingsStore.getState().setWordWrap(false);
      expect(useEditorSettingsStore.getState().wordWrap).toBe(false);
    });
  });

  describe("localStorage persistence", () => {
    it("settings persist to localStorage on set", async () => {
      const { useEditorSettingsStore } = await import(
        "./editor-settings-store"
      );
      mockStorage.setItem.mockClear();

      useEditorSettingsStore.getState().setFontSize(20);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "orphix-editor-fontSize",
        "20",
      );

      useEditorSettingsStore.getState().setFontFamily("JetBrains Mono");
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "orphix-editor-fontFamily",
        JSON.stringify("JetBrains Mono"),
      );

      useEditorSettingsStore.getState().setTabSize(8);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "orphix-editor-tabSize",
        "8",
      );

      useEditorSettingsStore.getState().setWordWrap(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "orphix-editor-wordWrap",
        "true",
      );
    });

    it("settings load from localStorage on init", async () => {
      vi.resetModules();
      mockStorage._store.set("orphix-editor-fontSize", "22");
      mockStorage._store.set("orphix-editor-tabSize", "4");
      mockStorage._store.set("orphix-editor-wordWrap", "true");

      const { useEditorSettingsStore } = await import(
        "./editor-settings-store"
      );
      const s = useEditorSettingsStore.getState();
      expect(s.fontSize).toBe(22);
      expect(s.tabSize).toBe(4);
      expect(s.wordWrap).toBe(true);
    });

    it("falls back to defaults when localStorage key is absent", async () => {
      vi.resetModules();
      const { useEditorSettingsStore } = await import(
        "./editor-settings-store"
      );
      const s = useEditorSettingsStore.getState();
      expect(s.fontSize).toBe(14);
      expect(s.tabSize).toBe(2);
      expect(s.wordWrap).toBe(false);
    });
  });
});
