import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("xterm loads search and webgl addons", async () => {
  const source = await readFile(path.join(__dirname, "createXterm.ts"), "utf8");

  expect(source).toMatch(/new SearchAddon/);
  expect(source).toMatch(/new WebglAddon/);
  expect(source).toMatch(/convertEol:\s*false/);
  expect(source).not.toMatch(/windowsMode/);
});
