import fs from "node:fs";
import path from "node:path";
import {
  normalizeTerminalProfileId,
  type TerminalProfile,
  type TerminalProfileId,
} from "../../shared/terminal-profiles";
import type { ResolvedShell } from "./resolveShell";

interface LinuxProfileEntry {
  profile: TerminalProfile;
  shell: ResolvedShell;
}

export interface LinuxRuntime {
  pathExists: (candidatePath: string) => boolean;
  readFile: (candidatePath: string) => string;
}

const createRuntime = (): LinuxRuntime => ({
  pathExists: (candidatePath) => fs.existsSync(candidatePath),
  readFile: (candidatePath) => fs.readFileSync(candidatePath, "utf8"),
});

const parseShellList = (content: string): string[] => content
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .filter((line) => !line.startsWith("#"));

const listCandidateShellPaths = (env: NodeJS.ProcessEnv, runtime: LinuxRuntime): string[] => {
  const candidateShells: string[] = [];
  if (typeof env.SHELL === "string" && env.SHELL.trim().length > 0) {
    candidateShells.push(env.SHELL.trim());
  }

  if (runtime.pathExists("/etc/shells")) {
    try {
      candidateShells.push(...parseShellList(runtime.readFile("/etc/shells")));
    } catch {
      // Ignore unreadable shell lists and continue with detected paths.
    }
  }

  const uniqueShells: string[] = [];
  const seen = new Set<string>();
  for (const shellPath of candidateShells) {
    if (!runtime.pathExists(shellPath) || seen.has(shellPath)) continue;
    seen.add(shellPath);
    uniqueShells.push(shellPath);
  }
  return uniqueShells;
};

const buildLinuxProfileEntries = (
  env: NodeJS.ProcessEnv,
  runtime: LinuxRuntime = createRuntime(),
): LinuxProfileEntry[] => {
  const entries: LinuxProfileEntry[] = [];
  const seenIds = new Set<string>();

  for (const shellPath of listCandidateShellPaths(env, runtime)) {
    const label = path.basename(shellPath);
    const idSource = normalizeTerminalProfileId(label) || normalizeTerminalProfileId(shellPath) || "shell";
    let profileId = idSource;
    let index = 2;
    while (seenIds.has(profileId)) {
      profileId = `${idSource}-${index}`;
      index += 1;
    }
    seenIds.add(profileId);

    entries.push({
      profile: { id: profileId, label, description: shellPath },
      shell: { command: shellPath, args: ["-l"], label },
    });
  }

  return entries;
};

const resolveFallbackShell = (
  env: NodeJS.ProcessEnv,
  runtime: LinuxRuntime,
): ResolvedShell => {
  const entries = buildLinuxProfileEntries(env, runtime);
  if (entries.length > 0) return entries[0].shell;

  const fallbackPath = ["/bin/bash", "/bin/sh", "/usr/bin/sh"].find((candidate) =>
    runtime.pathExists(candidate),
  );
  return fallbackPath
    ? { command: fallbackPath, args: ["-l"], label: path.basename(fallbackPath) }
    : { command: "sh", args: ["-l"], label: "sh" };
};

export const listLinuxTerminalProfiles = (
  env: NodeJS.ProcessEnv,
  runtime: LinuxRuntime = createRuntime(),
): TerminalProfile[] => buildLinuxProfileEntries(env, runtime).map((entry) => entry.profile);

export const resolveLinuxShell = (
  env: NodeJS.ProcessEnv,
  profileId: TerminalProfileId = "default",
  runtime: LinuxRuntime = createRuntime(),
): ResolvedShell => {
  const normalizedProfileId = normalizeTerminalProfileId(profileId);
  const entries = buildLinuxProfileEntries(env, runtime);
  if (entries.length === 0) return resolveFallbackShell(env, runtime);

  if (normalizedProfileId === "" || normalizedProfileId === "default") {
    const preferredShellPath = typeof env.SHELL === "string" ? env.SHELL.trim() : "";
    return entries.find((entry) => entry.shell.command === preferredShellPath)?.shell ?? entries[0].shell;
  }

  return entries.find((entry) => (
    entry.profile.id === normalizedProfileId ||
    normalizeTerminalProfileId(entry.profile.label) === normalizedProfileId ||
    entry.shell.command === profileId
  ))?.shell ?? entries[0].shell;
};
