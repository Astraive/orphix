import { describe, expect, it } from "vitest";
import { buildPreparedTreeData, isAncestorPath, mapGitStatusEntries, toRelativeTreePath } from "./utils";

describe("file tree utils", () => {
  it("converts absolute Windows-style paths to root-relative tree paths", () => {
    expect(toRelativeTreePath("C:\\repo", "C:\\repo\\src\\index.ts")).toBe("src/index.ts");
    expect(toRelativeTreePath("C:\\repo", "C:\\repo\\src")).toBe("src");
  });

  it("builds prepared input with stable relative-path lookup", () => {
    const result = buildPreparedTreeData("C:\\repo", [
      { isDir: true, name: "src", path: "C:\\repo\\src" },
      { isDir: false, name: "index.ts", path: "C:\\repo\\src\\index.ts" },
    ]);

    expect(result.relativePaths).toEqual(["src", "src/index.ts"]);
    expect(result.absoluteByRelative.get("src")?.path).toBe("C:\\repo\\src");
    expect(result.absoluteByRelative.get("src/index.ts")?.path).toBe("C:\\repo\\src\\index.ts");
  });

  it("maps git status entries to root-relative tree paths", () => {
    expect(mapGitStatusEntries("C:\\repo", [
      { path: "C:\\repo\\src\\index.ts", status: "modified" },
      { path: "C:\\repo\\README.md", status: "added" },
    ])).toEqual([
      { path: "src/index.ts", status: "modified" },
      { path: "README.md", status: "added" },
    ]);
  });

  it("detects ancestor relationships across nested paths", () => {
    expect(isAncestorPath("C:\\repo\\src", "C:\\repo\\src\\features\\tree.ts")).toBe(true);
    expect(isAncestorPath("C:\\repo\\src", "C:\\repo\\scripts\\build.ts")).toBe(false);
  });
});
