import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Box,
  Copy,
  HardDrive,
  Image,
  Layers,
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
import type { DockerContainer, DockerContainerState, DockerImage } from "@shared/types/docker";

const STATE_COLORS: Record<DockerContainerState, string> = {
  running: "var(--orphix-color-success)",
  exited: "var(--orphix-color-text-muted)",
  created: "var(--orphix-color-info)",
  paused: "var(--orphix-color-warning)",
  restarting: "var(--orphix-color-accent)",
  removing: "var(--orphix-color-danger)",
  dead: "var(--orphix-color-danger)",
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
  const {
    containers, images, loading, error, available,
    selectedContainerId, inspectData, logs, logLines, stats,
    logFollowing, activeTab,
    checkAvailable, refreshContainers, refreshImages, refreshAll,
    startContainer, stopContainer, restartContainer, removeContainer,
    selectContainer, setActiveTab, fetchLogs, startLogFollow, stopLogFollow,
    fetchStats, execIntoContainer, removeImage, pullImage,
  } = useDockerStore();

  const [popup, setPopup] = useState<PopupView | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pullInput, setPullInput] = useState("");

  useAutoRefresh(() => { if (available) refreshContainers(); }, 8000, [available]);
  useEffect(() => { checkAvailable(); }, [checkAvailable]);

  const running = useMemo(() => containers.filter((c) => c.state === "running"), [containers]);
  const stopped = useMemo(() => containers.filter((c) => c.state !== "running"), [containers]);

  const openDetail = useCallback(async (id: string, tab: "logs" | "inspect" | "stats" = "logs") => {
    setDetailId(id);
    await selectContainer(id);
    setActiveTab(tab);
    if (tab === "logs") await fetchLogs(id);
    if (tab === "stats") await fetchStats();
  }, [selectContainer, setActiveTab, fetchLogs, fetchStats]);

  const closeDetail = useCallback(() => { setDetailId(null); selectContainer(null); }, [selectContainer]);

  if (!available && !loading) {
    return (
      <div className="flex h-full flex-col">
        <Header loading={false} onRefresh={checkAvailable} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <AlertCircle size={20} style={{ color: "var(--orphix-color-text-muted)" }} />
          <p className="text-[10px] font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{error || "Docker not available"}</p>
          <button onClick={checkAvailable} className="text-[10px] font-mono px-2 py-1 rounded border" style={{ borderColor: "var(--orphix-color-base-border)", color: "var(--orphix-color-primary)" }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header loading={loading} onRefresh={refreshAll} />

      {error && (
        <div className="mx-2 mt-1 flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono"
          style={{ background: "color-mix(in srgb, var(--orphix-color-danger) 8%, transparent)", color: "var(--orphix-color-danger)" }}>
          <AlertCircle size={10} /><span className="truncate">{error}</span>
        </div>
      )}

      {/* Icon toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 shrink-0" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        <ToolbarIcon icon={<Box size={12} />} label={`Containers (${containers.length})`} active={popup === "containers"} onClick={() => setPopup(popup === "containers" ? null : "containers")} />
        <ToolbarIcon icon={<Image size={12} />} label={`Images (${images.length})`} active={popup === "images"} onClick={() => { setPopup(popup === "images" ? null : "images"); if (popup !== "images") refreshImages(); }} />
        <ToolbarIcon icon={<Layers size={12} />} label="Volumes" active={popup === "volumes"} onClick={() => setPopup(popup === "volumes" ? null : "volumes")} />
        <ToolbarIcon icon={<Network size={12} />} label="Networks" active={popup === "networks"} onClick={() => setPopup(popup === "networks" ? null : "networks")} />
        <ToolbarIcon icon={<HardDrive size={12} />} label="Disk" active={popup === "disk"} onClick={() => setPopup(popup === "disk" ? null : "disk")} />
      </div>

      {/* Popup content */}
      {popup && (
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          {popup === "containers" && (
            <ContainersPopup containers={containers} running={running} stopped={stopped} selectedId={detailId}
              onOpen={(id) => openDetail(id)} onStart={(id) => startContainer(id)} onStop={(id) => stopContainer(id)}
              onRestart={(id) => restartContainer(id)} onRemove={(id) => removeContainer(id, true)} onShell={(id) => execIntoContainer(id)} />
          )}
          {popup === "images" && (
            <ImagesPopup images={images} pullInput={pullInput} onPullInput={setPullInput}
              onPull={() => { if (pullInput.trim()) { pullImage(pullInput.trim()); setPullInput(""); } }}
              onRemove={(id) => removeImage(id, true)} />
          )}
          {popup === "volumes" && <PlaceholderPopup title="Volumes" description="docker volume ls" />}
          {popup === "networks" && <PlaceholderPopup title="Networks" description="docker network ls" />}
          {popup === "disk" && <PlaceholderPopup title="Disk Usage" description="docker system df" />}
        </div>
      )}

      {/* Default view */}
      {!popup && !detailId && (
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          <QuickContainerList running={running} stopped={stopped} onSelect={(id) => openDetail(id)} onShell={(id) => execIntoContainer(id)} />
        </div>
      )}

      {/* Container detail dialog */}
      {detailId && (
        <ContainerDetailDialog containerId={detailId} containers={containers} inspectData={inspectData}
          logs={logs} logLines={logLines} stats={stats} activeTab={activeTab} logFollowing={logFollowing}
          onClose={closeDetail}
          onTabChange={(tab) => { setActiveTab(tab); if (tab === "logs") fetchLogs(detailId); if (tab === "stats") fetchStats(); }}
          onStart={() => startContainer(detailId)} onStop={() => stopContainer(detailId)}
          onRestart={() => restartContainer(detailId)} onDelete={() => { removeContainer(detailId, true); closeDetail(); }}
          onShell={() => execIntoContainer(detailId)}
          onRefreshLogs={() => fetchLogs(detailId)}
          onFollowLogs={() => logFollowing ? stopLogFollow(detailId) : startLogFollow(detailId)} />
      )}
    </div>
  );
}

/* ── Header ── */

function Header({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between px-3" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
      <div className="flex items-center gap-1.5">
        <Box size={11} style={{ color: "var(--orphix-color-primary)" }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--orphix-color-primary)" }}>Docker</span>
      </div>
      <button onClick={onRefresh} className="flex h-5 w-5 items-center justify-center rounded hover:bg-orphix-hover-medium" title="Refresh">
        <RefreshCw size={10} className={loading ? "animate-spin" : ""} style={{ color: "var(--orphix-color-text-muted)" }} />
      </button>
    </div>
  );
}

/* ── Toolbar Icon ── */

function ToolbarIcon({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label}
      className="flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-mono transition-colors"
      style={{ color: active ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)", background: active ? "color-mix(in srgb, var(--orphix-color-primary) 10%, transparent)" : "transparent" }}>
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* ── Quick Container List ── */

function QuickContainerList({ running, stopped, onSelect, onShell }: { running: DockerContainer[]; stopped: DockerContainer[]; onSelect: (id: string) => void; onShell: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      {running.length > 0 && (
        <div>
          <div className="text-[9px] font-mono uppercase tracking-wider px-1 py-1" style={{ color: "var(--orphix-color-text-muted)" }}>Running ({running.length})</div>
          {running.map((c) => <ContainerRow key={c.id} container={c} onSelect={() => onSelect(c.id)} onShell={() => onShell(c.id)} />)}
        </div>
      )}
      {stopped.length > 0 && (
        <div>
          <div className="text-[9px] font-mono uppercase tracking-wider px-1 py-1" style={{ color: "var(--orphix-color-text-muted)" }}>Stopped ({stopped.length})</div>
          {stopped.map((c) => <ContainerRow key={c.id} container={c} onSelect={() => onSelect(c.id)} onShell={() => onShell(c.id)} />)}
        </div>
      )}
      {running.length === 0 && stopped.length === 0 && <p className="text-[10px] font-mono text-center py-8" style={{ color: "var(--orphix-color-text-disabled)" }}>No containers.</p>}
    </div>
  );
}

/* ── Container Row ── */

function ContainerRow({ container, onSelect, onShell }: { container: DockerContainer; onSelect: () => void; onShell: () => void }) {
  const ports = container.ports.filter((p) => p.public !== null).map((p) => `${p.public}:${p.private}`).join(", ");
  return (
    <div className="group flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-orphix-hover-subtle transition-colors" onClick={onSelect}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATE_COLORS[container.state] }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[10px] font-mono font-semibold" style={{ color: "var(--orphix-color-text)" }}>{container.name}</span>
          <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded shrink-0" style={{ color: STATE_COLORS[container.state], background: `color-mix(in srgb, ${STATE_COLORS[container.state]} 10%, transparent)` }}>{container.state}</span>
        </div>
        <div className="truncate text-[9px] font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{container.image}{ports ? ` · ${ports}` : ""}</div>
      </div>
      {container.state === "running" && (
        <button onClick={(e) => { e.stopPropagation(); onShell(); }} className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded hover:bg-orphix-hover-medium transition-opacity" title="Shell">
          <Terminal size={10} style={{ color: "var(--orphix-color-primary)" }} />
        </button>
      )}
    </div>
  );
}

/* ── Containers Popup ── */

function ContainersPopup({ containers, running, stopped, selectedId, onOpen, onStart, onStop, onRestart, onRemove, onShell }: {
  containers: DockerContainer[]; running: DockerContainer[]; stopped: DockerContainer[]; selectedId: string | null;
  onOpen: (id: string) => void; onStart: (id: string) => void; onStop: (id: string) => void; onRestart: (id: string) => void; onRemove: (id: string) => void; onShell: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {containers.map((c) => (
        <div key={c.id} className="group rounded border px-2 py-1.5" style={{ borderColor: selectedId === c.id ? STATE_COLORS[c.state] : "var(--orphix-color-base-border)" }}>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATE_COLORS[c.state] }} />
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onOpen(c.id)}>
              <div className="truncate text-[10px] font-mono font-semibold" style={{ color: "var(--orphix-color-text)" }}>{c.name}</div>
              <div className="truncate text-[9px] font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{c.image} · {c.status}</div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {c.state === "running" ? (
                <>
                  <SmallBtn icon={<ScrollText size={9} />} title="Logs" onClick={() => onOpen(c.id)} />
                  <SmallBtn icon={<Terminal size={9} />} title="Shell" onClick={() => onShell(c.id)} />
                  <SmallBtn icon={<Square size={9} />} title="Stop" onClick={() => onStop(c.id)} />
                  <SmallBtn icon={<RotateCcw size={9} />} title="Restart" onClick={() => onRestart(c.id)} />
                </>
              ) : (
                <>
                  <SmallBtn icon={<Play size={9} />} title="Start" onClick={() => onStart(c.id)} />
                  <SmallBtn icon={<Trash2 size={9} />} title="Remove" danger onClick={() => onRemove(c.id)} />
                </>
              )}
            </div>
          </div>
        </div>
      ))}
      {containers.length === 0 && <p className="text-[10px] font-mono text-center py-4" style={{ color: "var(--orphix-color-text-disabled)" }}>No containers.</p>}
    </div>
  );
}

