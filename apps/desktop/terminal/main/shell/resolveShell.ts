import type { ShellInfo } from "../../shared/types";
import type { TerminalProfile, TerminalProfileId } from "../../shared/terminal-profiles";
import { normalizeTerminalProfileId } from "../../shared/terminal-profiles";
import { listDarwinTerminalProfiles, resolveDarwinShell } from "./darwin";
import { listLinuxTerminalProfiles, resolveLinuxShell } from "./linux";
import { listWindowsTerminalProfiles, resolveWindowsShell } from "./windows";

export interface ResolvedShell {
  command: string;
  args: string[];
  label: string;
}

export const resolveShell = (
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  profileId?: TerminalProfileId,
): ResolvedShell => {
  switch (platform) {
    case "win32":
      return resolveWindowsShell(env, profileId);
    case "darwin":
      return resolveDarwinShell(env, profileId);
    default:
      return resolveLinuxShell(env, profileId);
  }
};

export const listTerminalProfiles = (
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): TerminalProfile[] => {
  switch (platform) {
    case "win32":
      return listWindowsTerminalProfiles(env);
    case "darwin":
      return listDarwinTerminalProfiles(env);
    default:
      return listLinuxTerminalProfiles(env);
  }
};

export const listShells = (
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): ShellInfo[] => {
  const profiles = listTerminalProfiles(platform, env);
  const shells = profiles.map((profile) => {
    const resolved = resolveShell(platform, env, profile.id);
    return {
      id: profile.id,
      command: resolved.command,
      args: resolved.args,
      label: profile.label,
      description: profile.description,
    };
  });

  if (shells.length > 0) {
    return shells;
  }

  const fallback = resolveShell(platform, env, "default");
  return [{
    id: normalizeTerminalProfileId(fallback.label) || "default",
    command: fallback.command,
    args: fallback.args,
    label: fallback.label,
    description: fallback.command,
  }];
};
