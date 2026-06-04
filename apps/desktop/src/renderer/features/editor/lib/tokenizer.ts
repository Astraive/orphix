export interface Token {
  text: string;
  type: string;
}

type TokenRule = { pattern: RegExp; type: string };

// ── Language-specific rule sets ───────────────────────────────────────

const JS_KEYWORDS = /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|let|new|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/;
const JS_TYPES = /\b(any|boolean|number|string|object|void|null|undefined|never|unknown|symbol|bigint|Array|Promise|Record|Partial|Required|Readonly|Pick|Omit|Exclude|Extract|Map|Set|Date|Error|RegExp)\b/;
const JS_BUILTINS = /\b(console|window|document|globalThis|process|module|exports|require|__dirname|__filename|setTimeout|setInterval|clearTimeout|clearInterval|parseInt|parseFloat|isNaN|isFinite|JSON|Math|Object|String|Number|Boolean|Symbol|BigInt|Function|Array|Map|Set|WeakMap|WeakSet|Promise|Proxy|Reflect|URL|URLSearchParams|FormData|Headers|Request|Response|fetch|AbortController)\b/;

const PYTHON_KEYWORDS = /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|True|False|None)\b/;
const PYTHON_TYPES = /\b(int|float|str|bool|list|dict|tuple|set|frozenset|bytes|bytearray|complex|type|object|None|Any|Optional|Union|List|Dict|Tuple|Set|Callable|Iterator|Generator)\b/;
const PYTHON_BUILTINS = /\b(print|len|range|enumerate|zip|map|filter|sorted|reversed|abs|min|max|sum|any|all|isinstance|issubclass|hasattr|getattr|setattr|delattr|property|staticmethod|classmethod|super|open|input|int|float|str|bool|list|dict|tuple|set|type|id|hash|repr|format|vars|dir|help|iter|next|round|pow|divmod|bin|oct|hex|chr|ord)\b/;

const RUST_KEYWORDS = /\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while|yield)\b/;
const RUST_TYPES = /\b(bool|char|f32|f64|i8|i16|i32|i64|i128|isize|str|u8|u16|u32|u64|u128|usize|String|Vec|Box|Rc|Arc|Cell|RefCell|Mutex|RwLock|Option|Result|Some|None|Ok|Err|HashMap|HashSet|BTreeMap|BTreeSet)\b/;

const GO_KEYWORDS = /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/;
const GO_TYPES = /\b(bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr|any|comparable)\b/;

const CSS_KEYWORDS = /\b(important|inherit|initial|unset|revert|auto|none|normal|bold|italic)\b/;
const CSS_PROPERTIES = /\b(display|position|top|right|bottom|left|width|height|min-width|min-height|max-width|max-height|margin|padding|border|background|color|font|text|line|letter|word|white|overflow|z-index|opacity|transform|transition|animation|flex|grid|gap|align|justify|order|cursor|pointer|outline|box-shadow|text-shadow|filter|backdrop|clip|resize|content|visibility|float|clear)\b/;

