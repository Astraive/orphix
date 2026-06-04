import { contextBridge, ipcRenderer } from "electron";
import { CHANNELS } from "../shared/ipc/channels";
import { TERMINAL_CHANNELS } from "../shared/terminal/terminal-ipc";
import type { OrphixAPI } from "../shared/types/common";

// Whitelisted channels the renderer may invoke (prevents arbitrary IPC access)
const INVOKE_CHANNELS = new Set<string>([
  // Terminal
  CHANNELS.TERMINAL_CREATE, CHANNELS.TERMINAL_WRITE, CHANNELS.TERMINAL_RESIZE,
  CHANNELS.TERMINAL_KILL, CHANNELS.TERMINAL_LIST, CHANNELS.TERMINAL_ATTACH,
  CHANNELS.TERMINAL_OUTPUT_RANGE, CHANNELS.TERMINAL_LIST_SHELLS,
  CHANNELS.SYSTEM_HOME_DIR, CHANNELS.SYSTEM_WORKSPACE_DIR,
  CHANNELS.SYSTEM_NOTIFY, CHANNELS.SYSTEM_SET_BADGE,
  CHANNELS.BROWSER_LIST_SESSIONS, CHANNELS.BROWSER_CREATE_SESSION,
  CHANNELS.BROWSER_LIST_TABS, CHANNELS.BROWSER_OPEN_TAB,
  CHANNELS.BROWSER_CLOSE_TAB, CHANNELS.BROWSER_NAVIGATE,
  CHANNELS.BROWSER_ATTACH, CHANNELS.BROWSER_DETACH,
  CHANNELS.BROWSER_SNAPSHOT,
  // File
  CHANNELS.FILE_LIST, CHANNELS.FILE_READ, CHANNELS.FILE_WRITE,
  CHANNELS.FILE_CREATE, CHANNELS.FILE_RENAME, CHANNELS.FILE_DELETE,
  CHANNELS.FILE_COPY, CHANNELS.FILE_MOVE, CHANNELS.FILE_STAT,
  CHANNELS.FILE_WATCH, CHANNELS.FILE_UNWATCH, CHANNELS.FILE_OPEN_EXTERNAL,
  CHANNELS.FILE_OPEN_TERMINAL, CHANNELS.FILE_REVEAL,
  // Editor navigation
  CHANNELS.EDITOR_GOTO_DEFINITION,
  // Git
  CHANNELS.GIT_STATUS, CHANNELS.GIT_BRANCHES, CHANNELS.GIT_CHECKOUT,
  CHANNELS.GIT_DIFF, CHANNELS.GIT_STAGE, CHANNELS.GIT_UNSTAGE,
  CHANNELS.GIT_COMMIT, CHANNELS.GIT_FETCH, CHANNELS.GIT_PULL,
  CHANNELS.GIT_PUSH, CHANNELS.GIT_SYNC, CHANNELS.GIT_STAGE_ALL,
  CHANNELS.GIT_UNSTAGE_ALL, CHANNELS.GIT_DISCARD, CHANNELS.GIT_DISCARD_ALL,
  CHANNELS.GIT_STASH_PUSH, CHANNELS.GIT_STASH_POP, CHANNELS.GIT_STASH_APPLY,
  CHANNELS.GIT_STASH_DROP, CHANNELS.GIT_STASH_LIST,
  CHANNELS.GIT_WATCH, CHANNELS.GIT_UNWATCH, CHANNELS.GIT_EXEC,
  // Docker
  CHANNELS.DOCKER_PS, CHANNELS.DOCKER_PS_ALL, CHANNELS.DOCKER_START,
  CHANNELS.DOCKER_STOP, CHANNELS.DOCKER_RESTART, CHANNELS.DOCKER_REMOVE,
  CHANNELS.DOCKER_LOGS, CHANNELS.DOCKER_LOGS_FOLLOW, CHANNELS.DOCKER_LOGS_STOP,
  CHANNELS.DOCKER_INSPECT, CHANNELS.DOCKER_EXEC, CHANNELS.DOCKER_IMAGES,
  CHANNELS.DOCKER_WORKSPACE_DISCOVER, CHANNELS.DOCKER_IMAGE_REMOVE,
  CHANNELS.DOCKER_BUILD, CHANNELS.DOCKER_PULL,
  CHANNELS.DOCKER_COMPOSE_PS, CHANNELS.DOCKER_COMPOSE_UP,
  CHANNELS.DOCKER_COMPOSE_DOWN, CHANNELS.DOCKER_COMPOSE_LOGS,
  CHANNELS.DOCKER_STATS,
  // Device
  CHANNELS.DEVICE_REGISTER,
  // WebRTC
  CHANNELS.WEBRTC_TERMINAL_INPUT,
]);

// Whitelisted channels the renderer may listen on
const LISTEN_CHANNELS = new Set<string>([
  TERMINAL_CHANNELS.output, TERMINAL_CHANNELS.state,
  TERMINAL_CHANNELS.exit, TERMINAL_CHANNELS.error,
  CHANNELS.FILE_CHANGED, CHANNELS.GIT_STATUS_CHANGED,
  CHANNELS.DOCKER_LOG_STREAM, CHANNELS.DOCKER_STATE_CHANGE,
  CHANNELS.DOCKER_STATS_UPDATE,
  CHANNELS.BROWSER_SESSIONS_UPDATED,
  CHANNELS.WEBRTC_SIGNAL, CHANNELS.WEBRTC_TERMINAL_OUTPUT,
]);

