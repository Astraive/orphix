export const CHANNELS = {
  // ── Terminal (renderer -> main) ──
  TERMINAL_CREATE: "terminal:create",
  TERMINAL_WRITE: "terminal:write",
  TERMINAL_RESIZE: "terminal:resize",
  TERMINAL_KILL: "terminal:kill",
  TERMINAL_LIST: "terminal:list",
  TERMINAL_ATTACH: "terminal:attach",
  TERMINAL_OUTPUT_RANGE: "terminal:output_range",
  TERMINAL_LIST_SHELLS: "terminal:list_shells",
  SYSTEM_HOME_DIR: "system:home_dir",
  SYSTEM_WORKSPACE_DIR: "system:workspace_dir",

  // ── Window controls ──
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_CLOSE: "window:close",
  WINDOW_IS_MAXIMIZED: "window:is_maximized",

  // ── File operations ──
  FILE_LIST: "file:list",
  FILE_READ: "file:read",
  FILE_WRITE: "file:write",
  FILE_CREATE: "file:create",
  FILE_RENAME: "file:rename",
  FILE_DELETE: "file:delete",
  FILE_COPY: "file:copy",
  FILE_MOVE: "file:move",
  FILE_STAT: "file:stat",
  FILE_WATCH: "file:watch",
  FILE_UNWATCH: "file:unwatch",
  FILE_OPEN_EXTERNAL: "file:open-external",

  // ── Git operations ──
  GIT_STATUS: "git:status",
  GIT_BRANCHES: "git:branches",
  GIT_CHECKOUT: "git:checkout",
  GIT_DIFF: "git:diff",
  GIT_STAGE: "git:stage",
  GIT_UNSTAGE: "git:unstage",
  GIT_COMMIT: "git:commit",
  GIT_WATCH: "git:watch",
  GIT_UNWATCH: "git:unwatch",

  // ── Events (main -> renderer) ──
  TERMINAL_OUTPUT: "terminal:output",
  TERMINAL_STATE: "terminal:state",
  TERMINAL_EXIT: "terminal:exit",
  TERMINAL_ERROR: "terminal:error",
  FILE_CHANGED: "file:changed",
  GIT_STATUS_CHANGED: "git:status-changed",
} as const;

export type ChannelName = (typeof CHANNELS)[keyof typeof CHANNELS];
