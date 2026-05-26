import { create } from "zustand";
import { invoke, listen } from "@/lib/ipc-client";
import { CHANNELS } from "@shared/ipc/channels";
import { useCanvasStore } from "@/features/workspace/stores/canvas-store";
import type {
  DockerContainer,
  DockerImage,
  DockerInspect,
  DockerLogLine,
  DockerStats,
  DockerComposeProject,
} from "@shared/types/docker";

interface DockerStore {
  containers: DockerContainer[];
  images: DockerImage[];
  selectedContainerId: string | null;
  inspectData: DockerInspect | null;
  logs: string;
  logLines: DockerLogLine[];
  stats: DockerStats[];
  loading: boolean;
  error: string | null;
  available: boolean;
  logFollowing: boolean;
  activeTab: "logs" | "inspect" | "stats";
  unlistenLog: (() => void) | null;
  /** Map of containerId → terminalId for persistent shell sessions */
  shellSessions: Map<string, string>;

  checkAvailable: () => Promise<void>;
  refreshContainers: () => Promise<void>;
  refreshImages: () => Promise<void>;
  refreshAll: () => Promise<void>;
  startContainer: (id: string) => Promise<void>;
  stopContainer: (id: string) => Promise<void>;
  restartContainer: (id: string) => Promise<void>;
  removeContainer: (id: string, force?: boolean) => Promise<void>;
  selectContainer: (id: string | null) => Promise<void>;
  setActiveTab: (tab: "logs" | "inspect" | "stats") => void;
  fetchLogs: (id: string) => Promise<void>;
  startLogFollow: (id: string) => void;
  stopLogFollow: (id: string) => void;
  fetchStats: () => Promise<void>;
  execIntoContainer: (id: string, shell?: string) => Promise<string | null>;
  moveToWindow: (id: string) => void;
  removeImage: (id: string, force?: boolean) => Promise<void>;
  pullImage: (image: string) => Promise<void>;
}

export const useDockerStore = create<DockerStore>()((set, get) => ({
  containers: [],
  images: [],
  selectedContainerId: null,
  inspectData: null,
  logs: "",
  logLines: [],
  stats: [],
  loading: false,
  error: null,
  available: false,
  logFollowing: false,
  activeTab: "logs",
  unlistenLog: null,
  shellSessions: new Map(),

  checkAvailable: async () => {
    try {
      const containers = await invoke<DockerContainer[]>(CHANNELS.DOCKER_PS_ALL);
      set({ available: true, containers, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ available: false, error: msg.includes("DOCKER_NOT_FOUND") ? "Docker not found. Install Docker and ensure it's running." : msg });
    }
  },

  refreshContainers: async () => {
    try {
      set({ loading: true });
      const containers = await invoke<DockerContainer[]>(CHANNELS.DOCKER_PS_ALL);
      set({ containers, loading: false, error: null });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  refreshImages: async () => {
    try {
      const images = await invoke<DockerImage[]>(CHANNELS.DOCKER_IMAGES);
      set({ images });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  refreshAll: async () => {
    await get().refreshContainers();
    await get().refreshImages();
  },

  startContainer: async (id) => {
    try { await invoke(CHANNELS.DOCKER_START, { id }); await get().refreshContainers(); }
    catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); }
  },

  stopContainer: async (id) => {
    try { await invoke(CHANNELS.DOCKER_STOP, { id }); await get().refreshContainers(); }
    catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); }
  },

  restartContainer: async (id) => {
    try { await invoke(CHANNELS.DOCKER_RESTART, { id }); await get().refreshContainers(); }
    catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); }
  },

  removeContainer: async (id, force) => {
    try {
      await invoke(CHANNELS.DOCKER_REMOVE, { id, force });
      if (get().selectedContainerId === id) set({ selectedContainerId: null, inspectData: null, logs: "", logLines: [] });
      await get().refreshContainers();
    } catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); }
  },

  selectContainer: async (id) => {
    const prev = get().selectedContainerId;
    if (prev && prev !== id) get().stopLogFollow(prev);
    set({ selectedContainerId: id, inspectData: null, logs: "", logLines: [], activeTab: "logs" });
    if (id) {
      try { const inspectData = await invoke<DockerInspect>(CHANNELS.DOCKER_INSPECT, { id }); set({ inspectData }); }
      catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); }
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchLogs: async (id) => {
    try { const logs = await invoke<string>(CHANNELS.DOCKER_LOGS, { id, tail: 200 }); set({ logs }); }
    catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); }
  },

  startLogFollow: (id) => {
    const { unlistenLog } = get();
    unlistenLog?.();
    const unlisten = listen<DockerLogLine>(CHANNELS.DOCKER_LOG_STREAM, (line) => {
      if (line.containerId === id) set((s) => ({ logLines: [...s.logLines.slice(-500), line] }));
    });
    invoke(CHANNELS.DOCKER_LOGS_FOLLOW, { id }).catch(() => {});
    set({ logFollowing: true, unlistenLog: unlisten });
  },

  stopLogFollow: (id) => {
    const { unlistenLog } = get();
    unlistenLog?.();
    invoke(CHANNELS.DOCKER_LOGS_STOP, { id }).catch(() => {});
    set({ logFollowing: false, unlistenLog: null });
  },

  fetchStats: async () => {
    try { const stats = await invoke<DockerStats[]>(CHANNELS.DOCKER_STATS); set({ stats }); }
    catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); }
  },

  execIntoContainer: async (id, shell = "/bin/sh") => {
    try {
      // Check if we already have a session for this container
      const existing = get().shellSessions.get(id);
      if (existing) return existing;

      const terminalId = `docker-${id.slice(0, 8)}-${Date.now()}`;
      // Use real PTY with docker exec command override
      await invoke(CHANNELS.TERMINAL_CREATE, {
        terminalId,
        cols: 120,
        rows: 30,
        command: "docker",
        args: ["exec", "-it", id, shell],
      });
      useCanvasStore.getState().splitPane(terminalId);
      // Track the session
      const newSessions = new Map(get().shellSessions);
      newSessions.set(id, terminalId);
      set({ shellSessions: newSessions });
      return terminalId;
    } catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); return null; }
  },

  moveToWindow: (id) => {
    const terminalId = get().shellSessions.get(id);
    if (!terminalId) return;
    // Move the existing pane to a new window — reuse the same session
    const canvas = useCanvasStore.getState();
    const newWinId = canvas.addWindow();
    const newPaneId = `${newWinId}-pane-0`;
    canvas.setPaneSession(newPaneId, terminalId);
    canvas.closePane();
    // Remove from shell sessions since it's now in its own window
    const newSessions = new Map(get().shellSessions);
    newSessions.delete(id);
    set({ shellSessions: newSessions });
  },

  removeImage: async (id, force) => {
    try { await invoke(CHANNELS.DOCKER_IMAGE_REMOVE, { id, force }); await get().refreshImages(); }
    catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); }
  },

  pullImage: async (image) => {
    try { await invoke(CHANNELS.DOCKER_PULL, { image }); await get().refreshImages(); }
    catch (e) { set({ error: e instanceof Error ? e.message : String(e) }); }
  },
}));
