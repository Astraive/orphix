import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  normalizeTerminalProfileId,
  type TerminalProfile,
  type TerminalProfileId,
} from "../../shared/terminal-profiles";
import type { ResolvedShell } from "./resolveShell";

const vsEditions = ["Enterprise", "Professional", "Community", "BuildTools"] as const;
const vsVersions = ["2022", "2019", "2017"] as const;

interface WindowsProfileEntry {
  profile: TerminalProfile;
  shell: ResolvedShell;
  aliases: string[];
}

export interface WindowsProfileRuntime {
  pathExists: (candidatePath: string) => boolean;
  runCommand: (command: string, args: string[]) => { status: number | null; stdout: string };
}

const decodeCommandOutput = (stdout: Buffer | string | null | undefined): string => {
  if (stdout === null || stdout === undefined) return "";
  if (typeof stdout === "string") return stdout;
  if (stdout.length >= 2 && stdout[0] === 0xff && stdout[1] === 0xfe) {
    return stdout.toString("utf16le");
  }
  if (stdout.includes(0)) return stdout.toString("utf16le");
  return stdout.toString("utf8");
};

const createRuntime = (): WindowsProfileRuntime => ({
  pathExists: (candidatePath) => fs.existsSync(candidatePath),
  runCommand: (command, args) => {
    const result = spawnSync(command, args, { windowsHide: true });
    return { status: result.status, stdout: decodeCommandOutput(result.stdout) };
  },
});

const findFirstExistingPath = (
  paths: string[],
  runtime: WindowsProfileRuntime,
): string | null => {
  for (const candidatePath of paths) {
    if (runtime.pathExists(candidatePath)) return candidatePath;
  }
  return null;
};

const findExecutableInPath = (
  env: NodeJS.ProcessEnv,
  executableNames: string[],
  runtime: WindowsProfileRuntime,
): string | null => {
  const pathEnv = env.PATH ?? env.Path ?? "";
  const segments = pathEnv.split(";").filter((segment) => segment.trim().length > 0);
  for (const segment of segments) {
    for (const executableName of executableNames) {
      const candidatePath = path.win32.join(segment, executableName);
      if (runtime.pathExists(candidatePath)) return candidatePath;
    }
  }
  return null;
};

const listVsInstallationRoots = (
  env: NodeJS.ProcessEnv,
  runtime: WindowsProfileRuntime,
): string[] => {
  const roots: string[] = [];
  const seen = new Set<string>();
  const pushRoot = (candidatePath: string | null | undefined): void => {
    if (!candidatePath || seen.has(candidatePath)) return;
    seen.add(candidatePath);
    roots.push(candidatePath);
  };

  const programData = env.ProgramData ?? "C:\\ProgramData";
  const vsWherePath = findFirstExistingPath(
    [
      path.win32.join(programData, "Microsoft", "VisualStudio", "Packages", "_Instances", "vswhere.exe"),
      path.win32.join(env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Microsoft Visual Studio", "Installer", "vswhere.exe"),
      path.win32.join(env.ProgramFiles ?? "C:\\Program Files", "Microsoft Visual Studio", "Installer", "vswhere.exe"),
      findExecutableInPath(env, ["vswhere.exe"], runtime),
    ].filter((value): value is string => Boolean(value)),
    runtime,
  );

  if (vsWherePath) {
    const result = runtime.runCommand(vsWherePath, [
      "-products",
      "*",
      "-requires",
      "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
      "-property",
      "installationPath",
    ]);
    if (result.status === 0) {
      result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => pushRoot(line));
    }
  }

  for (const rootPath of [
    env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    env.ProgramFiles ?? "C:\\Program Files",
  ]) {
    for (const version of vsVersions) {
      for (const edition of vsEditions) {
        pushRoot(path.win32.join(rootPath, "Microsoft Visual Studio", version, edition));
      }
    }
  }

  return roots;
};

const resolveCmd = (env: NodeJS.ProcessEnv): ResolvedShell => ({
  command: typeof env.ComSpec === "string" && env.ComSpec.trim().length > 0 ? env.ComSpec : "cmd.exe",
  args: [],
  label: "Command Prompt",
});

