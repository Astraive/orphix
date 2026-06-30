import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { assertTrustedSender, resolveWorkspacePath } from "./ipc-security";

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "orphix-ipc-security-"));
  roots.push(root);
  return realpathSync.native(root);
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("resolveWorkspacePath", () => {
  test("allows files inside the workspace", () => {
    const root = makeRoot();
    const file = path.join(root, "notes.md");
    writeFileSync(file, "ok");

    expect(resolveWorkspacePath(root, file)).toBe(realpathSync.native(file));
    expect(resolveWorkspacePath(root, "notes.md")).toBe(realpathSync.native(file));
  });

  test("blocks paths outside the workspace", () => {
    const root = makeRoot();
    const outside = path.join(path.dirname(root), "outside.txt");

    expect(() => resolveWorkspacePath(root, outside)).toThrow("outside the trusted workspace");
  });

  test("blocks symlinks that resolve outside the workspace", () => {
    const root = makeRoot();
    const outsideDir = mkdtempSync(path.join(tmpdir(), "orphix-ipc-outside-"));
    roots.push(outsideDir);
    const outsideFile = path.join(outsideDir, "secret.txt");
    writeFileSync(outsideFile, "secret");
    const link = path.join(root, "secret-link.txt");
    symlinkSync(outsideFile, link);

    expect(() => resolveWorkspacePath(root, link)).toThrow("outside the trusted workspace");
  });

  test("allows creating a new child path inside an existing workspace directory", () => {
    const root = makeRoot();
    mkdirSync(path.join(root, "src"));

    expect(resolveWorkspacePath(root, path.join(root, "src", "new.ts"))).toBe(path.join(root, "src", "new.ts"));
  });
});

describe("assertTrustedSender", () => {
  test("allows local app file renderers", () => {
    expect(() => assertTrustedSender({ senderFrame: { url: "file:///app/index.html" }, sender: { getURL: () => "" } } as any)).not.toThrow();
  });

  test("blocks untrusted remote renderers", () => {
    expect(() => assertTrustedSender({ senderFrame: { url: "https://evil.example/" }, sender: { getURL: () => "" } } as any)).toThrow("untrusted renderer origin");
  });
});
