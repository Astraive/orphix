const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

test("xterm loads search and webgl addons", async () => {
  const source = await readFile(path.join(__dirname, "createXterm.ts"), "utf8");

  assert.match(source, /new SearchAddon/);
  assert.match(source, /new WebglAddon/);
  assert.match(source, /convertEol:\s*false/);
  assert.doesNotMatch(source, /windowsMode/);
});
