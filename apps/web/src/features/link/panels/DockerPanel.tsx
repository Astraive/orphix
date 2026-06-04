import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Box, Image, Play, Square, RotateCcw, Trash2, RefreshCw,
  ScrollText, Info, Terminal, MoreVertical, Layers, Network, HardDrive, CircleDot, X,
} from "lucide-react";
import { useLinkStore } from "../link-store";
import { resolveContextMenuPosition } from "@/lib/context-menu-position";

interface DockerContainer { id: string; name: string; image: string; state: string; status: string; ports: Array<{ private: number; public: number | null; protocol: string }>; }
interface DockerImage { id: string; repository: string; tag: string; size: string; }

const STATE_COLORS: Record<string, string> = {
  running: "text-green-500", exited: "text-muted-foreground", created: "text-blue-500",
  paused: "text-yellow-500", restarting: "text-accent", removing: "text-destructive",
  dead: "text-destructive", unknown: "text-muted-foreground",
};
const STATE_ABBREV: Record<string, string> = {
  running: "R", exited: "E", created: "C", paused: "P", restarting: "RR",
  removing: "RM", dead: "D", unknown: "?",
};

type PopupView = "containers" | "images" | "volumes" | "networks" | "contexts" | "disk";

interface DockerPanelProps { cwd?: string | null; }
export function DockerPanel({ cwd }: DockerPanelProps) {
  const rpc = useLinkStore((s) => s.rpc);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [popup, setPopup] = useState<PopupView | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [logFollowing, setLogFollowing] = useState(false);
  const [pullInput, setPullInput] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: Array<{ label: string; icon: React.ReactNode; danger?: boolean; onClick: () => void }> } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ left: number; top: number } | null>(null);

  const refreshContainers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rpc("docker.ps", { all: true });
      if (Array.isArray(res)) setContainers(res);
      else if (res?.error) { setError(res.error); setAvailable(false); }
    } catch (e: any) { setError(e.message); setAvailable(false); }
    setLoading(false);
  }, [rpc]);

  const refreshImages = useCallback(async () => {
    try {
      const res = await rpc("docker.images");
      if (Array.isArray(res)) setImages(res);
    } catch { /* ignore */ }
  }, [rpc]);

  useEffect(() => { refreshContainers(); const id = setInterval(refreshContainers, 8000); return () => clearInterval(id); }, [refreshContainers]);

  const containerAction = useCallback(async (id: string, action: string) => {
    const method =
      action === "start" ? "docker.start" :
      action === "stop" ? "docker.stop" :
      action === "restart" ? "docker.restart" :
      "docker.remove";
    await rpc(method, action === "remove" ? { id, force: true } : { id });
    await refreshContainers();
  }, [rpc, refreshContainers]);

  const fetchLogs = useCallback(async (id: string) => {
    const res = await rpc("docker.logs", { id, tail: 200 });
    if (typeof res === "string") setLogs(res);
    else if (res?.logs && typeof res.logs === "string") setLogs(res.logs);
  }, [rpc]);

  const openDetail = useCallback(async (id: string) => {
    setDetailId(id);
    await fetchLogs(id);
  }, [fetchLogs]);

  const containerMenu = useCallback((e: React.MouseEvent, c: DockerContainer) => {
    e.preventDefault(); e.stopPropagation();
    const items: Array<{ label: string; icon: React.ReactNode; danger?: boolean; onClick: () => void }> = [
      { label: "View logs", icon: <ScrollText className="h-3.5 w-3.5" />, onClick: () => openDetail(c.id) },
      { label: "Copy ID", icon: <Info className="h-3.5 w-3.5" />, onClick: () => navigator.clipboard.writeText(c.id) },
      { label: "Copy name", icon: <Info className="h-3.5 w-3.5" />, onClick: () => navigator.clipboard.writeText(c.name) },
    ];
    if (c.state === "running") {
      items.push({ label: "Stop", icon: <Square className="h-3.5 w-3.5" />, onClick: () => containerAction(c.id, "stop") });
      items.push({ label: "Restart", icon: <RotateCcw className="h-3.5 w-3.5" />, onClick: () => containerAction(c.id, "restart") });
    } else {
      items.push({ label: "Start", icon: <Play className="h-3.5 w-3.5" />, onClick: () => containerAction(c.id, "start") });
    }
    items.push({ label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, onClick: () => containerAction(c.id, "remove") });
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [openDetail, containerAction]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    setContextMenuPosition(
      resolveContextMenuPosition(
        contextMenu.x,
        contextMenu.y,
        contextMenuRef.current.offsetWidth,
        contextMenuRef.current.offsetHeight,
      ),
    );
  }, [contextMenu]);

  const running = containers.filter((c) => c.state === "running");
  const stopped = containers.filter((c) => c.state !== "running");

  const detailContainer = detailId ? containers.find((c) => c.id === detailId) : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between px-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Box className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Docker</span>
        </div>
        <button onClick={() => { refreshContainers(); refreshImages(); }} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="mx-2 mt-1 flex items-center gap-1 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Icon toolbar */}
      <div className="flex items-center justify-center gap-0.5 border-b border-border px-2 py-1.5 shrink-0">
        {[
          { id: "containers" as PopupView, icon: <Box className="h-4 w-4" />, title: `Containers (${containers.length})` },
          { id: "images" as PopupView, icon: <Image className="h-4 w-4" />, title: `Images (${images.length})` },
          { id: "volumes" as PopupView, icon: <Layers className="h-4 w-4" />, title: "Volumes" },
          { id: "networks" as PopupView, icon: <Network className="h-4 w-4" />, title: "Networks" },
          { id: "contexts" as PopupView, icon: <CircleDot className="h-4 w-4" />, title: "Contexts" },
          { id: "disk" as PopupView, icon: <HardDrive className="h-4 w-4" />, title: "Disk Usage" },
        ].map((item) => (
          <button key={item.id} onClick={() => { setPopup(popup === item.id ? null : item.id); if (item.id === "images" && popup !== "images") refreshImages(); }}
            title={item.title}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${popup === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {item.icon}
          </button>
        ))}
      </div>

      {/* Popup content */}
      {popup && (
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          {popup === "containers" && (
            <div className="flex flex-col gap-0.5">
              {containers.map((c) => (
                <div key={c.id} className="group flex items-center gap-2 rounded border border-border px-2 py-1.5 cursor-pointer hover:bg-accent/5"
                  onClick={() => openDetail(c.id)} onContextMenu={(e) => containerMenu(e, c)}>
                  <span className={`w-5 h-5 shrink-0 rounded flex items-center justify-center text-[10px] font-mono font-bold ${STATE_COLORS[c.state] ?? "text-muted-foreground"} bg-muted/50`}>{STATE_ABBREV[c.state] ?? "?"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-mono font-semibold">{c.name}</div>
                    <div className="truncate text-[10px] font-mono text-muted-foreground">{c.image} · {c.status}</div>
                  </div>
                </div>
              ))}
              {containers.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No containers.</p>}
            </div>
          )}
          {popup === "images" && (
            <div className="flex flex-col gap-0.5">
              <div className="mb-1 flex gap-1">
                <input value={pullInput} onChange={(e) => setPullInput(e.target.value)} placeholder="image:tag"
                  onKeyDown={(e) => { if (e.key === "Enter" && pullInput.trim()) { rpc("docker.pull", { image: pullInput.trim() }); setPullInput(""); } }}
                  className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs font-mono outline-none" />
                <button onClick={() => { if (pullInput.trim()) { rpc("docker.pull", { image: pullInput.trim() }); setPullInput(""); } }}
                  className="rounded border border-border px-2 py-1 text-xs text-primary">Pull</button>
              </div>
              {images.map((img) => (
                <div key={img.id} className="flex items-center gap-2 rounded border border-border px-2 py-1.5">
                  <Image className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-mono font-semibold">{img.repository}:{img.tag}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{img.id.slice(0, 12)} · {img.size}</div>
                  </div>
                </div>
              ))}
              {images.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No images.</p>}
            </div>
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
          {running.length > 0 && (
            <div>
              <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Running ({running.length})</div>
              {running.map((c) => <ContainerRow key={c.id} container={c} onSelect={() => openDetail(c.id)} onContext={(e) => containerMenu(e, c)} />)}
            </div>
          )}
          {stopped.length > 0 && (
            <div>
              <div className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stopped ({stopped.length})</div>
              {stopped.map((c) => <ContainerRow key={c.id} container={c} onSelect={() => openDetail(c.id)} onContext={(e) => containerMenu(e, c)} />)}
            </div>
          )}
          {containers.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No containers.</p>}
        </div>
      )}

      {/* Detail dialog */}
      {detailContainer && (
        <div className="flex-1 min-h-0 overflow-hidden border-t border-border">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
            <span className={`h-2 w-2 rounded-full ${detailContainer.state === "running" ? "bg-green-500" : "bg-muted-foreground"}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{detailContainer.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{detailContainer.image} · {detailContainer.status}</div>
            </div>
            <button onClick={() => setDetailId(null)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex items-center gap-1 border-b border-border px-3 py-1.5 shrink-0">
            {detailContainer.state === "running" ? (
              <SmallBtn icon={<Square className="h-3 w-3" />} label="Stop" onClick={() => containerAction(detailContainer.id, "stop")} />
            ) : (
              <SmallBtn icon={<Play className="h-3 w-3" />} label="Start" onClick={() => containerAction(detailContainer.id, "start")} />
            )}
            <SmallBtn icon={<RotateCcw className="h-3 w-3" />} label="Restart" onClick={() => containerAction(detailContainer.id, "restart")} />
            <SmallBtn icon={<Trash2 className="h-3 w-3" />} label="Delete" danger onClick={() => { containerAction(detailContainer.id, "remove"); setDetailId(null); }} />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex gap-1 mb-2">
              <SmallBtn label="Refresh" onClick={() => fetchLogs(detailContainer.id)} />
              <SmallBtn label="Copy" onClick={() => navigator.clipboard.writeText(logs)} />
            </div>
            <pre className="max-h-[300px] overflow-auto rounded border border-border bg-muted/30 p-2 text-xs leading-relaxed whitespace-pre-wrap font-mono">
              {logs || "No logs."}
            </pre>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-36 rounded border border-border bg-card py-1 shadow-xl"
          style={{ left: contextMenuPosition?.left ?? contextMenu.x, top: contextMenuPosition?.top ?? contextMenu.y }}
        >
          {contextMenu.items.map((item, i) => (
            <button key={i} onClick={item.onClick}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent/10 ${item.danger ? "text-destructive" : ""}`}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ContainerRow({ container, onSelect, onContext }: { container: DockerContainer; onSelect: () => void; onContext: (e: React.MouseEvent) => void }) {
  const ports = container.ports.filter((p) => p.public != null).map((p) => `${p.public}:${p.private}`).join(", ");
  return (
    <div className="group flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-accent/5 transition-colors" onClick={onSelect} onContextMenu={onContext}>
      <span className={`w-5 h-5 shrink-0 rounded flex items-center justify-center text-[10px] font-mono font-bold ${STATE_COLORS[container.state] ?? "text-muted-foreground"} bg-muted/50`}>{STATE_ABBREV[container.state] ?? "?"}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-mono font-semibold">{container.name}</div>
        <div className="truncate text-[10px] font-mono text-muted-foreground">{container.image}{ports ? ` · ${ports}` : ""}</div>
      </div>
      <MoreVertical className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-40 text-muted-foreground" />
    </div>
  );
}

function SmallBtn({ icon, label, danger, onClick }: { icon?: React.ReactNode; label?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-mono ${danger ? "border-destructive/30 text-destructive" : "border-border text-muted-foreground hover:text-foreground"}`}>
      {icon}{label}
    </button>
  );
}

function Placeholder({ title, cmd }: { title: string; cmd: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-[10px] font-mono text-muted-foreground/50">Run: {cmd}</p>
    </div>
  );
}
