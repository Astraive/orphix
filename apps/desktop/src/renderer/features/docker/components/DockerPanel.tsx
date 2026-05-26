import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Box,
  CircleDot,
  Copy,
  ExternalLink,
  FileCode2,
  Gauge,
  HardDrive,
  Info,
  Image,
  Layers,
  MoreVertical,
  Network,
  Play,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Square,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import { useDockerStore } from "../stores/docker-store";
import { TerminalViewport } from "@/features/terminal/components/TerminalViewport";
import type { DockerContainer, DockerContainerState, DockerImage } from "@shared/types/docker";

const STATE_COLORS: Record<DockerContainerState, string> = {
  running: "var(--orphix-color-success)",
  exited: "var(--orphix-color-text-muted)",
  created: "var(--orphix-color-info)",
  paused: "var(--orphix-color-warning)",
  restarting: "var(--orphix-color-accent)",
  removing: "var(--orphix-color-danger)",
  dead: "var(--orphix-color-danger)",
  unknown: "var(--orphix-color-text-muted)",
};

type PopupView = "containers" | "images" | "volumes" | "networks" | "contexts" | "disk";

function useAutoRefresh(fn: () => void, interval: number, deps: unknown[]) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    ref.current();
    const id = setInterval(() => ref.current(), interval);
    return () => clearInterval(id);
  }, deps);
}

