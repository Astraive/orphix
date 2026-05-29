const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

test("TerminalManager does not import cwd tracking on PTY output path", async () => {
  const source = await require("node:fs/promises").readFile(
    path.join(__dirname, "..", "TerminalManager.ts"),
    "utf8",
  );

  assert.doesNotMatch(source, /extractTrackedCwdFromOutput/);
  const onDataBlock = source.match(/ptyProcess\.onData\(\(data\) => \{[\s\S]*?\n    \}\);/)?.[0] ?? "";
  assert.match(onDataBlock, /EVENTS\.output/);
  assert.doesNotMatch(onDataBlock, /isExistingDirectory|resolveNextCwdFromCommand|EVENTS\.error/);
  assert.match(source, /writePtyData\(session\.pty, request\.data\)/);
});
