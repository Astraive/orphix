export interface WorkspaceMeta {
  id: string;
  name: string;
  windowCount: number;
}

export interface WindowMeta {
  id: string;
  name: string;
  terminalCount: number;
}

export interface TerminalMeta {
  id: string;
  name: string;
  status: string;
  shell: string;
  cwd: string;
}

export type WorkspacePaneKind = "terminal" | "editor" | "browser";

export interface WorkspaceTerminalSummary {
  id: string;
  name: string;
  status: string;
  cwd?: string | null;
  shell?: string | null;
  title?: string | null;
}

export interface WorkspaceTerminalPane {
  id: string;
  kind: "terminal";
  title: string;
  sessionId: string | null;
  status?: string | null;
  cwd?: string | null;
  shell?: string | null;
}

export interface WorkspaceEditorPane {
  id: string;
  kind: "editor";
  title: string;
  filePath: string;
}

export interface WorkspaceBrowserPane {
  id: string;
  kind: "browser";
  title: string;
  browserSessionId: string;
  tabId: string | null;
  url?: string | null;
  snapshotDataUrl?: string | null;
}

export type WorkspacePane =
  | WorkspaceTerminalPane
  | WorkspaceEditorPane
  | WorkspaceBrowserPane;

export interface BrowserTabAttachment {
  workspaceId?: string | null;
  windowId?: string | null;
  paneId?: string | null;
}

export interface BrowserTabSummary {
  id: string;
  title: string;
  url: string;
  status: "loading" | "ready" | "error" | "closed";
  createdAt: string;
  updatedAt: string;
  attachment?: BrowserTabAttachment | null;
  snapshotDataUrl?: string | null;
}

export interface BrowserSessionSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeTabId?: string | null;
  tabs: BrowserTabSummary[];
}

export interface WorkspaceFilesystemCapabilities {
  root: string;
  canWrite: boolean;
  focusedPath?: string | null;
}

export interface WorkspaceGitCapabilities {
  available: boolean;
  repoPath?: string | null;
  branch?: string | null;
}

export interface WorkspaceDockerCapabilities {
  available: boolean;
  workspacePath?: string | null;
  hasCompose?: boolean;
  runningContainers?: number;
}

export interface WorkspaceBrowserCapabilities {
  available: boolean;
  sessionCount: number;
}

export interface WorkspaceNotificationCapabilities {
  available: boolean;
  unreadCount?: number;
}

export interface WorkspaceCapabilities {
  filesystem: WorkspaceFilesystemCapabilities;
  git: WorkspaceGitCapabilities;
  docker: WorkspaceDockerCapabilities;
  browser: WorkspaceBrowserCapabilities;
  notifications?: WorkspaceNotificationCapabilities;
}

export interface WorkspaceWindowSnapshot {
  id: string;
  name: string;
  panes: WorkspacePane[];
  terminals: WorkspaceTerminalSummary[];
}

export interface WorkspaceSnapshotNode {
  id: string;
  name: string;
  windows: WorkspaceWindowSnapshot[];
}

export interface WorkspaceListPayload {
  snapshotVersion: 2;
  workspaces: WorkspaceSnapshotNode[];
  browserSessions: BrowserSessionSummary[];
  capabilities: WorkspaceCapabilities;
}

