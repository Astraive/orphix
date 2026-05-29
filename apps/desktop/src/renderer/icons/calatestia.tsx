import type { IconComponent, IconPack } from "./types";

// ── Base SVG wrapper ──

const Icon: React.FC<{ color: string; children: React.ReactNode; className?: string; size?: number }> = ({
  color,
  children,
  className,
  size = 16,
}) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    {children}
  </svg>
);

// ── File type icons ──

const TypeScriptIcon: IconComponent = ({ className, size }) => (
  <Icon color="#3178C6" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#3178C6" />
    <text x="8" y="11.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">TS</text>
  </Icon>
);

const JavaScriptIcon: IconComponent = ({ className, size }) => (
  <Icon color="#F7DF1E" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#F7DF1E" />
    <text x="8" y="11.5" textAnchor="middle" fill="#323330" fontSize="8" fontWeight="bold" fontFamily="sans-serif">JS</text>
  </Icon>
);

const ReactIcon: IconComponent = ({ className, size }) => (
  <Icon color="#61DAFB" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#20232A" />
    <circle cx="8" cy="8" r="2.5" stroke="#61DAFB" strokeWidth="0.8" fill="none" />
    <ellipse cx="8" cy="8" rx="5" ry="2" stroke="#61DAFB" strokeWidth="0.6" fill="none" />
    <ellipse cx="8" cy="8" rx="5" ry="2" stroke="#61DAFB" strokeWidth="0.6" fill="none" transform="rotate(60 8 8)" />
    <ellipse cx="8" cy="8" rx="5" ry="2" stroke="#61DAFB" strokeWidth="0.6" fill="none" transform="rotate(120 8 8)" />
  </Icon>
);

const RustIcon: IconComponent = ({ className, size }) => (
  <Icon color="#DEA584" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <text x="8" y="11.5" textAnchor="middle" fill="#DEA584" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Rs</text>
  </Icon>
);

const JsonIcon: IconComponent = ({ className, size }) => (
  <Icon color="#CBBA3C" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <text x="8" y="11" textAnchor="middle" fill="#CBBA3C" fontSize="7" fontFamily="monospace">{"{}"}</text>
  </Icon>
);

const HtmlIcon: IconComponent = ({ className, size }) => (
  <Icon color="#E44D26" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#E44D26" />
    <text x="8" y="11" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="monospace">&lt;/&gt;</text>
  </Icon>
);

const CssIcon: IconComponent = ({ className, size }) => (
  <Icon color="#264DE4" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#264DE4" />
    <text x="8" y="11" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="monospace">#</text>
  </Icon>
);

const MarkdownIcon: IconComponent = ({ className, size }) => (
  <Icon color="#519ABA" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <text x="8" y="11" textAnchor="middle" fill="#519ABA" fontSize="7" fontWeight="bold" fontFamily="monospace">M</text>
  </Icon>
);

const PythonIcon: IconComponent = ({ className, size }) => (
  <Icon color="#3776AB" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#3776AB" />
    <text x="8" y="11.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Py</text>
  </Icon>
);

const GoIcon: IconComponent = ({ className, size }) => (
  <Icon color="#00ADD8" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <text x="8" y="11" textAnchor="middle" fill="#00ADD8" fontSize="7" fontWeight="bold" fontFamily="monospace">Go</text>
  </Icon>
);

const TomlIcon: IconComponent = ({ className, size }) => (
  <Icon color="#9C4121" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <text x="8" y="11" textAnchor="middle" fill="#9C4121" fontSize="7" fontFamily="monospace">T</text>
  </Icon>
);

const YamlIcon: IconComponent = ({ className, size }) => (
  <Icon color="#CB171E" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <text x="8" y="11" textAnchor="middle" fill="#CB171E" fontSize="7" fontFamily="monospace">Y</text>
  </Icon>
);

const ShellIcon: IconComponent = ({ className, size }) => (
  <Icon color="#89E051" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <text x="8" y="11" textAnchor="middle" fill="#89E051" fontSize="8" fontFamily="monospace">&gt;_</text>
  </Icon>
);

const ImageIcon: IconComponent = ({ className, size }) => (
  <Icon color="#A074C4" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <circle cx="5.5" cy="5.5" r="1.5" fill="#A074C4" />
    <path d="M2 12l3.5-4 2.5 3 2-2.5L14 12H2z" fill="#A074C4" />
  </Icon>
);