const resolveWindowsPowerShell = (
  env: NodeJS.ProcessEnv,
  runtime: WindowsProfileRuntime,
): ResolvedShell | null => {
  const systemRoot = env.SystemRoot ?? "C:\\Windows";
  const powershellPath = findFirstExistingPath(
    [path.win32.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")],
    runtime,
  ) ?? findExecutableInPath(env, ["powershell.exe"], runtime);
  return powershellPath ? { command: powershellPath, args: ["-NoLogo"], label: "Windows PowerShell" } : null;
};

const resolvePwsh = (
  env: NodeJS.ProcessEnv,
  runtime: WindowsProfileRuntime,
): ResolvedShell | null => {
  const programFiles = env.ProgramW6432 ?? env.ProgramFiles ?? "C:\\Program Files";
  const programFilesX86 = env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
  const pwshFromPath = findExecutableInPath(env, ["pwsh.exe"], runtime);
  const pwshPath = findFirstExistingPath(
    [
      path.win32.join(programFiles, "PowerShell", "7", "pwsh.exe"),
      path.win32.join(programFilesX86, "PowerShell", "7", "pwsh.exe"),
      ...(pwshFromPath ? [pwshFromPath] : []),
    ],
    runtime,
  );
  return pwshPath ? { command: pwshPath, args: ["-NoLogo"], label: "PowerShell" } : null;
};

const findVsToolPath = (
  env: NodeJS.ProcessEnv,
  toolFileName: string,
  runtime: WindowsProfileRuntime,
): string | null => {
  const candidates = listVsInstallationRoots(env, runtime).map((root) =>
    path.win32.join(root, "Common7", "Tools", toolFileName),
  );
  return findFirstExistingPath(candidates, runtime);
};

const createProfileEntry = (
  label: string,
  shell: ResolvedShell,
  aliases: string[] = [],
  description = shell.command,
): WindowsProfileEntry => ({
  profile: {
    id: normalizeTerminalProfileId(label) || "profile-unknown",
    label,
    description,
  },
  shell: { command: shell.command, args: [...shell.args], label: shell.label },
  aliases: aliases.map((alias) => normalizeTerminalProfileId(alias)),
});

const listWslDistributions = (
  env: NodeJS.ProcessEnv,
  runtime: WindowsProfileRuntime,
): { wslPath: string | null; distributions: string[] } => {
  const systemRoot = env.SystemRoot ?? "C:\\Windows";
  const wslPath = findFirstExistingPath(
    [
      path.win32.join(systemRoot, "System32", "wsl.exe"),
      path.win32.join(systemRoot, "Sysnative", "wsl.exe"),
    ],
    runtime,
  ) ?? findExecutableInPath(env, ["wsl.exe"], runtime);

  if (!wslPath) return { wslPath: null, distributions: [] };

  const result = runtime.runCommand(wslPath, ["-l", "-q"]);
  if (result.status !== 0) return { wslPath, distributions: [] };

  const distributions = result.stdout
    .split(/\r?\n/)
    .map((line) => line.split("\u0000").join("").replace(/^\uFEFF/, "").replace(/^\*/, "").trim())
    .filter((line) => line.length > 0)
    .filter((line) => normalizeTerminalProfileId(line).length > 0);

  return { wslPath, distributions };
};

const findAzureCloudShellExecutable = (
  env: NodeJS.ProcessEnv,
  runtime: WindowsProfileRuntime,
): string | null => {
  const localAppData = env.LOCALAPPDATA ?? "";
  const windowsAppsPath = localAppData
    ? path.win32.join(localAppData, "Microsoft", "WindowsApps", "azshell.exe")
    : null;
  const fromPath = findExecutableInPath(env, ["azshell.exe"], runtime);
  return findFirstExistingPath(
    [windowsAppsPath, fromPath].filter((candidate): candidate is string => Boolean(candidate)),
    runtime,
  );
};

export const buildWindowsProfileEntries = (
  env: NodeJS.ProcessEnv,
  runtime: WindowsProfileRuntime = createRuntime(),
): WindowsProfileEntry[] => {
  const entries: WindowsProfileEntry[] = [];
  const commandPrompt = resolveCmd(env);
  const windowsPowerShell = resolveWindowsPowerShell(env, runtime);
  const powerShell = resolvePwsh(env, runtime);

  if (windowsPowerShell) {
    entries.push(createProfileEntry("Windows PowerShell", windowsPowerShell, ["windows-powershell"]));
  }
  entries.push(createProfileEntry("Command Prompt", commandPrompt, ["command-prompt", "cmd"]));

  const azureShellExecutable = findAzureCloudShellExecutable(env, runtime);
  if (azureShellExecutable) {
    entries.push(createProfileEntry("Azure Cloud Shell", {
      command: azureShellExecutable,
      args: [],
      label: "Azure Cloud Shell",
    }, ["azure-cloud-shell"]));
  }

  const { wslPath, distributions } = listWslDistributions(env, runtime);
  if (wslPath) {
    for (const distribution of distributions) {
      entries.push(createProfileEntry(distribution, {
        command: wslPath,
        args: ["-d", distribution],
        label: distribution,
      }, normalizeTerminalProfileId(distribution) === "ubuntu" ? ["ubuntu"] : []));
    }
  }

  const vsDevCmdPath = findVsToolPath(env, "VsDevCmd.bat", runtime);
  if (vsDevCmdPath) {
    entries.push(createProfileEntry("Developer Command Prompt for Visual Studio", {
      command: commandPrompt.command,
      args: ["/k", `"${vsDevCmdPath}" -arch=x64 -host_arch=x64`],
      label: "Developer Command Prompt for Visual Studio",
    }, ["developer-command-prompt", "developer-command-prompt-vs"], vsDevCmdPath));
  }

  const launchVsDevShellPath = findVsToolPath(env, "Launch-VsDevShell.ps1", runtime);
  if (launchVsDevShellPath && (windowsPowerShell || powerShell)) {
    const shellBase = windowsPowerShell ?? powerShell;
    if (shellBase) {
      entries.push(createProfileEntry("Developer PowerShell for Visual Studio", {
        command: shellBase.command,
        args: ["-NoLogo", "-NoExit", "-ExecutionPolicy", "Bypass", "-File", launchVsDevShellPath],
        label: "Developer PowerShell for Visual Studio",
      }, ["developer-powershell", "developer-powershell-vs"], launchVsDevShellPath));
    }
  }

  if (powerShell) {
    entries.push(createProfileEntry("PowerShell", powerShell, ["powershell", "pwsh"]));
  }

  const uniqueEntries: WindowsProfileEntry[] = [];
  const seenIds = new Set<string>();
  for (const entry of entries) {
    if (seenIds.has(entry.profile.id)) continue;
    seenIds.add(entry.profile.id);
    uniqueEntries.push(entry);
  }

  return uniqueEntries.length > 0
    ? uniqueEntries
    : [createProfileEntry("Command Prompt", commandPrompt, ["command-prompt", "cmd"])];
};

export const listWindowsTerminalProfiles = (
  env: NodeJS.ProcessEnv,
  runtime: WindowsProfileRuntime = createRuntime(),
): TerminalProfile[] => buildWindowsProfileEntries(env, runtime).map((entry) => entry.profile);

const resolveDefaultWindowsShell = (
  env: NodeJS.ProcessEnv,
  runtime: WindowsProfileRuntime,
): ResolvedShell => buildWindowsProfileEntries(env, runtime)[0]?.shell ?? resolveCmd(env);

export const resolveWindowsShell = (
  env: NodeJS.ProcessEnv,
  profileId: TerminalProfileId = "default",
  runtime: WindowsProfileRuntime = createRuntime(),
): ResolvedShell => {
  const normalizedProfileId = normalizeTerminalProfileId(profileId);
  if (normalizedProfileId === "default" || normalizedProfileId.length === 0) {
    return resolveDefaultWindowsShell(env, runtime);
  }

  const selectedEntry = buildWindowsProfileEntries(env, runtime).find((entry) => (
    entry.profile.id === normalizedProfileId || entry.aliases.includes(normalizedProfileId)
  ));

  if (selectedEntry) return selectedEntry.shell;

  if (fs.existsSync(profileId)) {
    return {
      command: profileId,
      args: [],
      label: path.win32.basename(profileId),
    };
  }

  return resolveDefaultWindowsShell(env, runtime);
};
