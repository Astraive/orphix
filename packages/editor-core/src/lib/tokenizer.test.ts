import { describe, it, expect } from "vitest";
import {
  tokenizeRange,
  getLineCount,
  findMatchingBracket,
  detectLanguage,
} from "./tokenizer";

// ── tokenizeRange ────────────────────────────────────────────────────

describe("tokenizeRange", () => {
  describe("TypeScript", () => {
    it("tokenizes keywords", () => {
      const result = tokenizeRange("const x = 1;", "typescript", 0, 1);
      expect(result).toHaveLength(1);
      const types = result[0].map((t) => t.type);
      expect(types).toContain("keyword");
      const keywords = result[0].filter((t) => t.type === "keyword");
      expect(keywords[0].text).toBe("const");
    });

    it("tokenizes strings", () => {
      const result = tokenizeRange(
        'const msg = "hello world";',
        "typescript",
        0,
        1,
      );
      const strings = result[0].filter((t) => t.type === "string");
      expect(strings.length).toBeGreaterThanOrEqual(1);
      expect(strings.some((t) => t.text === '"hello world"')).toBe(true);
    });

    it("tokenizes comments", () => {
      const result = tokenizeRange(
        '// this is a comment\nconst x = 1;',
        "typescript",
        0,
        2,
      );
      expect(result).toHaveLength(2);
      const comments = result[0].filter((t) => t.type === "comment");
      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe("// this is a comment");
    });

    it("tokenizes functions", () => {
      const result = tokenizeRange(
        'function greet(name) { return name; }',
        "typescript",
        0,
        1,
      );
      const funcs = result[0].filter((t) => t.type === "function");
      expect(funcs.some((t) => t.text === "greet")).toBe(true);
    });
  });

  describe("Python", () => {
    it("tokenizes keywords", () => {
      const result = tokenizeRange("def greet(name):", "python", 0, 1);
      const keywords = result[0].filter((t) => t.type === "keyword");
      expect(keywords.some((t) => t.text === "def")).toBe(true);
    });

    it("tokenizes strings", () => {
      const result = tokenizeRange(
        'msg = "hello world"',
        "python",
        0,
        1,
      );
      const strings = result[0].filter((t) => t.type === "string");
      expect(strings.length).toBeGreaterThanOrEqual(1);
      expect(strings.some((t) => t.text === '"hello world"')).toBe(true);
    });

    it("tokenizes comments", () => {
      const result = tokenizeRange(
        "# comment\ndef foo(): pass",
        "python",
        0,
        2,
      );
      const comments = result[0].filter((t) => t.type === "comment");
      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe("# comment");
    });

    it("tokenizes functions", () => {
      const result = tokenizeRange("print('hi')", "python", 0, 1);
      const funcs = result[0].filter((t) => t.type === "function");
      expect(funcs.some((t) => t.text === "print")).toBe(true);
    });
  });

  describe("JSON", () => {
    it("tokenizes string values", () => {
      const result = tokenizeRange('{"key": "value"}', "json", 0, 1);
      const strings = result[0].filter((t) => t.type === "string");
      expect(strings.some((t) => t.text === '"value"')).toBe(true);
    });

    it("tokenizes attributes (keys)", () => {
      const result = tokenizeRange('{"key": 1}', "json", 0, 1);
      const attrs = result[0].filter((t) => t.type === "attribute");
      expect(attrs.some((t) => t.text.includes("key"))).toBe(true);
    });

    it("tokenizes numbers", () => {
      const result = tokenizeRange("42", "json", 0, 1);
      const numbers = result[0].filter((t) => t.type === "number");
      expect(numbers.length).toBeGreaterThanOrEqual(1);
    });

    it("tokenizes booleans", () => {
      const result = tokenizeRange("true", "json", 0, 1);
      const constants = result[0].filter((t) => t.type === "constant");
      expect(constants.some((t) => t.text === "true")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      const result = tokenizeRange("", "typescript", 0, 1);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(0);
    });

    it("handles single-line input", () => {
      const result = tokenizeRange("let x = 5;", "typescript", 0, 1);
      expect(result).toHaveLength(1);
      expect(result[0].length).toBeGreaterThan(0);
    });

    it("handles multi-line input", () => {
      const text = "const a = 1;\nconst b = 2;\nconst c = 3;";
      const result = tokenizeRange(text, "typescript", 0, 3);
      expect(result).toHaveLength(3);
    });

    it("handles out-of-range start line", () => {
      const result = tokenizeRange("line1\nline2", "typescript", 5, 10);
      expect(result).toHaveLength(0);
    });

    it("handles end line beyond text length", () => {
      const result = tokenizeRange("line1", "typescript", 0, 100);
      expect(result).toHaveLength(1);
    });
  });
});

// ── getLineCount ─────────────────────────────────────────────────────

describe("getLineCount", () => {
  it("counts lines correctly", () => {
    expect(getLineCount("a\nb\nc")).toBe(3);
  });

  it("handles empty string", () => {
    expect(getLineCount("")).toBe(1);
  });

  it("handles trailing newline", () => {
    expect(getLineCount("a\nb\n")).toBe(3);
  });

  it("single line without newline", () => {
    expect(getLineCount("hello")).toBe(1);
  });

  it("only newlines", () => {
    expect(getLineCount("\n\n\n")).toBe(4);
  });
});

// ── findMatchingBracket ──────────────────────────────────────────────

describe("findMatchingBracket", () => {
  it("finds matching parentheses", () => {
    const text = "(hello)";
    const match = findMatchingBracket(text, 0);
    expect(match).not.toBeNull();
    expect(match!.char).toBe(")");
    expect(match!.col).toBe(6);
    expect(match!.line).toBe(0);
  });

  it("finds matching braces", () => {
    const text = "{ key: value }";
    const match = findMatchingBracket(text, 0);
    expect(match).not.toBeNull();
    expect(match!.char).toBe("}");
  });

  it("finds matching brackets", () => {
    const text = "[1, 2, 3]";
    const match = findMatchingBracket(text, 0);
    expect(match).not.toBeNull();
    expect(match!.char).toBe("]");
  });

  it("returns null for non-bracket characters", () => {
    const text = "hello world";
    const match = findMatchingBracket(text, 3);
    expect(match).toBeNull();
  });

  it("handles nested brackets", () => {
    const text = "{ [ ( ) ] }";
    const match = findMatchingBracket(text, 0);
    expect(match).not.toBeNull();
    expect(match!.char).toBe("}");
    expect(match!.col).toBe(10);
  });

  it("finds match for closing bracket", () => {
    const text = "(hello)";
    const match = findMatchingBracket(text, 6);
    expect(match).not.toBeNull();
    expect(match!.char).toBe("(");
    expect(match!.col).toBe(0);
  });

  it("returns null for unmatched bracket", () => {
    const text = "(hello";
    const match = findMatchingBracket(text, 0);
    expect(match).toBeNull();
  });

  it("handles multiline text", () => {
    const text = "function foo() {\n  return (1 + 2);\n}";
    const match = findMatchingBracket(text, 26);
    expect(match).not.toBeNull();
    expect(match!.char).toBe(")");
    expect(match!.line).toBe(1);
  });
});

// ── detectLanguage ───────────────────────────────────────────────────

describe("detectLanguage", () => {
  it("detects TypeScript from .ts extension", () => {
    expect(detectLanguage("app.ts")).toBe("typescript");
  });

  it("detects JavaScript from .js extension", () => {
    expect(detectLanguage("app.js")).toBe("javascript");
  });

  it("detects Python from .py extension", () => {
    expect(detectLanguage("script.py")).toBe("python");
  });

  it("detects Dockerfile from filename", () => {
    expect(detectLanguage("Dockerfile")).toBe("dockerfile");
  });

  it("detects Dockerfile from path", () => {
    expect(detectLanguage("/app/Dockerfile")).toBe("dockerfile");
  });

  it("returns 'text' for unknown extensions", () => {
    expect(detectLanguage("file.xyz")).toBe("text");
  });

  it("detects Rust from .rs extension", () => {
    expect(detectLanguage("main.rs")).toBe("rust");
  });

  it("detects Go from .go extension", () => {
    expect(detectLanguage("main.go")).toBe("go");
  });

  it("detects JSON from .json extension", () => {
    expect(detectLanguage("config.json")).toBe("json");
  });

  it("detects from full path", () => {
    expect(detectLanguage("/home/user/project/src/app.ts")).toBe("typescript");
  });

  it("detects from Windows path", () => {
    expect(detectLanguage("C:\\Users\\dev\\app.ts")).toBe("typescript");
  });
});
