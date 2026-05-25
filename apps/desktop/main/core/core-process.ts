import { spawn, type ChildProcess } from "child_process";
import { join } from "path";
import { existsSync } from "fs";
import { platform } from "os";
import { app } from "electron";

export class CoreProcess {
  private process: ChildProcess | null = null;
  private messageHandler: ((data: Buffer) => void) | null = null;
  private exitHandler: (() => void) | null = null;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  private started = false;

  constructor(private onEvent: (event: string, data: unknown) => void) {}

  private getBinaryPath(): string {
    const isDev = !app.isPackaged;
    const isWindows = platform() === "win32";
    const ext = isWindows ? ".exe" : "";

    if (isDev) {
      const devPath = join(__dirname, `../../../../target/debug/orphix-core${ext}`);
      if (existsSync(devPath)) return devPath;
    }

    const prodPath = join(process.resourcesPath, `orphix-core${ext}`);
    if (existsSync(prodPath)) return prodPath;

    throw new Error(`orphix-core binary not found`);
  }

  start(): void {
    if (this.process) return;

    let binaryPath: string;
    try {
      binaryPath = this.getBinaryPath();
    } catch (err) {
      console.error("orphix-core binary not found");
      return;
    }

    console.log(`Starting orphix-core: ${binaryPath}`);

    const proc = spawn(binaryPath, ["--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process = proc;

    proc.stdout?.on("data", (data: Buffer) => {
      this.messageHandler?.(data);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      try {
        process.stderr.write(data);
      } catch {
        // Ignore EPIPE — parent stderr may be closed
      }
    });

    // Suppress EPIPE errors on stdin/stdout/stderr pipes
    proc.stdin?.on("error", () => {});
    proc.stdout?.on("error", () => {});
    proc.stderr?.on("error", () => {});

    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code !== "EPIPE") {
        console.error("Failed to start orphix-core:", err.message);
      }
    });

    proc.on("exit", (code, signal) => {
      console.log(`orphix-core exited code=${code} signal=${signal}`);
      this.process = null;
      this.exitHandler?.();

      if (this.started && this.restartAttempts < this.maxRestartAttempts) {
        this.restartAttempts++;
        const delay = Math.min(1000 * this.restartAttempts, 5000);
        setTimeout(() => this.start(), delay);
      }
    });

    if (!this.started) {
      this.restartAttempts = 0;
    }
    this.started = true;
  }

  stop(): void {
    this.started = false;
    this.restartAttempts = this.maxRestartAttempts;
    if (this.process) {
      try {
        this.process.kill();
      } catch {
        // Process may already be dead
      }
      this.process = null;
    }
  }

  send(message: string): void {
    if (this.process?.stdin?.writable) {
      try {
        this.process.stdin.write(message + "\n");
      } catch {
        // EPIPE — core process died
      }
    }
  }

  onMessage(handler: (data: Buffer) => void): void {
    this.messageHandler = handler;
  }

  onExit(handler: () => void): void {
    this.exitHandler = handler;
  }

  isRunning(): boolean {
    return this.process !== null;
  }
}
