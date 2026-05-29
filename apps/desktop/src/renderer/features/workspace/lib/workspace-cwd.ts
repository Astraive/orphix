import { invoke } from "@/lib/ipc-client";
import { CHANNELS } from "@shared/ipc/channels";

let workspaceCwdPromise: Promise<string> | null = null;

export function getWorkspaceCwd(): Promise<string> {
  workspaceCwdPromise ??= invoke<string>(CHANNELS.SYSTEM_WORKSPACE_DIR);
  return workspaceCwdPromise;
}
