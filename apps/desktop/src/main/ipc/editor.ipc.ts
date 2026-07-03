import { ipcMain } from "electron";
import * as path from "path";
import * as fs from "fs";
import { CHANNELS } from "../../shared/ipc/channels";

// Extensions probed when resolving a relative import to a real file, in priority order.
const RESOLVE_EXTS = [
  ".ts", ".tsx", ".mts", ".cts",
  ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".cs",
  ".c", ".h", ".cpp", ".hpp",
  ".css", ".scss", ".json",
];

const INDEX_BASENAMES = ["index", "__init__", "mod"];

function firstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // not a file — keep looking
    }
  }
  return null;
}

/**
 * Resolve a (relative) module specifier imported from `fromPath` to an absolute file.
 * Bare specifiers (node_modules / stdlib / Go packages) return null — they cannot be
 * resolved to a single source file reliably.
 */
function resolveModuleFile(fromPath: string, specifier: string): string | null {
  let rel = specifier;

  // Python dotted relatives: ".mod", "..pkg.sub" → path segments.
  if (/^\.+[A-Za-z_]/.test(specifier) && specifier.includes(".") && !specifier.startsWith("./") && !specifier.startsWith("../")) {
    const leadingDots = specifier.match(/^\.+/)?.[0].length ?? 0;
    const up = "../".repeat(Math.max(0, leadingDots - 1));
    rel = up + specifier.slice(leadingDots).split(".").join("/");
  }

  if (!rel.startsWith("./") && !rel.startsWith("../") && !rel.startsWith("/")) {
    return null; // bare import — out of scope
  }

  const baseDir = path.dirname(path.resolve(fromPath));
  const target = path.resolve(baseDir, rel);
  const ext = path.extname(target);

  const candidates: string[] = [];
  if (ext) candidates.push(target); // explicit extension
  for (const e of RESOLVE_EXTS) candidates.push(target + e);
  for (const base of INDEX_BASENAMES) {
    for (const e of RESOLVE_EXTS) candidates.push(path.join(target, base + e));
  }
  return firstExisting(candidates);
}

/** Find the 1-based line where `symbol` is exported/defined in `file`, or null. */
function findDefinitionLine(file: string, symbol: string): number | null {
  let content: string;
  try {
    content = fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
  const safe = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // export-prefixed or bare top-level definitions across the supported languages.
  const def = new RegExp(
    `\\b(?:export\\s+(?:default\\s+)?)?(?:function|class|const|let|var|interface|type|enum|def|fn|struct|trait|func)\\s+${safe}\\b`,
  );
  const named = new RegExp(`\\bexport\\b[^\\n]*\\b${safe}\\b`);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (def.test(lines[i])) return i + 1;
  }
  for (let i = 0; i < lines.length; i++) {
    if (named.test(lines[i])) return i + 1;
  }
  return null;
}

export function registerEditorIpc(): void {
  ipcMain.handle(
    CHANNELS.EDITOR_GOTO_DEFINITION,
    async (_event, args: { fromPath: string; specifier: string; symbol?: string | null }) => {
      const resolved = resolveModuleFile(args.fromPath, args.specifier);
      if (!resolved) return { path: null, line: 1 };
      const line = args.symbol ? findDefinitionLine(resolved, args.symbol) ?? 1 : 1;
      return { path: resolved, line };
    },
  );
}
