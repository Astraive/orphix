import type { IpcMainInvokeEvent } from "electron";
import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";

const DEV_RENDERER_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function getSenderUrl(event: IpcMainInvokeEvent): string {
  return event.senderFrame?.url || event.sender.getURL();
}

export function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const senderUrl = getSenderUrl(event);
  if (!senderUrl) {
    throw new Error("Blocked IPC from an unknown renderer");
  }

  let url: URL;
  try {
    url = new URL(senderUrl);
  } catch {
    throw new Error("Blocked IPC from an invalid renderer URL");
  }

  if (url.protocol === "file:") return;

  const allowDevRenderer =
    process.env.NODE_ENV === "development" ||
    process.env.ORPHIX_ALLOW_DEV_RENDERER === "1";
  if (allowDevRenderer && DEV_RENDERER_ORIGINS.has(url.origin)) return;

  throw new Error(`Blocked IPC from untrusted renderer origin: ${url.origin}`);
}

function normalizeRoot(root: string): string {
  const resolved = path.resolve(root);
  try {
    return realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function isPathInside(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function resolveWorkspacePath(workspaceRoot: string, candidatePath: string): string {
  if (typeof candidatePath !== "string" || candidatePath.trim() === "") {
    throw new Error("Path must be a non-empty string");
  }

  const root = normalizeRoot(workspaceRoot);
  const resolved = path.resolve(
    path.isAbsolute(candidatePath) ? candidatePath : path.join(root, candidatePath),
  );

  if (!isPathInside(resolved, root)) {
    throw new Error("Path is outside the trusted workspace");
  }

  let existingAncestor = resolved;
  const missingSegments: string[] = [];

  while (true) {
    try {
      const realAncestor = realpathSync.native(existingAncestor);
      if (!isPathInside(realAncestor, root)) {
        throw new Error("Path resolves outside the trusted workspace");
      }
      return path.join(realAncestor, ...missingSegments);
    } catch (error) {
      if (error instanceof Error && error.message.includes("outside the trusted workspace")) {
        throw error;
      }

      try {
        lstatSync(existingAncestor);
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== "ENOENT") {
          throw statError;
        }

        const parent = path.dirname(existingAncestor);
        if (parent !== existingAncestor) {
          missingSegments.unshift(path.basename(existingAncestor));
          existingAncestor = parent;
          continue;
        }
      }

      throw new Error("Path could not be resolved safely");
    }
  }
}
