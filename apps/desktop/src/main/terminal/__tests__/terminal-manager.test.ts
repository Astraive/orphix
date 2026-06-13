import { test, expect } from "vitest";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("TerminalManager does not import cwd tracking on PTY output path", async () => {
  const source = await readFile(
    path.join(__dirname, "..", "TerminalManager.ts"),
    "utf8",
  );

  expect(source).not.toMatch(/extractTrackedCwdFromOutput/);
  const onDataBlock = source.match(/ptyProcess\.onData\(\(data\) => \{[\s\S]*?\n    \}\);/)?.[0] ?? "";
  expect(onDataBlock).toMatch(/EVENTS\.output/);
  expect(onDataBlock).not.toMatch(/isExistingDirectory|resolveNextCwdFromCommand|EVENTS\.error/);
  expect(source).toMatch(/writePtyData\(session\.pty, request\.data\)/);
});
