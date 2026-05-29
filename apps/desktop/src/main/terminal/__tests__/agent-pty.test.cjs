const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { after, test } = require("node:test");
const pty = require("node-pty");

const hasOpenClaude = () => {
  const command = process.platform === "win32" ? "where.exe" : "which";
  return spawnSync(command, ["openclaude"], { stdio: "ignore" }).status === 0;
};

test("openclaude agents exits cleanly through the app PTY layer", { skip: !hasOpenClaude() }, async () => {
  const shell = process.platform === "win32" ? "powershell.exe" : "sh";
  const args = process.platform === "win32"
    ? ["-NoLogo", "-Command", "openclaude agents"]
    : ["-lc", "openclaude agents"];

  const result = await new Promise((resolve, reject) => {
    let output = "";
    const proc = pty.spawn(shell, args, {
      cwd: process.cwd(),
      cols: 120,
      rows: 30,
      env: process.env,
      useConpty: process.platform === "win32",
    });

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error(`openclaude agents timed out. Output:\n${output}`));
    }, 20_000);

    proc.onData((data) => {
      output += data;
    });

    proc.onExit(({ exitCode }) => {
      clearTimeout(timeout);
      try {
        proc.kill();
      } catch {
        // The PTY has already exited.
      }
      resolve({ exitCode, output });
    });
  });

  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.output, /active agents|Built-in agents/i);
});

after(() => {
  setImmediate(() => process.exit(process.exitCode ?? 0));
});