export const EMPTY_WORKSPACE_CAPABILITIES: WorkspaceCapabilities = {
  filesystem: { root: ".", canWrite: false, focusedPath: null },
  git: { available: false, repoPath: null, branch: null },
  docker: { available: false, workspacePath: null, hasCompose: false, runningContainers: 0 },
  browser: { available: false, sessionCount: 0 },
  notifications: { available: true, unreadCount: 0 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeTerminal(value: unknown): WorkspaceTerminalSummary | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : null;
  if (!id) return null;
  return {
    id,
    name: typeof value.name === "string" ? value.name : "Terminal",
    status: typeof value.status === "string" ? value.status : "unknown",
    cwd: typeof value.cwd === "string" ? value.cwd : null,
    shell: typeof value.shell === "string" ? value.shell : null,
    title: typeof value.title === "string" ? value.title : null,
  };
}

function normalizeBrowserAttachment(value: unknown): BrowserTabAttachment | null {
  if (!isRecord(value)) return null;
  return {
    workspaceId: typeof value.workspaceId === "string" ? value.workspaceId : null,
    windowId: typeof value.windowId === "string" ? value.windowId : null,
    paneId: typeof value.paneId === "string" ? value.paneId : null,
  };
}

function normalizeBrowserTab(value: unknown): BrowserTabSummary | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : null;
  if (!id) return null;
  return {
    id,
    title: typeof value.title === "string" ? value.title : "Tab",
    url: typeof value.url === "string" ? value.url : "about:blank",
    status:
      value.status === "loading" || value.status === "ready" || value.status === "error" || value.status === "closed"
        ? value.status
        : "ready",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    attachment: normalizeBrowserAttachment(value.attachment),
    snapshotDataUrl: typeof value.snapshotDataUrl === "string" ? value.snapshotDataUrl : null,
  };
}

function normalizeBrowserSession(value: unknown): BrowserSessionSummary | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : null;
  if (!id) return null;
  const tabs = Array.isArray(value.tabs) ? value.tabs.map(normalizeBrowserTab).filter(Boolean) as BrowserTabSummary[] : [];
  return {
    id,
    name: typeof value.name === "string" ? value.name : "Browser Session",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    activeTabId: typeof value.activeTabId === "string" ? value.activeTabId : null,
    tabs,
  };
}

function normalizePane(value: unknown, terminals: WorkspaceTerminalSummary[]): WorkspacePane | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : null;
  const kind = value.kind;
  if (!id || (kind !== "terminal" && kind !== "editor" && kind !== "browser")) return null;

  if (kind === "editor") {
    return {
      id,
      kind,
      title: typeof value.title === "string" ? value.title : "Editor",
      filePath: typeof value.filePath === "string" ? value.filePath : "",
    };
  }

  if (kind === "browser") {
    return {
      id,
      kind,
      title: typeof value.title === "string" ? value.title : "Browser",
      browserSessionId: typeof value.browserSessionId === "string" ? value.browserSessionId : "",
      tabId: typeof value.tabId === "string" ? value.tabId : null,
      url: typeof value.url === "string" ? value.url : null,
      snapshotDataUrl: typeof value.snapshotDataUrl === "string" ? value.snapshotDataUrl : null,
    };
  }

  const sessionId = typeof value.sessionId === "string" ? value.sessionId : null;
  const fallback = sessionId ? terminals.find((terminal) => terminal.id === sessionId) : null;
  return {
    id,
    kind,
    title:
      typeof value.title === "string"
        ? value.title
        : fallback?.title || fallback?.name || "Terminal",
    sessionId,
    status: typeof value.status === "string" ? value.status : fallback?.status ?? null,
    cwd: typeof value.cwd === "string" ? value.cwd : fallback?.cwd ?? null,
    shell: typeof value.shell === "string" ? value.shell : fallback?.shell ?? null,
  };
}

function normalizeWindow(value: unknown): WorkspaceWindowSnapshot | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : null;
  if (!id) return null;
  const terminals = Array.isArray(value.terminals)
    ? value.terminals.map(normalizeTerminal).filter(Boolean) as WorkspaceTerminalSummary[]
    : [];
  const panes = Array.isArray(value.panes)
    ? value.panes.map((pane) => normalizePane(pane, terminals)).filter(Boolean) as WorkspacePane[]
    : terminals.map((terminal) => ({
        id: terminal.id,
        kind: "terminal" as const,
        title: terminal.title || terminal.name,
        sessionId: terminal.id,
        status: terminal.status,
        cwd: terminal.cwd ?? null,
        shell: terminal.shell ?? null,
      }));

  return {
    id,
    name: typeof value.name === "string" ? value.name : "Window",
    panes,
    terminals,
  };
}