/* ── Images Popup ── */

function ImagesPopup({ images, pullInput, onPullInput, onPull, onRemove }: { images: DockerImage[]; pullInput: string; onPullInput: (v: string) => void; onPull: () => void; onRemove: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1 mb-1">
        <input value={pullInput} onChange={(e) => onPullInput(e.target.value)} placeholder="image:tag" onKeyDown={(e) => { if (e.key === "Enter") onPull(); }}
          className="flex-1 min-w-0 rounded border bg-transparent px-2 py-1 text-[10px] font-mono outline-none" style={{ borderColor: "var(--orphix-color-base-border)", color: "var(--orphix-color-text)" }} />
        <button onClick={onPull} disabled={!pullInput.trim()} className="rounded border px-2 py-1 text-[9px] font-mono disabled:opacity-40" style={{ borderColor: "var(--orphix-color-base-border)", color: "var(--orphix-color-primary)" }}>Pull</button>
      </div>
      {images.map((img) => (
        <div key={img.id} className="group flex items-center gap-2 rounded border px-2 py-1.5" style={{ borderColor: "var(--orphix-color-base-border)" }}>
          <Image size={11} style={{ color: "var(--orphix-color-text-muted)" }} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-mono font-semibold" style={{ color: "var(--orphix-color-text)" }}>{img.repository}:{img.tag}</div>
            <div className="text-[9px] font-mono" style={{ color: "var(--orphix-color-text-disabled)" }}>{img.id.slice(0, 12)} · {img.size}</div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <SmallBtn icon={<Copy size={9} />} title="Copy tag" onClick={() => navigator.clipboard.writeText(`${img.repository}:${img.tag}`)} />
            <SmallBtn icon={<Trash2 size={9} />} title="Remove" danger onClick={() => onRemove(img.id)} />
          </div>
        </div>
      ))}
      {images.length === 0 && <p className="text-[10px] font-mono text-center py-4" style={{ color: "var(--orphix-color-text-disabled)" }}>No images.</p>}
    </div>
  );
}

