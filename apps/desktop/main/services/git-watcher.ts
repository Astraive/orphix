import { watch, type FSWatcher } from "chokidar";
import { spawnSync } from "child_process";
import { BrowserWindow } from "electron";
import { CHANNELS } from "../../shared/channels";

let watcher: FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export function startGitWatcher(gitDir: string): void {
  if (watcher) {
    watcher.close();
  }

  watcher = watch(gitDir, {
    ignored: [
      /logs/,
      /ORIG_HEAD/,
      /index\.lock/,
    ],
    persistent: true,
    ignoreInitial: true,
    depth: 4,
  });

  const notify = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(CHANNELS.GIT_STATUS_CHANGED, {});
      }
    }, 120);
  };

  watcher
    .on("add", notify)
    .on("change", notify)
    .on("unlink", notify)
    .on("addDir", notify)
    .on("unlinkDir", notify);
}

export function stopGitWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export function getGitStatus(cwd: string): {
  branch: string | null;
  files: { path: string; status: string; staged: boolean }[];
  ahead: number;
  behind: number;
} | null {
  try {
    const result = spawnSync("git", ["status", "--porcelain=2", "--branch"], {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
    });

    if (result.error || result.status !== 0) return null;

    const lines = result.stdout.split("\n");
    let branch: string | null = null;
    let ahead = 0;
    let behind = 0;
    const files: { path: string; status: string; staged: boolean }[] = [];

    for (const line of lines) {
      if (line.startsWith("# branch.head ")) {
        branch = line.slice(14).trim();
      } else if (line.startsWith("# branch.ab ")) {
        const parts = line.slice(12).split(" ");
        ahead = parseInt(parts[0]?.replace("+", "") || "0", 10);
        behind = parseInt(parts[1]?.replace("-", "") || "0", 10);
      } else if (line.length > 0) {
        // XY format: X = index status, Y = worktree status
        const x = line[0];
        const y = line[1];
        const filePath = line.length > 3 ? line.slice(3) : "";

        if (x !== " " && x !== "?") {
          files.push({ path: filePath, status: x, staged: true });
        }
        if (y !== " " && y !== "?") {
          files.push({ path: filePath, status: y, staged: false });
        }
        if (x === "?" && y === "?") {
          files.push({ path: filePath, status: "??", staged: false });
        }
      }
    }

    return { branch, files, ahead, behind };
  } catch {
    return null;
  }
}

export function getGitBranches(cwd: string): { name: string; isCurrent: boolean; isRemote: boolean }[] {
  try {
    const result = spawnSync("git", ["branch", "-a", "--format=%(refname:short)%(HEAD)"], {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
    });

    if (result.error || result.status !== 0) return [];

    return result.stdout
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        const isCurrent = line.endsWith("*");
        const name = line.replace("*", "").trim();
        const isRemote = name.startsWith("origin/") || name.startsWith("remotes/");
        return { name, isCurrent, isRemote };
      });
  } catch {
    return [];
  }
}

export function gitCheckout(cwd: string, branch: string): boolean {
  try {
    const result = spawnSync("git", ["checkout", branch], {
      cwd,
      encoding: "utf-8",
      timeout: 10000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function gitDiff(cwd: string, file: string): string {
  try {
    const result = spawnSync("git", ["diff", "--", file], {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
    });
    return result.stdout || "";
  } catch {
    return "";
  }
}

export function gitStage(cwd: string, files: string[]): boolean {
  try {
    const result = spawnSync("git", ["add", ...files], {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function gitUnstage(cwd: string, files: string[]): boolean {
  try {
    const result = spawnSync("git", ["reset", "HEAD", "--", ...files], {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function gitCommit(cwd: string, message: string): boolean {
  try {
    const result = spawnSync("git", ["commit", "-m", message], {
      cwd,
      encoding: "utf-8",
      timeout: 10000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
