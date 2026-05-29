import fs from "node:fs";

interface DirectoryProbe {
  statSync: typeof fs.statSync;
}

export function isExistingDirectory(candidatePath: string, probe: DirectoryProbe = fs): boolean {
  try {
    const stats = probe.statSync(candidatePath, { throwIfNoEntry: false });
    return Boolean(stats?.isDirectory());
  } catch {
    return false;
  }
}