/* ── Placeholder Popup ── */

function PlaceholderPopup({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <p className="text-[10px] font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{title}</p>
      <p className="text-[9px] font-mono" style={{ color: "var(--orphix-color-text-disabled)" }}>Run: {description}</p>
    </div>
  );
}

/* ── Container Detail Dialog ── */

function ContainerDetailDialog({ containerId, containers, inspectData, logs, logLines, stats, activeTab, logFollowing, onClose, onTabChange, onStart, onStop, onRestart, onDelete, onShell, onRefreshLogs, onFollowLogs }: {
  containerId: string; containers: DockerContainer[]; inspectData: ReturnType<typeof useDockerStore.getState>["inspectData"]; logs: string;
  logLines: ReturnType<typeof useDockerStore.getState>["logLines"]; stats: ReturnType<typeof useDockerStore.getState>["stats"];
  activeTab: "logs" | "inspect" | "stats"; logFollowing: boolean; onClose: () => void;
  onTabChange: (tab: "logs" | "inspect" | "stats") => void; onStart: () => void; onStop: () => void; onRestart: () => void;
  onDelete: () => void; onShell: () => void; onRefreshLogs: () => void; onFollowLogs: () => void;
}) {
  const container = containers.find((c) => c.id === containerId);
  if (!container) return null;
  const logText = logLines.length > 0 ? logLines.map((l) => `${l.timestamp ? `${l.timestamp} ` : ""}${l.text}`).join("\n") : logs;
  const currentStats = stats.find((s) => s.containerId === containerId || s.name === container.name);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 p-3">
      <div className="flex max-h-[85vh] w-[min(680px,96vw)] flex-col rounded border shadow-2xl" style={{ borderColor: "var(--orphix-color-base-border)", background: "var(--orphix-color-base-background)" }}>
        <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATE_COLORS[container.state] }} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-semibold" style={{ color: "var(--orphix-color-text)" }}>{container.name}</div>
            <div className="truncate text-[9px] font-mono" style={{ color: "var(--orphix-color-text-muted)" }}>{container.image} · {container.status}</div>
          </div>
          <button onClick={onClose} className="flex h-5 w-5 items-center justify-center rounded hover:bg-orphix-hover-medium"><X size={11} style={{ color: "var(--orphix-color-text-muted)" }} /></button>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 shrink-0" style={{ borderBottom: "1px solid var(--orphix-color-base-border)" }}>
          {container.state === "running" ? <SmallBtn icon={<Square size={9} />} label="Stop" onClick={onStop} /> : <SmallBtn icon={<Play size={9} />} label="Start" onClick={onStart} />}
          <SmallBtn icon={<RotateCcw size={9} />} label="Restart" onClick={onRestart} />
          <SmallBtn icon={<Terminal size={9} />} label="Shell" onClick={onShell} />
          <SmallBtn icon={<Trash2 size={9} />} label="Delete" danger onClick={onDelete} />
        </div>
        <div className="flex px-3 pt-1.5 shrink-0">
          {(["logs", "inspect", "stats"] as const).map((tab) => (
            <button key={tab} onClick={() => onTabChange(tab)} className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider"
              style={{ color: activeTab === tab ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)", borderBottom: activeTab === tab ? "2px solid var(--orphix-color-primary)" : "2px solid transparent" }}>{tab}</button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-3 py-2">
          {activeTab === "logs" && (
            <div>
              <div className="flex gap-1 mb-2">
                <SmallBtn label="Refresh" onClick={onRefreshLogs} />
                <SmallBtn label={logFollowing ? "Stop" : "Follow"} onClick={onFollowLogs} />
                <SmallBtn icon={<Copy size={9} />} label="Copy" onClick={() => navigator.clipboard.writeText(logText)} />
              </div>
              <pre className="max-h-[300px] overflow-auto rounded border p-2 text-[10px] leading-relaxed whitespace-pre-wrap" style={{ borderColor: "var(--orphix-color-base-border)", background: "var(--orphix-color-base-surface-deep)", color: "var(--orphix-color-text)" }}>{logText || "No logs."}</pre>
            </div>
          )}
          {activeTab === "inspect" && <pre className="max-h-[400px] overflow-auto rounded border p-2 text-[10px] leading-relaxed whitespace-pre-wrap" style={{ borderColor: "var(--orphix-color-base-border)", background: "var(--orphix-color-base-surface-deep)", color: "var(--orphix-color-text)" }}>{inspectData?.raw || "Loading..."}</pre>}
          {activeTab === "stats" && (
            <div className="grid gap-2 text-[10px] font-mono">
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
    </div>
  );
}

/* ── Helpers ── */

function SmallBtn({ icon, label, danger, onClick }: { icon?: ReactNode; label?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-mono"
      style={{ borderColor: danger ? "color-mix(in srgb, var(--orphix-color-danger) 25%, transparent)" : "var(--orphix-color-base-border)", color: danger ? "var(--orphix-color-danger)" : "var(--orphix-color-text-muted)" }}>
      {icon}{label}
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-2"><span className="w-16 shrink-0" style={{ color: "var(--orphix-color-text-muted)" }}>{label}</span><span className="truncate" style={{ color: "var(--orphix-color-text)" }}>{value}</span></div>;
}
