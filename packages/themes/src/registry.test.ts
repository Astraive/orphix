import { describe, expect, it, beforeEach } from "vitest";
import type { OrphixThemeFamily, OrphixThemeVariant } from "./types";
import {
  listThemeFamilies,
  listThemeVariants,
  getThemeVariant,
  getThemeById,
  composeTheme,
  registerThemeFamily,
  unregisterThemeFamily,
} from "./registry";

const mockColors = {
  id: "test-colors",
  name: "Test Colors",
  background: "#000",
  foreground: "#fff",
  accent: "#0af",
  border: "#333",
  surface: "#111",
  muted: "#888",
  success: "#0f0",
  warning: "#ff0",
  error: "#f00",
  info: "#00f",
  selection: "#222",
  comment: "#666",
  keyword: "#c0f",
  string: "#0f0",
  function: "#0af",
  variable: "#fff",
  type: "#ff0",
  number: "#f90",
  operator: "#ccc",
  punctuation: "#999",
  tag: "#f0f",
  attribute: "#0af",
  constant: "#f90",
  builtIn: "#0f0",
  className: "#ff0",
  parameter: "#fff",
  property: "#0af",
  enum: "#ff0",
  interface: "#0af",
  decorator: "#f0f",
  regex: "#0f0",
  escape: "#f90",
  link: "#0af",
  heading: "#fff",
  bold: "#fff",
  italic: "#fff",
  code: "#fff",
  diff: { added: "#0f0", removed: "#f00", modified: "#ff0" },
} as any;

const mockFonts = {
  id: "test-fonts",
  name: "Test Fonts",
  family: "monospace",
  size: 14,
  lineHeight: 1.5,
  weight: { normal: 400, bold: 700 },
} as any;

const mockIcons = {
  id: "test-icons",
  name: "Test Icons",
  style: "default",
} as any;

const mockTerminal = {
  id: "test-terminal",
  name: "Test Terminal",
  cursor: { style: "block", color: "#fff" },
  scrollbar: { thumb: "#333", track: "#111" },
} as any;

function makeVariant(id: string, themeId: string, variantId: string): OrphixThemeVariant {
  return {
    id,
    themeId,
    variantId,
    name: `Variant ${variantId}`,
    colors: mockColors,
    fonts: mockFonts,
    icons: mockIcons,
    terminal: mockTerminal,
  };
}

function makeFamily(id: string, variants: Record<string, OrphixThemeVariant>): OrphixThemeFamily {
  const keys = Object.keys(variants);
  return {
    id,
    name: `Family ${id}`,
    author: "test",
    version: "1.0.0",
    defaultVariant: keys[0] ?? "default",
    variants,
  };
}

describe("theme registry", () => {
  describe("listThemeFamilies", () => {
    it("returns registered families including builtin orphix", () => {
      const families = listThemeFamilies();
      expect(families.length).toBeGreaterThanOrEqual(1);
      expect(families.some((f) => f.id === "orphix")).toBe(true);
    });
  });

  describe("listThemeVariants", () => {
    it("returns all variants across all families", () => {
      const variants = listThemeVariants();
      expect(variants.length).toBeGreaterThanOrEqual(1);
      expect(variants.some((v) => v.id === "orphix.dark")).toBe(true);
    });
  });

  describe("getThemeVariant", () => {
    it("returns the requested variant from a family", () => {
      const variant = getThemeVariant("orphix", "light");
      expect(variant.id).toBe("orphix.light");
    });

    it("returns default variant when variantId is omitted", () => {
      const variant = getThemeVariant("orphix");
      expect(variant.variantId).toBe("orphix".includes("dark") ? "dark" : "dark");
      expect(variant.id).toBe("orphix.dark");
    });

    it("falls back to default when variant not found", () => {
      const variant = getThemeVariant("orphix", "nonexistent");
      expect(variant.id).toBe("orphix.dark");
    });

    it("falls back to orphix theme for unknown family", () => {
      const variant = getThemeVariant("unknown-family", "dark");
      expect(variant.id).toBe("orphix.dark");
    });
  });

  describe("getThemeById", () => {
    it("parses 'family.variant' format correctly", () => {
      const variant = getThemeById("orphix.dark");
      expect(variant.id).toBe("orphix.dark");
      expect(variant.themeId).toBe("orphix");
      expect(variant.variantId).toBe("dark");
    });

    it("handles dots in variant IDs using lastIndexOf", () => {
      // Register a family with a variant that contains a dot
      const family = makeFamily("test-dot", {
        "dot.variant": makeVariant("test-dot.dot.variant", "test-dot", "dot.variant"),
      });
      registerThemeFamily(family);

      const variant = getThemeById("test-dot.dot.variant");
      expect(variant.id).toBe("test-dot.dot.variant");
      expect(variant.themeId).toBe("test-dot");
      expect(variant.variantId).toBe("dot.variant");

      unregisterThemeFamily("test-dot");
    });

    it("finds variant by direct match first", () => {
      const variant = getThemeById("orphix.light");
      expect(variant.id).toBe("orphix.light");
    });
  });

  describe("composeTheme", () => {
    it("creates custom theme from components", () => {
      const custom = composeTheme(
        "orphix",
        "orphix",
        "orphix",
      );

      expect(custom.id).toBe("custom.orphix.orphix.orphix");
      expect(custom.themeId).toBe("custom");
      expect(custom.name).toBe("Custom Theme");
      expect(custom.colors).toBeDefined();
      expect(custom.fonts).toBeDefined();
      expect(custom.icons).toBeDefined();
      expect(custom.terminal).toBeDefined();
    });

    it("uses first available variant as fallback for unknown IDs", () => {
      const custom = composeTheme(
        "nonexistent-colors",
        "nonexistent-fonts",
        "nonexistent-icons",
      );

      expect(custom.id).toBe("custom.nonexistent-colors.nonexistent-fonts.nonexistent-icons");
      expect(custom.colors).toBeDefined();
      expect(custom.fonts).toBeDefined();
      expect(custom.icons).toBeDefined();
    });
  });

  describe("registerThemeFamily / unregisterThemeFamily", () => {
    const familyId = "test-custom-family";

    it("registerThemeFamily adds a new family", () => {
      const family = makeFamily(familyId, {
        light: makeVariant(`${familyId}.light`, familyId, "light"),
      });
      registerThemeFamily(family);

      const families = listThemeFamilies();
      expect(families.some((f) => f.id === familyId)).toBe(true);

      unregisterThemeFamily(familyId);
    });

    it("unregisterThemeFamily removes a family", () => {
      const family = makeFamily(familyId, {
        dark: makeVariant(`${familyId}.dark`, familyId, "dark"),
      });
      registerThemeFamily(family);

      unregisterThemeFamily(familyId);

      const families = listThemeFamilies();
      expect(families.some((f) => f.id === familyId)).toBe(false);
    });

    it("registered family appears in theme variants", () => {
      const family = makeFamily(familyId, {
        alpha: makeVariant(`${familyId}.alpha`, familyId, "alpha"),
      });
      registerThemeFamily(family);

      const variants = listThemeVariants();
      expect(variants.some((v) => v.id === `${familyId}.alpha`)).toBe(true);

      unregisterThemeFamily(familyId);
    });
  });
});