export function DockerPanel() {
  const store = useDockerStore();
  const {
    containers, images, loading, error, available,
    selectedContainerId, inspectData, logs, logLines, stats,
    logFollowing, activeTab,
    checkAvailable, refreshContainers, refreshImages, refreshAll,
    startContainer, stopContainer, restartContainer, removeContainer,
    selectContainer, setActiveTab, fetchLogs, startLogFollow, stopLogFollow,
    fetchStats, execIntoContainer, moveToWindow, removeImage, pullImage,
  } = store;

  const [popup, setPopup] = useState<PopupView | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pullInput, setPullInput] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: CtxItem[] } | null>(null);

  useAutoRefresh(() => { if (available) refreshContainers(); }, 8000, [available]);
  useEffect(() => { checkAvailable(); }, [checkAvailable]);

  // Close context menu on click/blur
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => { window.removeEventListener("click", close); window.removeEventListener("blur", close); };
  }, []);

  const running = useMemo(() => containers.filter((c) => c.state === "running"), [containers]);
  const stopped = useMemo(() => containers.filter((c) => c.state !== "running"), [containers]);

  const openDetail = useCallback(async (id: string, tab: "logs" | "inspect" | "stats" | "shell" = "logs") => {
    setDetailId(id);
    await selectContainer(id);
    setActiveTab(tab as "logs" | "inspect" | "stats");
    if (tab === "logs") await fetchLogs(id);
    if (tab === "stats") await fetchStats();
  }, [selectContainer, setActiveTab, fetchLogs, fetchStats]);

  const closeDetail = useCallback(() => { setDetailId(null); selectContainer(null); }, [selectContainer]);

  // Context menu builders
  const containerMenu = useCallback((e: React.MouseEvent, c: DockerContainer) => {
    e.preventDefault(); e.stopPropagation();
    const items: CtxItem[] = [
      { label: "View details", icon: <Info size={14} />, onClick: () => openDetail(c.id, "inspect") },
      { label: "View logs", icon: <ScrollText size={14} />, onClick: () => openDetail(c.id, "logs") },
      { label: "Shell (popup)", icon: <Terminal size={14} />, onClick: () => openDetail(c.id, "shell") },
      { label: "Shell (window)", icon: <ExternalLink size={14} />, onClick: () => moveToWindow(c.id) },
      { label: "View stats", icon: <Gauge size={14} />, onClick: () => openDetail(c.id, "stats") },
      { label: "Copy ID", icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(c.id) },
      { label: "Copy name", icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(c.name) },
    ];
    if (c.state === "running") {
      items.push(
        { label: "Stop", icon: <Square size={14} />, onClick: () => stopContainer(c.id) },
        { label: "Restart", icon: <RotateCcw size={14} />, onClick: () => restartContainer(c.id) },
      );
    } else {
      items.push({ label: "Start", icon: <Play size={14} />, onClick: () => startContainer(c.id) });
    }
    items.push({ label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => removeContainer(c.id, c.state === "running") });
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [openDetail, execIntoContainer, startContainer, stopContainer, restartContainer, removeContainer]);

  const imageMenu = useCallback((e: React.MouseEvent, img: DockerImage) => {
    e.preventDefault(); e.stopPropagation();
    const ref = `${img.repository}:${img.tag}`;
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "Inspect", icon: <Info size={14} />, onClick: () => {} },
        { label: "Copy tag", icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(ref) },
        { label: "Copy ID", icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(img.id) },
        { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => removeImage(img.id, true) },
      ],
    });
  }, [removeImage]);

  if (!available && !loading) {
    return (
      <div className="flex h-full flex-col">
        <Header loading={false} onRefresh={checkAvailable} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <AlertCircle size={20} style={{ color: "var(--orphix-color-text-muted)" }} />
          <p className="text-sm font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{error || "Docker not available"}</p>
          <button onClick={checkAvailable} className="text-sm font-mono px-2 py-1 rounded border" style={{ borderColor: "var(--orphix-color-base-border)", color: "var(--orphix-color-primary)" }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header loading={loading} onRefresh={refreshAll} />

      {error && (
        <div className="mx-2 mt-1 flex items-center gap-1 rounded px-2 py-1 text-sm font-mono"
          style={{ background: "color-mix(in srgb, var(--orphix-color-danger) 8%, transparent)", color: "var(--orphix-color-danger)" }}>
          <AlertCircle size={15} /><span className="truncate">{error}</span>
        </div>
      )}

      {/* Icon toolbar — icons only, no labels */}
      <div className="flex items-center justify-center gap-0.5 px-2 py-1.5 shrink-0" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        <IconBtn icon={<Box size={16} />} title={`Containers (${containers.length})`} active={popup === "containers"} onClick={() => setPopup(popup === "containers" ? null : "containers")} />
        <IconBtn icon={<Image size={16} />} title={`Images (${images.length})`} active={popup === "images"} onClick={() => { setPopup(popup === "images" ? null : "images"); if (popup !== "images") refreshImages(); }} />
        <IconBtn icon={<Layers size={16} />} title="Volumes" active={popup === "volumes"} onClick={() => setPopup(popup === "volumes" ? null : "volumes")} />
        <IconBtn icon={<Network size={16} />} title="Networks" active={popup === "networks"} onClick={() => setPopup(popup === "networks" ? null : "networks")} />
        <IconBtn icon={<CircleDot size={16} />} title="Contexts" active={popup === "contexts"} onClick={() => setPopup(popup === "contexts" ? null : "contexts")} />
        <IconBtn icon={<HardDrive size={16} />} title="Disk Usage" active={popup === "disk"} onClick={() => setPopup(popup === "disk" ? null : "disk")} />
      </div>

      {/* Popup content */}
      {popup && (
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          {popup === "containers" && (
            <ContainersList containers={containers} selectedId={detailId}
              onOpen={(id) => openDetail(id)} onContext={containerMenu} />
          )}
          {popup === "images" && (
            <ImagesList images={images} pullInput={pullInput} onPullInput={setPullInput}
              onPull={() => { if (pullInput.trim()) { pullImage(pullInput.trim()); setPullInput(""); } }}
              onContext={imageMenu} />
          )}
          {popup === "volumes" && <Placeholder title="Volumes" cmd="docker volume ls" />}
          {popup === "networks" && <Placeholder title="Networks" cmd="docker network ls" />}
          {popup === "contexts" && <Placeholder title="Contexts" cmd="docker context ls" />}
          {popup === "disk" && <Placeholder title="Disk Usage" cmd="docker system df" />}
        </div>
      )}

      {/* Default view */}
      {!popup && !detailId && (
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          <QuickList running={running} stopped={stopped}
            onSelect={(id) => openDetail(id)}
            onContext={containerMenu} />
        </div>
      )}

      {/* Detail dialog — movable */}
      {detailId && (() => {
        const container = containers.find((c) => c.id === detailId);
        if (!container) return null;
        return (
          <MovableDialog
            title={container.name}
            subtitle={`${container.image} · ${container.status}`}
            stateColor={STATE_COLORS[container.state]}
            onClose={closeDetail}
          >
            <ContainerDetailContent
              container={container} store={store}
              onShell={() => execIntoContainer(detailId)}
              onMoveToWindow={() => moveToWindow(detailId)}
            />
          </MovableDialog>
        );
      })()}

      {/* Context menu */}
      {contextMenu && (
        <div className="fixed z-50 min-w-40 rounded border py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y, borderColor: "var(--orphix-color-base-border)", background: "var(--orphix-color-base-background)" }}>
          {contextMenu.items.map((item, i) => (
            <button key={i} onClick={item.onClick}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm font-mono hover:bg-orphix-hover-subtle"
              style={{ color: item.danger ? "var(--orphix-color-danger)" : "var(--orphix-color-text)" }}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Movable Dialog ──

function MovableDialog({ title, subtitle, stateColor, onClose, children }: {
  title: string; subtitle: string; stateColor: string; onClose: () => void; children: ReactNode;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
      <div className="flex max-h-[80vh] w-[min(680px,96vw)] flex-col rounded border shadow-2xl"
        style={{ borderColor: "var(--orphix-color-base-border)", background: "var(--orphix-color-base-background)" }}>
        {/* Draggable header */}
        <div
          onMouseDown={onMouseDown}
          className="flex items-center gap-2 px-3 py-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
          style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: stateColor }} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold" style={{ color: "var(--orphix-color-text)" }}>{title}</div>
            <div className="truncate text-sm font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{subtitle}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-orphix-hover-medium">
            <X size={16} style={{ color: "var(--orphix-color-text-muted)" }} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Container Detail Content (inside movable dialog) ──

function ContainerDetailContent({ container, store, onShell, onMoveToWindow }: {
  container: DockerContainer;
  store: ReturnType<typeof useDockerStore.getState>;
  onShell: () => void;
  onMoveToWindow: () => void;
}) {
  const { inspectData, logs, logLines, stats, activeTab, logFollowing, setActiveTab, fetchLogs, fetchStats, startContainer, stopContainer, restartContainer, removeContainer, startLogFollow, stopLogFollow } = store as ReturnType<typeof useDockerStore.getState>;
  const [shellTab, setShellTab] = useState(false);
  const logText = logLines.length > 0 ? logLines.map((l: { timestamp: string | null; text: string }) => `${l.timestamp ? `${l.timestamp} ` : ""}${l.text}`).join("\n") : logs;
  const currentStats = stats.find((s: { containerId: string; name: string }) => s.containerId === container.id || s.name === container.name);

  return (
    <div className="flex flex-col">
      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 shrink-0" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        {container.state === "running" ? (
          <SmallBtn icon={<Square size={15} />} label="Stop" onClick={() => stopContainer(container.id)} />
        ) : (
          <SmallBtn icon={<Play size={15} />} label="Start" onClick={() => startContainer(container.id)} />
        )}
        <SmallBtn icon={<RotateCcw size={15} />} label="Restart" onClick={() => restartContainer(container.id)} />
        {container.state === "running" && <SmallBtn icon={<Terminal size={15} />} label="Shell" onClick={() => setShellTab(!shellTab)} />}
        <SmallBtn icon={<ArrowUpRight size={15} />} label="Move to Window" onClick={onMoveToWindow} />
        <SmallBtn icon={<Trash2 size={15} />} label="Delete" danger onClick={() => removeContainer(container.id, container.state === "running")} />
      </div>

      {/* Tabs */}
      <div className="flex px-3 pt-1 shrink-0">
        {(["logs", "inspect", "stats"] as const).map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setShellTab(false); if (tab === "logs") fetchLogs(container.id); if (tab === "stats") fetchStats(); }}
            className="px-2 py-1 text-sm font-mono uppercase tracking-wider"
            style={{ color: activeTab === tab && !shellTab ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)", borderBottom: activeTab === tab && !shellTab ? "2px solid var(--orphix-color-primary)" : "2px solid transparent" }}>
            {tab}
          </button>
        ))}
        {container.state === "running" && (
          <button onClick={() => setShellTab(true)}
            className="px-2 py-1 text-sm font-mono uppercase tracking-wider"
            style={{ color: shellTab ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)", borderBottom: shellTab ? "2px solid var(--orphix-color-primary)" : "2px solid transparent" }}>
            shell
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 px-3 py-2">
        {shellTab && container.state === "running" && (
          <ShellTab containerId={container.id} onMoveToWindow={onMoveToWindow} />
        )}
        {!shellTab && activeTab === "logs" && (
          <div>
            <div className="flex gap-1 mb-2">
              <SmallBtn label="Refresh" onClick={() => fetchLogs(container.id)} />
              <SmallBtn label={logFollowing ? "Stop" : "Follow"} onClick={() => logFollowing ? stopLogFollow(container.id) : startLogFollow(container.id)} />
              <SmallBtn icon={<Copy size={15} />} label="Copy" onClick={() => navigator.clipboard.writeText(logText)} />
            </div>
            <pre className="max-h-[300px] overflow-auto rounded border p-2 text-sm leading-relaxed whitespace-pre-wrap"
              style={{ borderColor: "var(--orphix-color-base-border)", background: "var(--orphix-color-base-surface-deep)", color: "var(--orphix-color-text)" }}>
              {logText || "No logs."}
            </pre>
          </div>
        )}
        {!shellTab && activeTab === "inspect" && (
          <pre className="max-h-[400px] overflow-auto rounded border p-2 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ borderColor: "var(--orphix-color-base-border)", background: "var(--orphix-color-base-surface-deep)", color: "var(--orphix-color-text)" }}>
            {inspectData?.raw || "Loading..."}
          </pre>
        )}
        {!shellTab && activeTab === "stats" && (
          <div className="grid gap-2 text-sm font-mono">
            {currentStats ? (<>
              <StatRow label="CPU" value={currentStats.cpu} />
              <StatRow label="Memory" value={`${currentStats.memory} · ${currentStats.memoryUsage}`} />
              <StatRow label="Network" value={currentStats.netIO} />
              <StatRow label="Block I/O" value={currentStats.blockIO} />
              <StatRow label="PIDs" value={currentStats.pids} />
            </>) : <p style={{ color: "var(--orphix-color-text-disabled)" }}>Stats available for running containers.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shell Tab (inline in popup) ──

function ShellTab({ containerId, onMoveToWindow }: { containerId: string; onMoveToWindow: () => void }) {
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const startShell = useCallback(async () => {
    if (terminalId) return;
    setStarting(true);
    try {
      const { invoke } = await import("@/lib/ipc-client");
      const { CHANNELS } = await import("@shared/ipc/channels");
      const { useCanvasStore } = await import("@/features/workspace/stores/canvas-store");
      const { useDockerStore } = await import("../stores/docker-store");

      const id = `docker-${containerId.slice(0, 8)}-${Date.now()}`;
      await invoke(CHANNELS.TERMINAL_CREATE, {
        terminalId: id,
        cols: 120,
        rows: 30,
        command: "docker",
        args: ["exec", "-it", containerId, "/bin/sh"],
      });
      setTerminalId(id);
      // Track in store
      const newSessions = new Map(useDockerStore.getState().shellSessions);
      newSessions.set(containerId, id);
      useDockerStore.setState({ shellSessions: newSessions });
    } catch (e) {
      console.error("Failed to start docker shell:", e);
    } finally {
      setStarting(false);
    }
  }, [containerId, terminalId]);

  // Auto-start shell on mount
  useEffect(() => { startShell(); }, []);

  return (
    <div className="flex flex-col h-[300px]">
      <div className="flex items-center gap-1 px-2 py-1 shrink-0">
        <SmallBtn icon={<ArrowUpRight size={15} />} label="Move to Window" onClick={onMoveToWindow} />
      </div>
      {terminalId ? (
        <TerminalViewport terminalId={terminalId} isActive={true} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>
          {starting ? "Starting shell..." : "Click Shell to start"}
        </div>
      )}
    </div>
  );
}

// ── Header ──

function Header({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between px-3" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
      <div className="flex items-center gap-1.5">
        <Box size={14} style={{ color: "var(--orphix-color-primary)" }} />
        <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--orphix-color-primary)" }}>Docker</span>
      </div>
      <button onClick={onRefresh} className="flex h-5 w-5 items-center justify-center rounded hover:bg-orphix-hover-medium" title="Refresh">
        <RefreshCw size={15} className={loading ? "animate-spin" : ""} style={{ color: "var(--orphix-color-text-muted)" }} />
      </button>
    </div>
  );
}

// ── Icon Button (toolbar) ──

function IconBtn({ icon, title, active, onClick }: { icon: ReactNode; title: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title}
      className="flex h-7 w-7 items-center justify-center rounded transition-colors"
      style={{ color: active ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)", background: active ? "color-mix(in srgb, var(--orphix-color-primary) 10%, transparent)" : "transparent" }}>
      {icon}
    </button>
  );
}

// ── Quick List (default view) ──

function QuickList({ running, stopped, onSelect, onContext }: {
  running: DockerContainer[]; stopped: DockerContainer[];
  onSelect: (id: string) => void; onContext: (e: React.MouseEvent, c: DockerContainer) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {running.length > 0 && (
        <div>
          <div className="text-sm font-mono uppercase tracking-wider px-1 py-1" style={{ color: "var(--orphix-color-text-muted)" }}>Running ({running.length})</div>
          {running.map((c) => <Row key={c.id} container={c} onSelect={() => onSelect(c.id)} onContext={(e) => onContext(e, c)} />)}
        </div>
      )}
      {stopped.length > 0 && (
        <div>
          <div className="text-sm font-mono uppercase tracking-wider px-1 py-1" style={{ color: "var(--orphix-color-text-muted)" }}>Stopped ({stopped.length})</div>
          {stopped.map((c) => <Row key={c.id} container={c} onSelect={() => onSelect(c.id)} onContext={(e) => onContext(e, c)} />)}
        </div>
      )}
      {running.length === 0 && stopped.length === 0 && <p className="text-sm font-mono text-center py-8" style={{ color: "var(--orphix-color-text-disabled)" }}>No containers.</p>}
    </div>
  );
}

function Row({ container, onSelect, onContext }: { container: DockerContainer; onSelect: () => void; onContext: (e: React.MouseEvent) => void }) {
  const ports = container.ports.filter((p) => p.public !== null).map((p) => `${p.public}:${p.private}`).join(", ");
  return (
    <div className="group flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-orphix-hover-subtle transition-colors"
      onClick={onSelect} onContextMenu={onContext}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATE_COLORS[container.state] }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-mono font-semibold" style={{ color: "var(--orphix-color-text)" }}>{container.name}</span>
          <span className="text-sm font-mono uppercase px-1 py-0.5 rounded shrink-0" style={{ color: STATE_COLORS[container.state], background: `color-mix(in srgb, ${STATE_COLORS[container.state]} 10%, transparent)` }}>{container.state}</span>
        </div>
        <div className="truncate text-sm font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{container.image}{ports ? ` · ${ports}` : ""}</div>
      </div>
      <MoreVertical size={15} className="opacity-0 group-hover:opacity-40 shrink-0" style={{ color: "var(--orphix-color-text-muted)" }} />
    </div>
  );
}

// ── Containers List (popup) ──

function ContainersList({ containers, selectedId, onOpen, onContext }: {
  containers: DockerContainer[]; selectedId: string | null;
  onOpen: (id: string) => void; onContext: (e: React.MouseEvent, c: DockerContainer) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {containers.map((c) => (
        <div key={c.id} className="group flex items-center gap-2 rounded border px-2 py-1.5 cursor-pointer hover:bg-orphix-hover-subtle"
          style={{ borderColor: selectedId === c.id ? STATE_COLORS[c.state] : "var(--orphix-color-base-border)" }}
          onClick={() => onOpen(c.id)} onContextMenu={(e) => onContext(e, c)}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATE_COLORS[c.state] }} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-mono font-semibold" style={{ color: "var(--orphix-color-text)" }}>{c.name}</div>
            <div className="truncate text-sm font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{c.image} · {c.status}</div>
          </div>
          <MoreVertical size={15} className="opacity-0 group-hover:opacity-40 shrink-0" style={{ color: "var(--orphix-color-text-muted)" }} />
        </div>
      ))}
      {containers.length === 0 && <p className="text-sm font-mono text-center py-4" style={{ color: "var(--orphix-color-text-disabled)" }}>No containers.</p>}
    </div>
  );
}

// ── Images List (popup) ──

function ImagesList({ images, pullInput, onPullInput, onPull, onContext }: {
  images: DockerImage[]; pullInput: string; onPullInput: (v: string) => void; onPull: () => void;
  onContext: (e: React.MouseEvent, img: DockerImage) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex gap-1 mb-1">
        <input value={pullInput} onChange={(e) => onPullInput(e.target.value)} placeholder="image:tag" onKeyDown={(e) => { if (e.key === "Enter") onPull(); }}
          className="flex-1 min-w-0 rounded border bg-transparent px-2 py-1 text-sm font-mono outline-none" style={{ borderColor: "var(--orphix-color-base-border)", color: "var(--orphix-color-text)" }} />
        <button onClick={onPull} disabled={!pullInput.trim()} className="rounded border px-2 py-1 text-sm font-mono disabled:opacity-40" style={{ borderColor: "var(--orphix-color-base-border)", color: "var(--orphix-color-primary)" }}>Pull</button>
      </div>
      {images.map((img) => (
        <div key={img.id} className="group flex items-center gap-2 rounded border px-2 py-1.5 cursor-pointer hover:bg-orphix-hover-subtle"
          style={{ borderColor: "var(--orphix-color-base-border)" }} onContextMenu={(e) => onContext(e, img)}>
          <Image size={14} style={{ color: "var(--orphix-color-text-muted)" }} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-mono font-semibold" style={{ color: "var(--orphix-color-text)" }}>{img.repository}:{img.tag}</div>
            <div className="text-sm font-mono" style={{ color: "var(--orphix-color-text-disabled)" }}>{img.id.slice(0, 12)} · {img.size}</div>
          </div>
          <MoreVertical size={15} className="opacity-0 group-hover:opacity-40 shrink-0" style={{ color: "var(--orphix-color-text-muted)" }} />
        </div>
      ))}
      {images.length === 0 && <p className="text-sm font-mono text-center py-4" style={{ color: "var(--orphix-color-text-disabled)" }}>No images.</p>}
    </div>
  );
}

// ── Placeholder ──

function Placeholder({ title, cmd }: { title: string; cmd: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <p className="text-sm font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{title}</p>
      <p className="text-sm font-mono" style={{ color: "var(--orphix-color-text-disabled)" }}>Run: {cmd}</p>
    </div>
  );
}

// ── Helpers ──

interface CtxItem { label: string; icon?: ReactNode; danger?: boolean; onClick: () => void }

function SmallBtn({ icon, label, danger, onClick }: { icon?: ReactNode; label?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-sm font-mono"
      style={{ borderColor: danger ? "color-mix(in srgb, var(--orphix-color-danger) 25%, transparent)" : "var(--orphix-color-base-border)", color: danger ? "var(--orphix-color-danger)" : "var(--orphix-color-text-muted)" }}>
      {icon}{label}
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-2"><span className="w-16 shrink-0" style={{ color: "var(--orphix-color-text-muted)" }}>{label}</span><span className="truncate" style={{ color: "var(--orphix-color-text)" }}>{value}</span></div>;
}
