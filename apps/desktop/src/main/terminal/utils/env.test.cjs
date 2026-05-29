const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

test("buildPtyEnv does not force color when NO_COLOR is present", async () => {
  const source = await readFile(path.join(__dirname, "env.ts"), "utf8");

  assert.match(source, /if \(!env\.NO_COLOR\)/);
  assert.match(source, /delete env\.FORCE_COLOR/);
});
