export interface Token {
  text: string;
  type: string;
}

type TokenRule = { pattern: RegExp; type: string };

// ── JavaScript / TypeScript ──────────────────────────────────────────

const typescriptRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /`(?:[^`\\]|\\.)*`/, type: "string" },
  { pattern: /\b(?:true|false|null|undefined|NaN|Infinity)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*([eE][+-]?\d+)?\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: "number" },
  { pattern: /\b0[bB][01]+\b/, type: "number" },
  { pattern: /\b0[oO][0-7]+\b/, type: "number" },
  { pattern: /\b(?:any|boolean|number|string|object|void|null|undefined|never|unknown|symbol|bigint|Array|Promise|Record|Partial|Required|Readonly|Pick|Omit|Exclude|Extract|Map|Set|Date|Error|RegExp)\b/, type: "type" },
  { pattern: /\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|let|new|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/, type: "keyword" },
  { pattern: /\b(?:console|window|document|globalThis|process|module|exports|require|__dirname|__filename|setTimeout|setInterval|clearTimeout|clearInterval|parseInt|parseFloat|isNaN|isFinite|JSON|Math|Object|String|Number|Boolean|Symbol|BigInt|Function|Array|Map|Set|WeakMap|WeakSet|Promise|Proxy|Reflect|URL|URLSearchParams|FormData|Headers|Request|Response|fetch|AbortController)\b/, type: "function" },
  { pattern: /\b[a-zA-Z_$]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── Python ───────────────────────────────────────────────────────────

const pythonRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /"""[\s\S]*?"""/, type: "string" },
  { pattern: /'''[\s\S]*?'''/, type: "string" },
  { pattern: /f"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /f'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /r"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /r'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /\b(?:True|False|None)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*([eE][+-]?\d+)?\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: "number" },
  { pattern: /\b0[bB][01]+\b/, type: "number" },
  { pattern: /\b0[oO][0-7]+\b/, type: "number" },
  { pattern: /\b(?:int|float|str|bool|list|dict|tuple|set|frozenset|bytes|bytearray|complex|type|object|None|Any|Optional|Union|List|Dict|Tuple|Set|Callable|Iterator|Generator)\b/, type: "type" },
  { pattern: /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/, type: "keyword" },
  { pattern: /\b(?:print|len|range|enumerate|zip|map|filter|sorted|reversed|abs|min|max|sum|any|all|isinstance|issubclass|hasattr|getattr|setattr|delattr|property|staticmethod|classmethod|super|open|input|int|float|str|bool|list|dict|tuple|set|type|id|hash|repr|format|vars|dir|help|iter|next|round|pow|divmod|bin|oct|hex|chr|ord)\b/, type: "function" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~@]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── Rust ─────────────────────────────────────────────────────────────

const rustRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /\b(?:true|false)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*([eE][+-]?\d+)?\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: "number" },
  { pattern: /\b0[bB][01]+\b/, type: "number" },
  { pattern: /\b(?:bool|char|f32|f64|i8|i16|i32|i64|i128|isize|str|u8|u16|u32|u64|u128|usize|String|Vec|Box|Rc|Arc|Cell|RefCell|Mutex|RwLock|Option|Result|Some|None|Ok|Err|HashMap|HashSet|BTreeMap|BTreeSet)\b/, type: "type" },
  { pattern: /\b(?:as|async|await|break|const|continue|crate|dyn|else|enum|extern|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|type|unsafe|use|where|while|yield)\b/, type: "keyword" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── Go ───────────────────────────────────────────────────────────────

const goRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /`[^`]*`/, type: "string" },
  { pattern: /\b(?:true|false|iota)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*([eE][+-]?\d+)?\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: "number" },
  { pattern: /\b0[bB][01]+\b/, type: "number" },
  { pattern: /\b(?:bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr|any|comparable)\b/, type: "type" },
  { pattern: /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/, type: "keyword" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~:=]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── C / C++ ──────────────────────────────────────────────────────────

const cCppRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /\b(?:true|false|NULL|nullptr|TRUE|FALSE|BOOL)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*([eE][+-]?\d+)?[fFlLuU]*\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+[uUlL]*\b/, type: "number" },
  { pattern: /\b0[bB][01]+[uUlL]*\b/, type: "number" },
  { pattern: /\b(?:auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|inline|restrict|_Bool|_Complex|_Imaginary)\b/, type: "keyword" },
  { pattern: /\b(?:class|public|private|protected|virtual|override|final|abstract|namespace|template|typename|using|try|catch|throw|new|delete|this|nullptr|operator|friend|explicit|mutable|constexpr|decltype|static_cast|dynamic_cast|reinterpret_cast|const_cast|co_await|co_return|co_yield|concept|requires|consteval|constinit)\b/, type: "keyword" },
  { pattern: /\b(?:int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|size_t|ptrdiff_t|intptr_t|uintptr_t|wchar_t|string|vector|map|set|shared_ptr|unique_ptr|weak_ptr|optional|variant|pair|tuple|array|bool)\b/, type: "type" },
  { pattern: /\b(?:printf|scanf|malloc|free|calloc|realloc|memcpy|memset|strlen|strcmp|strcpy|strcat|std|endl|cout|cin)\b/, type: "function" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:#]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── Java ─────────────────────────────────────────────────────────────

const javaRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /\b(?:true|false|null)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*[dDfFlL]?\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+[lL]?\b/, type: "number" },
  { pattern: /\b0[bB][01]+[lL]?\b/, type: "number" },
  { pattern: /\b(?:boolean|byte|char|double|float|int|long|short|void|var)\b/, type: "keyword" },
  { pattern: /\b(?:abstract|assert|break|case|catch|class|continue|default|do|else|enum|extends|final|finally|for|if|implements|import|instanceof|interface|native|new|package|private|protected|public|return|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|volatile|while|yield|record|sealed|permits)\b/, type: "keyword" },
  { pattern: /\b(?:Boolean|Byte|Character|Class|Double|Enum|Float|Integer|Long|Number|Object|Short|String|Void|Optional|List|Map|Set|Collection|Iterator|Stream|CompletableFuture|ArrayList|HashMap|HashSet|LinkedList|TreeMap|TreeSet|Arrays|Collections|Objects|Math|System|Thread|Runnable|Callable|Exception|RuntimeException|IOException|Console)\b/, type: "type" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── C# ───────────────────────────────────────────────────────────────

const csharpRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /\$"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /\b(?:true|false|null)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*[dDfFmMuU]?\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+[uUlL]*\b/, type: "number" },
  { pattern: /\b0[bB][01]+[uUlL]*\b/, type: "number" },
  { pattern: /\b(?:bool|byte|char|decimal|double|float|int|long|sbyte|short|string|uint|ulong|ushort|void|var|dynamic)\b/, type: "keyword" },
  { pattern: /\b(?:abstract|as|async|await|base|break|case|catch|checked|class|const|continue|default|delegate|do|else|enum|event|explicit|extern|finally|fixed|for|foreach|goto|if|implicit|in|interface|internal|is|lock|namespace|new|object|operator|out|override|params|private|protected|public|readonly|ref|return|sealed|sizeof|stackalloc|static|struct|switch|this|throw|try|typeof|unchecked|unsafe|using|virtual|volatile|while|yield|record|nameof|when|where|get|set|value|add|remove|global|partial)\b/, type: "keyword" },
  { pattern: /\b(?:Boolean|Byte|Char|Decimal|Double|Int16|Int32|Int64|SByte|Single|UInt16|UInt32|UInt64|String|Object|Guid|DateTime|TimeSpan|List|Dictionary|IEnumerable|IList|ICollection|Task|Action|Func|Nullable|Span|Memory|Array|Exception|Console|Math|Convert|Enumerable)\b/, type: "type" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:@]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── Kotlin ───────────────────────────────────────────────────────────

const kotlinRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /\$"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /\b(?:true|false|null)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*[fFL]?\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: "number" },
  { pattern: /\b0[bB][01]+\b/, type: "number" },
  { pattern: /\b(?:Boolean|Byte|Char|Double|Float|Int|Long|Nothing|Short|String|Unit|Any|Array|List|Map|Set|Pair|Triple|Sequence|Iterable|Collection|MutableList|MutableMap|MutableSet|Comparable|Enum|Number)\b/, type: "type" },
  { pattern: /\b(?:abstract|actual|annotation|as|break|by|catch|class|companion|const|constructor|continue|crossinline|data|delegate|do|dynamic|else|enum|expect|external|false|final|finally|for|fun|get|if|in|inline|inner|interface|internal|is|it|lateinit|noinline|object|open|operator|out|override|package|private|protected|public|reified|return|sealed|set|super|suspend|tailrec|this|throw|true|try|typealias|val|var|vararg|when|while)\b/, type: "keyword" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:@]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── Swift ────────────────────────────────────────────────────────────

const swiftRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /\#"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /\b(?:true|false|nil)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*[eE][+-]?\d+\b/, type: "number" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+\.?[0-9a-fA-F]*\b/, type: "number" },
  { pattern: /\b0[bB][01]+\.?[01]*\b/, type: "number" },
  { pattern: /\b(?:Bool|Int|Int8|Int16|Int32|Int64|UInt|UInt8|UInt16|UInt32|UInt64|Float|Double|String|Character|Any|AnyObject|Void|Error|Optional|Array|Dictionary|Set|Range|ClosedRange|Result)\b/, type: "type" },
  { pattern: /\b(?:alias|associatedtype|break|case|catch|class|continue|convenience|default|defer|deinit|didSet|do|dynamic|else|enum|extension|fallthrough|false|fileprivate|final|for|func|guard|if|import|in|indirect|init|inout|internal|is|lazy|let|mutating|none|nonmutating|open|operator|optional|override|postfix|precedencegroup|prefix|private|protocol|public|repeat|required|rethrows|return|self|Self|some|static|struct|subscript|super|switch|throw|throws|true|try|typealias|unowned|var|weak|where|while|willSet)\b/, type: "keyword" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── Zig ──────────────────────────────────────────────────────────────

const zigRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /\b(?:true|false|null)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*([eE][+-]?\d+)?\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+\.?[0-9a-fA-F]*\b/, type: "number" },
  { pattern: /\b0[bB][01]+\.?[01]*\b/, type: "number" },
  { pattern: /\b0[oO][0-7]+\b/, type: "number" },
  { pattern: /\b(?:bool|f128|f16|f32|f64|f80|i128|i16|i32|i64|i8|isize|u128|u16|u32|u64|u8|usize|anyerror|anyframe|anyopaque|noreturn|type|void)\b/, type: "type" },
  { pattern: /\b(?:align|allowzero|and|anyframe|anytype|asm|async|await|break|catch|comptime|const|continue|defer|else|enum|errdefer|export|extern|fn|for|if|inline|noalias|nosuspend|or|orelse|packed|pub|resume|return|struct|suspend|switch|this|try|undefined|union|unreachable|var|volatile|while)\b/, type: "keyword" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── HTML / XML / SVG ─────────────────────────────────────────────────

const htmlRules: TokenRule[] = [
  { pattern: /<!--[\s\S]*?-->/, type: "comment" },
  { pattern: /<\/?[\w-]+/, type: "tag" },
  { pattern: /\/?>/, type: "tag" },
  { pattern: /\b[\w-]+(?==)/, type: "attribute" },
  { pattern: /"[^"]*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
];

// ── CSS / SCSS ───────────────────────────────────────────────────────

const cssRules: TokenRule[] = [
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /#[0-9a-fA-F]{3,8}\b/, type: "number" },
  { pattern: /\b\d+\.?\d*(px|em|rem|%|vh|vw|vmin|vmax|deg|s|ms|fr)\b/, type: "number" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: "string" },
  { pattern: /@[\w-]+/, type: "keyword" },
  { pattern: /\b(?:display|position|top|right|bottom|left|width|height|min-width|min-height|max-width|max-height|margin|padding|border|background|color|font|text|line|letter|word|white|overflow|z-index|opacity|transform|transition|animation|flex|grid|gap|align|justify|order|cursor|pointer|outline|box-shadow|text-shadow|filter|backdrop|clip|resize|content|visibility|float|clear)\b/, type: "function" },
  { pattern: /\b(?:important|inherit|initial|unset|revert|auto|none|normal|bold|italic)\b/, type: "keyword" },
  { pattern: /\.[\w-]+/, type: "type" },
  { pattern: /#[\w-]+/, type: "tag" },
  { pattern: /:[\w-]+/, type: "attribute" },
  { pattern: /[{}();:,]/, type: "bracket" },
];

// ── JSON ─────────────────────────────────────────────────────────────

const jsonRules: TokenRule[] = [
  { pattern: /"[^"]*"\s*(?=:)/, type: "attribute" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /\b(?:true|false|null)\b/, type: "constant" },
  { pattern: /\b-?\d+\.?\d*([eE][+-]?\d+)?\b/, type: "number" },
  { pattern: /[{}[\]]/, type: "bracket" },
  { pattern: /[:]/, type: "operator" },
  { pattern: /[,]/, type: "operator" },
];

// ── Shell / Bash ─────────────────────────────────────────────────────

const shellRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /\$[\w{][\w}]*|"\$[\w{][\w}]*"/, type: "function" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(?:if|then|else|elif|fi|for|in|do|done|while|until|case|esac|function|return|exit|local|export|source|alias|unalias|set|unset|shift|readonly|declare|typeset|trap|wait|exec|eval|true|false)\b/, type: "keyword" },
  { pattern: /\b(?:echo|printf|read|test|cd|pwd|ls|cp|mv|rm|mkdir|rmdir|chmod|chown|grep|sed|awk|find|xargs|sort|uniq|wc|head|tail|cat|less|more|tar|gzip|gunzip|curl|wget|ssh|scp|git|docker|npm|node|python|pip)\b/, type: "function" },
  { pattern: /\b\d+\b/, type: "number" },
  { pattern: /[|;&<>]+/, type: "operator" },
];

// ── YAML ─────────────────────────────────────────────────────────────

const yamlRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(?:true|false|null|yes|no|on|off)\b/i, type: "constant" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /^[\w.-]+(?=\s*:)/, type: "attribute" },
  { pattern: /---|\.\.\./, type: "operator" },
  { pattern: /[[\]{}]/, type: "bracket" },
  { pattern: /[:,]/, type: "operator" },
];