const GitIcon: IconComponent = ({ className, size }) => (
  <Icon color="#F05032" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <circle cx="8" cy="8" r="3" stroke="#F05032" strokeWidth="1.2" fill="none" />
    <circle cx="8" cy="5" r="1" fill="#F05032" />
    <circle cx="10.5" cy="9.5" r="1" fill="#F05032" />
    <circle cx="5.5" cy="9.5" r="1" fill="#F05032" />
  </Icon>
);

const LockIcon: IconComponent = ({ className, size }) => (
  <Icon color="#6C7086" className={className} size={size}>
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#2B2B2B" />
    <rect x="5" y="7" width="6" height="5" rx="1" fill="#6C7086" />
    <path d="M6 7V5a2 2 0 114 0v2" stroke="#6C7086" strokeWidth="1" fill="none" />
  </Icon>
);

const DefaultFileIcon: IconComponent = ({ className, size }) => (
  <Icon color="#6C7086" className={className} size={size}>
    <rect x="2" y="1" width="10" height="14" rx="1" fill="#2B2B2B" stroke="#6C7086" strokeWidth="0.6" />
    <path d="M8 1v3h3" stroke="#6C7086" strokeWidth="0.6" fill="none" />
  </Icon>
);

// ── Folder icons ──

const FolderClosedIcon: IconComponent = ({ className, size }) => (
  <Icon color="#E8A838" className={className} size={size}>
    <path d="M1 3.5A1.5 1.5 0 012.5 2h3.172a1.5 1.5 0 011.06.44l.622.62a.5.5 0 00.354.14H13.5A1.5 1.5 0 0115 4.7V12.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z" fill="#E8A838" />
  </Icon>
);

const FolderOpenIcon: IconComponent = ({ className, size }) => (
  <Icon color="#E8A838" className={className} size={size}>
    <path d="M1 3.5A1.5 1.5 0 012.5 2h3.172a1.5 1.5 0 011.06.44l.622.62a.5.5 0 00.354.14H13.5A1.5 1.5 0 0115 4.7V6H7.5L5 14H2.5A1.5 1.5 0 011 12.5v-9z" fill="#E8A838" />
    <path d="M7.5 6H15l-2.5 8H5z" fill="#F2C04A" />
  </Icon>
);

// ── Extension mapping ──

const EXT_MAP: Record<string, IconComponent> = {
  ts: TypeScriptIcon,
  tsx: ReactIcon,
  js: JavaScriptIcon,
  jsx: ReactIcon,
  rs: RustIcon,
  json: JsonIcon,
  html: HtmlIcon,
  htm: HtmlIcon,
  css: CssIcon,
  scss: CssIcon,
  less: CssIcon,
  md: MarkdownIcon,
  mdx: MarkdownIcon,
  py: PythonIcon,
  go: GoIcon,
  toml: TomlIcon,
  yaml: YamlIcon,
  yml: YamlIcon,
  sh: ShellIcon,
  bash: ShellIcon,
  zsh: ShellIcon,
  fish: ShellIcon,
  ps1: ShellIcon,
  png: ImageIcon,
  jpg: ImageIcon,
  jpeg: ImageIcon,
  gif: ImageIcon,
  svg: ImageIcon,
  webp: ImageIcon,
  ico: ImageIcon,
  lock: LockIcon,
  gitignore: GitIcon,
  gitattributes: GitIcon,
  gitmodules: GitIcon,
};

const NAME_MAP: Record<string, IconComponent> = {
  "Dockerfile": DefaultFileIcon,
  "Makefile": DefaultFileIcon,
  ".gitignore": GitIcon,
  ".gitattributes": GitIcon,
  ".env": LockIcon,
  ".env.local": LockIcon,
};

// ── Public API ──

export const calatestiaPack: IconPack = {
  name: "Calatestia",
  getFileIcon: (fileName: string, isDir: boolean, isOpen?: boolean) => {
    if (isDir) {
      return isOpen ? FolderOpenIcon : FolderClosedIcon;
    }
    // Check exact name match first
    if (NAME_MAP[fileName]) return NAME_MAP[fileName];
    // Check extension
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext && EXT_MAP[ext]) return EXT_MAP[ext];
    return DefaultFileIcon;
  },
};

export const calatestiaIcons = {
  TypeScriptIcon,
  JavaScriptIcon,
  ReactIcon,
  RustIcon,
  JsonIcon,
  HtmlIcon,
  CssIcon,
  MarkdownIcon,
  PythonIcon,
  GoIcon,
  TomlIcon,
  YamlIcon,
  ShellIcon,
  ImageIcon,
  GitIcon,
  LockIcon,
  DefaultFileIcon,
  FolderClosedIcon,
  FolderOpenIcon,
};