function makeLangRules(
  keywords: RegExp,
  types: RegExp,
  builtins?: RegExp,
): TokenRule[] {
  const rules: TokenRule[] = [
    { pattern: /\/\/[^\n]*/, type: "comment" },
    { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
    { pattern: /#[^\n]*/, type: "comment" },
    { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
    { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
    { pattern: /`(?:[^`\\]|\\.)*`/, type: "string" },
    { pattern: /f"(?:[^"\\]|\\.)*"/, type: "string" },
    { pattern: /r"(?:[^"\\]|\\.)*"/, type: "string" },
    { pattern: /\b\d+\.?\d*([eE][+-]?\d+)?\b/, type: "number" },
    { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: "number" },
    { pattern: /\b0[bB][01]+\b/, type: "number" },
    { pattern: /\b0[oO][0-7]+\b/, type: "number" },
    { pattern: types, type: "type" },
    { pattern: keywords, type: "keyword" },
  ];
  if (builtins) {
    rules.push({ pattern: builtins, type: "function" });
  }
  rules.push(
    { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
    { pattern: /[{}()\[\];,.]/, type: "operator" },
    { pattern: /[+\-*/%=<>!&|^~?:]+/, type: "operator" },
  );
  return rules;
}

const htmlRules: TokenRule[] = [
  { pattern: /<!--[\s\S]*?-->/, type: "comment" },
  { pattern: /<\/?[\w-]+/, type: "tag" },
  { pattern: /\/?>/, type: "tag" },
  { pattern: /\b[\w-]+(?==)/, type: "attribute" },
  { pattern: /"[^"]*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
];

const cssRules: TokenRule[] = [
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /#[0-9a-fA-F]{3,8}\b/, type: "number" },
  { pattern: /\b\d+\.?\d*(px|em|rem|%|vh|vw|vmin|vmax|deg|s|ms)\b/, type: "number" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /@[\w-]+/, type: "keyword" },
  { pattern: CSS_PROPERTIES, type: "function" },
  { pattern: CSS_KEYWORDS, type: "keyword" },
  { pattern: /\.[\w-]+/, type: "type" },
  { pattern: /#[\w-]+/, type: "tag" },
  { pattern: /:[\w-]+/, type: "attribute" },
  { pattern: /[{}();:,]/, type: "operator" },
];

const jsonRules: TokenRule[] = [
  { pattern: /"[^"]*"\s*(?=:)/, type: "attribute" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /\b(true|false|null)\b/, type: "keyword" },
  { pattern: /\b-?\d+\.?\d*([eE][+-]?\d+)?\b/, type: "number" },
  { pattern: /[{}[\],:]/, type: "operator" },
];

const shellRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /\$[\w{][\w}]*|"\$[\w{][\w}]*"/, type: "function" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(if|then|else|elif|fi|for|in|do|done|while|until|case|esac|function|return|exit|local|export|source|alias|unalias|set|unset|shift|readonly|declare|typeset|trap|wait|exec|eval|true|false)\b/, type: "keyword" },
  { pattern: /\b(echo|printf|read|test|cd|pwd|ls|cp|mv|rm|mkdir|rmdir|chmod|chown|grep|sed|awk|find|xargs|sort|uniq|wc|head|tail|cat|less|more|tar|gzip|gunzip|curl|wget|ssh|scp|git|docker|npm|node|python|pip)\b/, type: "function" },
  { pattern: /\b\d+\b/, type: "number" },
  { pattern: /[|;&<>]+/, type: "operator" },
];

const yamlRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(true|false|null|yes|no|on|off)\b/i, type: "keyword" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /^[\w.-]+(?=\s*:)/, type: "attribute" },
  { pattern: /---|\.\.\./, type: "operator" },
  { pattern: /[:,\[\]{}]/, type: "operator" },
];

const dockerfileRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /^FROM|^RUN|^CMD|^LABEL|^MAINTAINER|^EXPOSE|^ENV|^ADD|^COPY|^ENTRYPOINT|^VOLUME|^USER|^WORKDIR|^ARG|^ONBUILD|^STOPSIGNAL|^HEALTHCHECK|^SHELL/i, type: "keyword" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b\d+\b/, type: "number" },
];

const sqlRules: TokenRule[] = [
  { pattern: /--[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|EXISTS|CASE|WHEN|THEN|ELSE|END|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|CHECK|UNIQUE|AUTO_INCREMENT|SERIAL|BIGSERIAL|VARCHAR|INTEGER|TEXT|BOOLEAN|TIMESTAMP|DATE|FLOAT|DOUBLE|DECIMAL|CHAR|BLOB|CLOB)\b/i, type: "keyword" },
  { pattern: /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|CONVERT|TRIM|UPPER|LOWER|SUBSTRING|LENGTH|REPLACE|NOW|CURRENT_TIMESTAMP|CURRENT_DATE|EXTRACT|DATE_PART|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|FIRST_VALUE|LAST_VALUE|OVER|PARTITION)\b/i, type: "function" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /[(),;.]+/, type: "operator" },
];

const mdRules: TokenRule[] = [
  { pattern: /^#{1,6}\s.*/, type: "keyword" },
  { pattern: /\*\*[^*]+\*\*/, type: "function" },
  { pattern: /\*[^*]+\*/, type: "type" },
  { pattern: /`[^`]+`/, type: "string" },
  { pattern: /```[\s\S]*?```/, type: "string" },
  { pattern: /\[([^\]]+)\]\([^)]+\)/, type: "tag" },
  { pattern: /^[-*+]\s/, type: "operator" },
  { pattern: /^\d+\.\s/, type: "number" },
  { pattern: /^>\s.*/, type: "comment" },
  { pattern: /---/, type: "comment" },
];

// ── Rule lookup (cached) ─────────────────────────────────────────────

const rulesCache = new Map<string, TokenRule[]>();

const cCppRules = makeLangRules(
  /\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|inline|restrict|_Bool|_Complex|_Imaginary|class|public|private|protected|virtual|override|final|abstract|namespace|template|typename|using|try|catch|throw|new|delete|this|nullptr|true|false|operator|friend|explicit|mutable|constexpr|decltype|nullptr|static_cast|dynamic_cast|reinterpret_cast|const_cast)\b/,
  /\b(int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|size_t|ptrdiff_t|intptr_t|uintptr_t|wchar_t|char16_t|char32_t|string|vector|map|set|unordered_map|unordered_set|pair|tuple|array|shared_ptr|unique_ptr|weak_ptr|optional|variant|any|nullptr_t|bool)\b/,
);

const javaRules = makeLangRules(
  /\b(abstract|assert|boolean|break|byte|case|catch|char|class|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|true|false|var|record|sealed|permits|yield|switch)\b/,
  /\b(Boolean|Byte|Character|Class|Double|Enum|Float|Integer|Long|Number|Object|Short|String|Void|Optional|List|Map|Set|Collection|Iterator|Stream|CompletableFuture|ArrayList|HashMap|HashSet|LinkedList|TreeMap|TreeSet|Arrays|Collections|Objects|Math|System|Thread|Runnable|Callable|Exception|RuntimeException|IOException|IllegalArgumentException|NullPointerException)\b/,
);

const csharpRules = makeLangRules(
  /\b(abstract|as|async|await|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|var|virtual|void|volatile|while|yield|record|nameof|when|where|get|set|value|add|remove|global|partial)\b/,
  /\b(Boolean|Byte|Char|Decimal|Double|Int16|Int32|Int64|SByte|Single|UInt16|UInt32|UInt64|String|Object|Guid|DateTime|TimeSpan|List|Dictionary|IEnumerable|IList|ICollection|Task|Action|Func|Nullable|Span|Memory|Array|Exception|ArgumentException|InvalidOperationException|NullReferenceException|Console|Math|Convert|Enumerable)\b/,
);

const tomlRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(true|false)\b/, type: "keyword" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /\[[\w.-]+\]/, type: "tag" },
  { pattern: /[\w.-]+(?=\s*=)/, type: "attribute" },
  { pattern: /[=,]/, type: "operator" },
];