// ── Dockerfile ───────────────────────────────────────────────────────

const dockerfileRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /^(?:FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/i, type: "keyword" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b\d+\b/, type: "number" },
];

// ── SQL ──────────────────────────────────────────────────────────────

const sqlRules: TokenRule[] = [
  { pattern: /--[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|EXISTS|CASE|WHEN|THEN|ELSE|END|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|CHECK|UNIQUE|AUTO_INCREMENT|VARCHAR|INTEGER|TEXT|BOOLEAN|TIMESTAMP|DATE|FLOAT|DOUBLE|DECIMAL|CHAR|BLOB)\b/i, type: "keyword" },
  { pattern: /\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|CONVERT|TRIM|UPPER|LOWER|SUBSTRING|LENGTH|REPLACE|NOW|CURRENT_TIMESTAMP|CURRENT_DATE|EXTRACT|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|FIRST_VALUE|LAST_VALUE|OVER|PARTITION)\b/i, type: "function" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /[(),;.]+/, type: "bracket" },
];

// ── Markdown ─────────────────────────────────────────────────────────

const markdownRules: TokenRule[] = [
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

// ── TOML ─────────────────────────────────────────────────────────────

const tomlRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(?:true|false)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /\[[\w.-]+\]/, type: "bracket" },
  { pattern: /[\w.-]+(?=\s*=)/, type: "attribute" },
  { pattern: /[=,]/, type: "operator" },
];