const orphix: OrphixAPI = {
  invoke: <T>(channel: string, args?: Record<string, unknown>): Promise<T> => {
    if (!INVOKE_CHANNELS.has(channel)) {
      return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, args);
  },
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    if (!LISTEN_CHANNELS.has(channel)) {
      console.warn(`IPC listen channel not allowed: ${channel}`);
      return () => {};
    }
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      callback(...args);
    };
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },
  window: {
    minimize: () => ipcRenderer.invoke(CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(CHANNELS.WINDOW_CLOSE),
    isMaximized: () => ipcRenderer.invoke(CHANNELS.WINDOW_IS_MAXIMIZED),
  },
  system: {
    notify: (payload) => ipcRenderer.invoke(CHANNELS.SYSTEM_NOTIFY, payload),
    setBadge: (payload) => ipcRenderer.invoke(CHANNELS.SYSTEM_SET_BADGE, payload),
  },
  browser: {
    listSessions: () => ipcRenderer.invoke(CHANNELS.BROWSER_LIST_SESSIONS),
    createSession: (payload) => ipcRenderer.invoke(CHANNELS.BROWSER_CREATE_SESSION, payload),
    listTabs: (sessionId) => ipcRenderer.invoke(CHANNELS.BROWSER_LIST_TABS, sessionId),
    openTab: (payload) => ipcRenderer.invoke(CHANNELS.BROWSER_OPEN_TAB, payload),
    closeTab: (payload) => ipcRenderer.invoke(CHANNELS.BROWSER_CLOSE_TAB, payload),
    navigate: (payload) => ipcRenderer.invoke(CHANNELS.BROWSER_NAVIGATE, payload),
    attach: (payload) => ipcRenderer.invoke(CHANNELS.BROWSER_ATTACH, payload),
    detach: (payload) => ipcRenderer.invoke(CHANNELS.BROWSER_DETACH, payload),
    snapshot: (payload) => ipcRenderer.invoke(CHANNELS.BROWSER_SNAPSHOT, payload),
    onSessionsChanged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, sessions: unknown[]) => {
        callback(sessions as any);
      };
      ipcRenderer.on(CHANNELS.BROWSER_SESSIONS_UPDATED, handler);
      return () => {
        ipcRenderer.removeListener(CHANNELS.BROWSER_SESSIONS_UPDATED, handler);
      };
    },
  },
  auth: {
    login: () => ipcRenderer.invoke(CHANNELS.AUTH_LOGIN),
    logout: () => ipcRenderer.invoke(CHANNELS.AUTH_LOGOUT),
    getStatus: () => ipcRenderer.invoke(CHANNELS.AUTH_STATUS),
    getToken: () => ipcRenderer.invoke(CHANNELS.AUTH_GET_TOKEN),
    onCallback: (callback: (tokens: { accessToken: string; refreshToken: string }) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, tokens: { accessToken: string; refreshToken: string }) => {
        callback(tokens);
      };
      ipcRenderer.on(CHANNELS.AUTH_CALLBACK, handler);
      return () => {
        ipcRenderer.removeListener(CHANNELS.AUTH_CALLBACK, handler);
      };
    },
  },
  link: {
    connect: () => ipcRenderer.invoke(CHANNELS.LINK_CONNECT),
    disconnect: () => ipcRenderer.invoke(CHANNELS.LINK_DISCONNECT),
    getStatus: () => ipcRenderer.invoke(CHANNELS.LINK_STATUS),
    getUrl: () => ipcRenderer.invoke(CHANNELS.LINK_GET_URL),
    getSettings: () => ipcRenderer.invoke(CHANNELS.LINK_GET_SETTINGS),
    updateSettings: (settings) => ipcRenderer.invoke(CHANNELS.LINK_UPDATE_SETTINGS, settings),
    updateWorkspace: (payload) => ipcRenderer.invoke(CHANNELS.LINK_WORKSPACE_UPDATE, payload),
    approve: (sessionId: string) => ipcRenderer.invoke(CHANNELS.LINK_APPROVE, sessionId),
    reject: (sessionId: string) => ipcRenderer.invoke(CHANNELS.LINK_REJECT, sessionId),
    sendSignal: (msg: Record<string, unknown>) => ipcRenderer.invoke(CHANNELS.WEBRTC_SEND_SIGNAL, msg),
    onStatus: (callback: (data: { status: string; deviceId: string | null; event?: string; data?: any }) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { status: string; deviceId: string | null; event?: string; data?: any }) => {
        callback(data);
      };
      ipcRenderer.on(CHANNELS.LINK_STATUS, handler);
      return () => {
        ipcRenderer.removeListener(CHANNELS.LINK_STATUS, handler);
      };
    },
    onWebRTCSignal: (callback: (msg: Record<string, unknown>) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, msg: Record<string, unknown>) => {
        callback(msg);
      };
      ipcRenderer.on(CHANNELS.WEBRTC_SIGNAL, handler);
      return () => {
        ipcRenderer.removeListener(CHANNELS.WEBRTC_SIGNAL, handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld("orphix", orphix);