const iniRules: TokenRule[] = [
  { pattern: /;[^\n]*/, type: "comment" },
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /\[[\w.-]+\]/, type: "tag" },
  { pattern: /[\w.-]+(?=\s*=)/, type: "attribute" },
  { pattern: /=.*/, type: "string" },
];

const luaRules: TokenRule[] = [
  { pattern: /--[^\n]*/, type: "comment" },
  { pattern: /--\[\[[\s\S]*?\]\]/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/, type: "keyword" },
  { pattern: /\b(print|type|tostring|tonumber|error|pcall|xpcall|require|module|setmetatable|getmetatable|rawget|rawset|rawequal|rawlen|select|ipairs|pairs|next|unpack|table|string|math|io|os|coroutine|debug|load|loadfile|dofile)\b/, type: "function" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /[+\-*/%^#<>=~]+/, type: "operator" },
];

function getRules(language: string): TokenRule[] {
  const cached = rulesCache.get(language);
  if (cached) return cached;

  let rules: TokenRule[];
  switch (language) {
    case "typescript":
    case "javascript":
      rules = makeLangRules(JS_KEYWORDS, JS_TYPES, JS_BUILTINS); break;
    case "python":
      rules = makeLangRules(PYTHON_KEYWORDS, PYTHON_TYPES, PYTHON_BUILTINS); break;
    case "rust":
      rules = makeLangRules(RUST_KEYWORDS, RUST_TYPES); break;
    case "go":
      rules = makeLangRules(GO_KEYWORDS, GO_TYPES); break;
    case "html": case "xml": case "svg":
      rules = htmlRules; break;
    case "css":
      rules = cssRules; break;
    case "json":
      rules = jsonRules; break;
    case "shell":
      rules = shellRules; break;
    case "yaml":
      rules = yamlRules; break;
    case "dockerfile":
      rules = dockerfileRules; break;
    case "sql":
      rules = sqlRules; break;
    case "markdown":
      rules = mdRules; break;
    case "c": case "cpp":
      rules = cCppRules; break;
    case "java":
      rules = javaRules; break;
    case "csharp":
      rules = csharpRules; break;
    case "toml":
      rules = tomlRules; break;
    case "ini":
      rules = iniRules; break;
    case "lua":
      rules = luaRules; break;
    default:
      rules = []; break;
  }

  rulesCache.set(language, rules);
  return rules;
}

// ── Tokenize one line ────────────────────────────────────────────────

function tokenizeLine(line: string, rules: TokenRule[]): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    let bestMatch: { index: number; length: number; type: string } | null = null;

    for (const rule of rules) {
      const match = remaining.match(rule.pattern);
      if (match && match.index !== undefined) {
        if (!bestMatch || match.index < bestMatch.index ||
            (match.index === bestMatch.index && match[0].length > bestMatch.length)) {
          bestMatch = { index: match.index, length: match[0].length, type: rule.type };
        }
      }
    }

    if (bestMatch && bestMatch.index < remaining.length) {
      if (bestMatch.index > 0) {
        tokens.push({ text: remaining.slice(0, bestMatch.index), type: "plain" });
      }
      tokens.push({ text: remaining.slice(bestMatch.index, bestMatch.index + bestMatch.length), type: bestMatch.type });
      remaining = remaining.slice(bestMatch.index + bestMatch.length);
    } else {
      tokens.push({ text: remaining, type: "plain" });
      break;
    }
  }

  return tokens;
}

