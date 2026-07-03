// Lightweight, regex-based import/export tracking for Ctrl+click "go to definition".
// Resolves what the user clicked into either a same-file line jump or an import
// specifier that the main process resolves to a real file.

export type DefinitionResult =
  | { kind: "local"; line: number }
  | { kind: "import"; specifier: string; symbol: string | null }
  | null;

const WORD_RE = /[A-Za-z_$][\w$]*/;

interface WordHit {
  word: string;
  lineText: string;
  col: number; // column (0-based) of the click within its line
}

function wordInfoAt(content: string, offset: number): WordHit | null {
  if (offset < 0 || offset > content.length) return null;

  const lineStart = content.lastIndexOf("\n", offset - 1) + 1;
  let lineEnd = content.indexOf("\n", offset);
  if (lineEnd === -1) lineEnd = content.length;
  const lineText = content.slice(lineStart, lineEnd);
  const col = offset - lineStart;

  // Expand to the identifier under the caret.
  let start = col;
  while (start > 0 && /[\w$]/.test(lineText[start - 1])) start--;
  let end = col;
  while (end < lineText.length && /[\w$]/.test(lineText[end])) end++;
  const word = lineText.slice(start, end);
  if (!word || !WORD_RE.test(word)) return { word: "", lineText, col };
  return { word, lineText, col };
}

/** If the column sits inside a quoted string on the line, return that string's contents. */
function quotedStringAt(lineText: string, col: number): string | null {
  const re = /(['"`])((?:[^\\]|\\.)*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lineText)) !== null) {
    const inner = m.index + 1;
    const innerEnd = inner + m[2].length;
    if (col >= inner && col <= innerEnd) return m[2];
  }
  return null;
}

// ── Import parsing ──────────────────────────────────────────────────────────

interface ImportIndex {
  symbolToSpecifier: Map<string, string>;
  specifiers: Set<string>;
}

function addNames(clause: string, specifier: string, map: Map<string, string>): void {
  // default import: `Foo`
  const head = clause.split(",")[0]?.trim();
  if (head && /^[A-Za-z_$][\w$]*$/.test(head)) map.set(head, specifier);
  // namespace: `* as ns`
  const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (ns) map.set(ns[1], specifier);
  // named: `{ a, b as c }`
  const braces = clause.match(/\{([^}]*)\}/);
  if (braces) {
    for (const part of braces[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) map.set(name, specifier);
    }
  }
}

function buildImportIndex(content: string, language: string): ImportIndex {
  const symbolToSpecifier = new Map<string, string>();
  const specifiers = new Set<string>();

  if (language === "typescript" || language === "javascript") {
    const importFrom = /import\s+([^;]+?)\s+from\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = importFrom.exec(content)) !== null) {
      specifiers.add(m[2]);
      addNames(m[1], m[2], symbolToSpecifier);
    }
    const reExport = /export\s+(?:\*(?:\s+as\s+[A-Za-z_$][\w$]*)?|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/g;
    while ((m = reExport.exec(content)) !== null) specifiers.add(m[1]);
    const req = /(?:const|let|var)\s+([^=;]+?)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = req.exec(content)) !== null) {
      specifiers.add(m[2]);
      addNames(m[1], m[2], symbolToSpecifier);
    }
  } else if (language === "python") {
    const fromImport = /from\s+(\S+)\s+import\s+([^\n#]+)/g;
    let m: RegExpExecArray | null;
    while ((m = fromImport.exec(content)) !== null) {
      const spec = m[1];
      specifiers.add(spec);
      for (const part of m[2].split(",")) {
        const name = part.trim().replace(/[()]/g, "").split(/\s+as\s+/).pop()?.trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) symbolToSpecifier.set(name, spec);
      }
    }
    const plainImport = /^\s*import\s+([A-Za-z_.][\w.]*)/gm;
    while ((m = plainImport.exec(content)) !== null) specifiers.add(m[1]);
  } else {
    // Go/Rust/C: only capture quoted specifiers for path clicks.
    const quoted = /import\s*(?:\(|\s)\s*"([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = quoted.exec(content)) !== null) specifiers.add(m[1]);
  }

  return { symbolToSpecifier, specifiers };
}

// ── Local definition search ─────────────────────────────────────────────────

function findLocalDefinitionLine(content: string, word: string): number | null {
  const safe = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b(?:function|class|const|let|var|interface|type|enum|def|fn|struct|trait)\\s+${safe}\\b`),
    new RegExp(`\\bfunc\\s+(?:\\([^)]*\\)\\s*)?${safe}\\b`), // Go methods/functions
  ];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (patterns.some((p) => p.test(lines[i]))) return i + 1;
  }
  return null;
}

/** Resolve what the caret at `offset` points to. */
export function resolveDefinition(content: string, language: string, offset: number): DefinitionResult {
  const hit = wordInfoAt(content, offset);
  if (!hit) return null;

  // 1) Clicked inside a quoted module path on an import/export line.
  if (/\b(import|require|from)\b/.test(hit.lineText)) {
    const quoted = quotedStringAt(hit.lineText, hit.col);
    if (quoted) return { kind: "import", specifier: quoted, symbol: null };
  }

  if (!hit.word) return null;

  const index = buildImportIndex(content, language);

  // 2) Clicked an imported symbol → jump into the module it came from.
  const fromSpecifier = index.symbolToSpecifier.get(hit.word);
  if (fromSpecifier) return { kind: "import", specifier: fromSpecifier, symbol: hit.word };

  // 3) Clicked a bare module name (e.g. python `import os`).
  if (index.specifiers.has(hit.word)) return { kind: "import", specifier: hit.word, symbol: null };

  // 4) Defined locally in this file.
  const localLine = findLocalDefinitionLine(content, hit.word);
  if (localLine) return { kind: "local", line: localLine };

  return null;
}
