import { test, expect } from "vitest";
import { spawnSync } from "node:child_process";

const hasOpenClaude = () => {
  const command = process.platform === "win32" ? "where.exe" : "which";
  return spawnSync(command, ["openclaude"], { stdio: "ignore" }).status === 0;
};

test.skipIf(!hasOpenClaude())(
  "openclaude agents exits cleanly through the app PTY layer",
  async () => {
    // This test requires openclaude to be installed and node-pty available.
    // It spawns an actual PTY session to verify integration.
    const pty = await import("node-pty");

    const shell = process.platform === "win32" ? "powershell.exe" : "sh";
    const args =
      process.platform === "win32"
        ? ["-NoLogo", "-Command", "openclaude agents"]
        : ["-lc", "openclaude agents"];

    const result = await new Promise<{ exitCode: number; output: string }>((resolve, reject) => {
      let output = "";
      const proc = pty.spawn(shell, args, {
        cwd: process.cwd(),
        cols: 120,
        rows: 30,
        env: process.env as Record<string, string>,
        useConpty: process.platform === "win32",
      });

      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error(`openclaude agents timed out. Output:\n${output}`));
      }, 20_000);

      proc.onData((data: string) => {
        output += data;
      });

      proc.onExit(({ exitCode }: { exitCode: number }) => {
        clearTimeout(timeout);
        try {
          proc.kill();
        } catch {
          // The PTY has already exited.
        }
        resolve({ exitCode, output });
      });
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toMatch(/active agents|Built-in agents/i);
  },
  25_000,
);