// ── Line-level cache ─────────────────────────────────────────────────
// Tokenizing is line-independent here, so identical lines (blank lines, repeated
// patterns) and re-renders/scrolls over the same viewport reuse cached results
// instead of re-running every regex. Keyed by language + line text.

const lineCache = new Map<string, Token[]>();
const LINE_CACHE_MAX = 8000;

function tokenizeLineCached(line: string, language: string, rules: TokenRule[]): Token[] {
  if (rules.length === 0) return [{ text: line, type: "plain" }];
  const key = language + " " + line;
  const hit = lineCache.get(key);
  if (hit) return hit;
  const tokens = tokenizeLine(line, rules);
  if (lineCache.size >= LINE_CACHE_MAX) lineCache.clear();
  lineCache.set(key, tokens);
  return tokens;
}

// ── Public API ───────────────────────────────────────────────────────

export function tokenize(text: string, language: string): Token[][] {
  const rules = getRules(language);
  const lines = text.split("\n");
  return lines.map((line) => tokenizeLineCached(line, language, rules));
}

/** Tokenize only a range of lines (for virtualized rendering) */
export function tokenizeRange(text: string, language: string, startLine: number, endLine: number): Token[][] {
  const rules = getRules(language);
  const lines = text.split("\n");
  const start = Math.max(0, startLine);
  const end = Math.min(lines.length, endLine);
  const result: Token[][] = [];
  for (let i = start; i < end; i++) {
    result.push(tokenizeLineCached(lines[i], language, rules));
  }
  return result;
}

/** Get total line count without splitting */
export function getLineCount(text: string): number {
  if (text.length === 0) return 1;
  let count = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}
