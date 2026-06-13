import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("buildPtyEnv does not force color when NO_COLOR is present", async () => {
  const source = await readFile(path.join(__dirname, "env.ts"), "utf8");

  expect(source).toMatch(/if \(!env\.NO_COLOR\)/);
  expect(source).toMatch(/delete env\.FORCE_COLOR/);
});