function normalizeWorkspace(value: unknown): WorkspaceSnapshotNode | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : null;
  if (!id) return null;
  return {
    id,
    name: typeof value.name === "string" ? value.name : "Workspace",
    windows: Array.isArray(value.windows)
      ? value.windows.map(normalizeWindow).filter(Boolean) as WorkspaceWindowSnapshot[]
      : [],
  };
}

function normalizeCapabilities(value: unknown): WorkspaceCapabilities {
  if (!isRecord(value)) return EMPTY_WORKSPACE_CAPABILITIES;
  return {
    filesystem: {
      root:
        isRecord(value.filesystem) && typeof value.filesystem.root === "string"
          ? value.filesystem.root
          : EMPTY_WORKSPACE_CAPABILITIES.filesystem.root,
      canWrite:
        isRecord(value.filesystem) && typeof value.filesystem.canWrite === "boolean"
          ? value.filesystem.canWrite
          : EMPTY_WORKSPACE_CAPABILITIES.filesystem.canWrite,
      focusedPath:
        isRecord(value.filesystem) && typeof value.filesystem.focusedPath === "string"
          ? value.filesystem.focusedPath
          : null,
    },
    git: {
      available:
        isRecord(value.git) && typeof value.git.available === "boolean"
          ? value.git.available
          : EMPTY_WORKSPACE_CAPABILITIES.git.available,
      repoPath:
        isRecord(value.git) && typeof value.git.repoPath === "string"
          ? value.git.repoPath
          : null,
      branch:
        isRecord(value.git) && typeof value.git.branch === "string"
          ? value.git.branch
          : null,
    },
    docker: {
      available:
        isRecord(value.docker) && typeof value.docker.available === "boolean"
          ? value.docker.available
          : EMPTY_WORKSPACE_CAPABILITIES.docker.available,
      workspacePath:
        isRecord(value.docker) && typeof value.docker.workspacePath === "string"
          ? value.docker.workspacePath
          : null,
      hasCompose:
        isRecord(value.docker) && typeof value.docker.hasCompose === "boolean"
          ? value.docker.hasCompose
          : false,
      runningContainers:
        isRecord(value.docker) && typeof value.docker.runningContainers === "number"
          ? value.docker.runningContainers
          : 0,
    },
    browser: {
      available:
        isRecord(value.browser) && typeof value.browser.available === "boolean"
          ? value.browser.available
          : EMPTY_WORKSPACE_CAPABILITIES.browser.available,
      sessionCount:
        isRecord(value.browser) && typeof value.browser.sessionCount === "number"
          ? value.browser.sessionCount
          : 0,
    },
    notifications: {
      available:
        isRecord(value.notifications) && typeof value.notifications.available === "boolean"
          ? value.notifications.available
          : true,
      unreadCount:
        isRecord(value.notifications) && typeof value.notifications.unreadCount === "number"
          ? value.notifications.unreadCount
          : 0,
    },
  };
}

export function normalizeWorkspaceListPayload(
  payload:
    | WorkspaceListPayload
    | { workspaces?: unknown[]; snapshotVersion?: number; browserSessions?: unknown[]; capabilities?: unknown }
    | unknown[],
): WorkspaceListPayload {
  const root = Array.isArray(payload)
    ? { workspaces: payload }
    : (payload ?? {}) as {
        workspaces?: unknown[];
        snapshotVersion?: number;
        browserSessions?: unknown[];
        capabilities?: unknown;
      };

  const workspaces = Array.isArray(root.workspaces)
    ? root.workspaces.map(normalizeWorkspace).filter(Boolean) as WorkspaceSnapshotNode[]
    : [];
  const browserSessions = Array.isArray(root.browserSessions)
    ? root.browserSessions.map(normalizeBrowserSession).filter(Boolean) as BrowserSessionSummary[]
    : [];
  const capabilities = normalizeCapabilities(root.capabilities);

  return {
    snapshotVersion: 2,
    workspaces,
    browserSessions,
    capabilities: {
      ...capabilities,
      browser: {
        ...capabilities.browser,
        sessionCount: browserSessions.length,
      },
    },
  };
}