// ── INI ──────────────────────────────────────────────────────────────

const iniRules: TokenRule[] = [
  { pattern: /;[^\n]*/, type: "comment" },
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /\[[\w.-]+\]/, type: "bracket" },
  { pattern: /[\w.-]+(?=\s*=)/, type: "attribute" },
  { pattern: /=.*/, type: "string" },
];

// ── Lua ──────────────────────────────────────────────────────────────

const luaRules: TokenRule[] = [
  { pattern: /--[^\n]*/, type: "comment" },
  { pattern: /--\[\[[\s\S]*?\]\]/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(?:true|false|nil)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /\b(?:and|break|do|else|elseif|end|for|function|goto|if|in|local|not|or|repeat|return|then|until|while)\b/, type: "keyword" },
  { pattern: /\b(?:print|type|tostring|tonumber|error|pcall|xpcall|require|module|setmetatable|getmetatable|rawget|rawset|rawequal|rawlen|select|ipairs|pairs|next|unpack|table|string|math|io|os|coroutine|debug|load|loadfile|dofile)\b/, type: "function" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%^#<>=~]+/, type: "operator" },
];

// ── Terraform / HCL ─────────────────────────────────────────────────

const terraformRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /\b(?:true|false|null)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /\b(?:resource|data|variable|output|locals|module|provider|provisioner|connection|backend|terraform|required_providers|required_version|import|moved|removed|check)\b/, type: "keyword" },
  { pattern: /\b(?:string|number|bool|list|map|set|object|tuple|any)\b/, type: "type" },
  { pattern: /\b(?:var|local|module|data|each|count|self|path|terraform|workspace|uuid|file|fileexists|templatefile)\b/, type: "function" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*[=(])/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── Ruby ─────────────────────────────────────────────────────────────

const rubyRules: TokenRule[] = [
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /=begin[\s\S]*?=end/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /:(?:\w+)/, type: "constant" },
  { pattern: /\b(?:true|false|nil)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: "number" },
  { pattern: /\b0[bB][01]+\b/, type: "number" },
  { pattern: /\b(?:Array|Boolean|Class|Continuation|Dir|Encoding|Enumerator|File|Hash|IO|Integer|Kernel|Method|Module|NilClass|Numeric|Object|Proc|Range|Regexp|String|Struct|Symbol|Thread|ThreadGroup|Time|TrueClass|FalseClass)\b/, type: "type" },
  { pattern: /\b(?:BEGIN|END|alias|and|begin|break|case|class|def|defined\?|do|else|elsif|end|ensure|for|if|in|module|next|not|or|redo|rescue|retry|return|self|super|then|undef|unless|until|when|while|yield)\b/, type: "keyword" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*[({])/, type: "function" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── PHP ──────────────────────────────────────────────────────────────

const phpRules: TokenRule[] = [
  { pattern: /\/\/[^\n]*/, type: "comment" },
  { pattern: /\/\*[\s\S]*?\*\//, type: "comment" },
  { pattern: /#[^\n]*/, type: "comment" },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: "string" },
  { pattern: /'[^']*'/, type: "string" },
  { pattern: /\b(?:true|false|null|TRUE|FALSE|NULL)\b/, type: "constant" },
  { pattern: /\b\d+\.?\d*\b/, type: "number" },
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: "number" },
  { pattern: /\b0[bB][01]+\b/, type: "number" },
  { pattern: /\b(?:array|bool|callable|class|const|extends|final|float|int|interface|isset|list|null|object|parent|self|static|string|void|var|xor)\b/, type: "keyword" },
  { pattern: /\b(?:abstract|and|as|break|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|or|print|private|protected|public|readonly|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield)\b/, type: "keyword" },
  { pattern: /\b(?:stdClass|Exception|PDO|PDOStatement|DateTime|DateTimeImmutable|DateInterval|DateTimeZone|DOMDocument|DOMElement|DOMXPath|FilesystemIterator|DirectoryIterator|GlobIterator|RecursiveDirectoryIterator|SplFileInfo|SplFileObject|PDOException|InvalidArgumentException|RuntimeException|LogicException|BadMethodCallException|LengthException|OutOfRangeException|OverflowException|UnderflowException|RangeException|OverflowException|PDOException|ErrorException|Error|TypeError|ParseError|ArithmeticError)\b/, type: "type" },
  { pattern: /\b[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
  { pattern: /\$\w+/, type: "variable" },
  { pattern: /[{}()\[\]]/, type: "bracket" },
  { pattern: /[+\-*/%=<>!&|^~?:@]+/, type: "operator" },
  { pattern: /[;,.]/, type: "operator" },
];

// ── Language lookup ──────────────────────────────────────────────────

const rulesCache = new Map<string, TokenRule[]>();

const LANG_MAP: Record<string, TokenRule[]> = {
  typescript: typescriptRules,
  typescriptreact: typescriptRules,
  ts: typescriptRules,
  tsx: typescriptRules,
  javascript: typescriptRules,
  javascriptreact: typescriptRules,
  js: typescriptRules,
  jsx: typescriptRules,
  mjs: typescriptRules,
  cjs: typescriptRules,
  python: pythonRules,
  py: pythonRules,
  pyw: pythonRules,
  rust: rustRules,
  rs: rustRules,
  go: goRules,
  golang: goRules,
  c: cCppRules,
  h: cCppRules,
  cpp: cCppRules,
  "c++": cCppRules,
  cc: cCppRules,
  cxx: cCppRules,
  hpp: cCppRules,
  java: javaRules,
  csharp: csharpRules,
  "c#": csharpRules,
  cs: csharpRules,
  kotlin: kotlinRules,
  kt: kotlinRules,
  kts: kotlinRules,
  swift: swiftRules,
  zig: zigRules,
  html: htmlRules,
  htm: htmlRules,
  xml: htmlRules,
  svg: htmlRules,
  css: cssRules,
  scss: cssRules,
  less: cssRules,
  json: jsonRules,
  jsonc: jsonRules,
  shell: shellRules,
  bash: shellRules,
  sh: shellRules,
  zsh: shellRules,
  yaml: yamlRules,
  yml: yamlRules,
  dockerfile: dockerfileRules,
  docker: dockerfileRules,
  sql: sqlRules,
  markdown: markdownRules,
  md: markdownRules,
  mdx: markdownRules,
  toml: tomlRules,
  ini: iniRules,
  lua: luaRules,
  terraform: terraformRules,
  hcl: terraformRules,
  tf: terraformRules,
  ruby: rubyRules,
  rb: rubyRules,
  php: phpRules,
};

export function detectLanguage(filePath: string): string {
  const name = filePath.split(/[\\/]/).pop() ?? filePath;

  if (/^dockerfile$/i.test(name)) return "dockerfile";
  if (/^makefile$/i.test(name)) return "shell";
  if (/^\.env$/i.test(name) || /^\.env\./i.test(name)) return "shell";
  if (/^cargo\.toml$/i.test(name)) return "toml";
  if (/^go\.mod$/i.test(name)) return "go";
  if (/^gemfile$/i.test(name)) return "ruby";
  if (/^rakefile$/i.test(name)) return "ruby";

  const dotIndex = name.lastIndexOf(".");
  if (dotIndex !== -1) {
    const ext = name.slice(dotIndex).toLowerCase();
    const lang = LANG_MAP[ext.slice(1)];
    if (lang) return lang === typescriptRules ? (ext === ".ts" || ext === ".mts" ? "typescript" : "javascript") : Object.entries(LANG_MAP).find(([, r]) => r === lang)?.[0] ?? "text";
  }

  return "text";
}

function getRules(language: string): TokenRule[] {
  const cached = rulesCache.get(language);
  if (cached) return cached;

  const rules = LANG_MAP[language] ?? [];
  if (rules.length > 0) {
    rulesCache.set(language, rules);
  }
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

const lineCache = new Map<string, Token[]>();
const LINE_CACHE_MAX = 8000;

function tokenizeLineCached(line: string, language: string, rules: TokenRule[]): Token[] {
  if (rules.length === 0) return [{ text: line, type: "plain" }];
  const key = language + " " + line;
  const hit = lineCache.get(key);
  if (hit) return hit;
  const tokens = tokenizeLine(line, rules);
  if (lineCache.size >= LINE_CACHE_MAX) lineCache.clear();
  lineCache.set(key, tokens);
  return tokens;
}

// ── Bracket matching ─────────────────────────────────────────────────

export interface BracketPosition {
  line: number;
  col: number;
  char: string;
}

const OPEN_BRACKETS = new Set(["(", "[", "{"]);
const CLOSE_BRACKETS = new Set([")", "]", "}"]);
const BRACKET_PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const REVERSE_BRACKETS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

export function findMatchingBracket(
  text: string,
  cursorOffset: number,
): BracketPosition | null {
  const charAtCursor = text[cursorOffset];
  if (!charAtCursor) return null;

  let openChar: string;
  let closeChar: string;
  let searchForward: boolean;

  if (OPEN_BRACKETS.has(charAtCursor)) {
    openChar = charAtCursor;
    closeChar = BRACKET_PAIRS[charAtCursor];
    searchForward = true;
  } else if (CLOSE_BRACKETS.has(charAtCursor)) {
    closeChar = charAtCursor;
    openChar = REVERSE_BRACKETS[charAtCursor];
    searchForward = false;
  } else {
    return null;
  }

  let depth = 0;
  let pos = cursorOffset;

  if (searchForward) {
    while (pos < text.length) {
      const ch = text[pos];
      if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          return offsetToPosition(text, pos);
        }
      }
      pos++;
    }
  } else {
    while (pos >= 0) {
      const ch = text[pos];
      if (ch === closeChar) depth++;
      else if (ch === openChar) {
        depth--;
        if (depth === 0) {
          return offsetToPosition(text, pos);
        }
      }
      pos--;
    }
  }

  return null;
}

function offsetToPosition(text: string, offset: number): BracketPosition {
  let line = 0;
  let col = 0;
  for (let i = 0; i < offset; i++) {
    if (text[i] === "\n") {
      line++;
      col = 0;
    } else {
      col++;
    }
  }
  return { line, col, char: text[offset] };
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
