import { useCallback, useEffect, useState } from "react";
import {
  GitBranch, RefreshCw, Cloud, Download, Upload, RotateCcw,
  Plus, Minus, Archive, PackageOpen, Trash2, Check, X,
} from "lucide-react";
import { useLinkStore } from "../link-store";

interface GitFile { path: string; status: string; staged: boolean; additions?: number; deletions?: number; }
interface GitBranch { name: string; is_current: boolean; is_remote: boolean; }
interface GitStash { index: number; name: string; message: string; }
interface GitStatus { branch: string | null; files: GitFile[]; ahead: number; behind: number; }

interface GitPanelProps { cwd?: string | null; }
export function GitPanel({ cwd: externalCwd }: GitPanelProps) {
  const rpc = useLinkStore((s) => s.rpc);
  const [cwd, setCwd] = useState("~");
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [stashes, setStashes] = useState<GitStash[]>([]);
  const [showBranches, setShowBranches] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  // Sync CWD from active terminal
  useEffect(() => {
    if (externalCwd && externalCwd !== cwd) {
      setCwd(externalCwd);
    }
  }, [externalCwd]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b, st] = await Promise.all([
        rpc("git.status", {}, cwd),
        rpc("git.branches", {}, cwd),
        rpc("git.stash_list", {}, cwd),
      ]);
      setStatus(s ?? { branch: null, files: [], ahead: 0, behind: 0 });
      setBranches(Array.isArray(b) ? b : []);
      setStashes(Array.isArray(st) ? st : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [cwd, rpc]);

  useEffect(() => { refresh(); }, [cwd]);

  const gitAction = useCallback(async (method: string, params: Record<string, any> = {}) => {
    await rpc(method, params, cwd);
    await refresh();
  }, [cwd, rpc, refresh]);

  const statusColor = (s: string) => {
    switch (s) {
      case "M": return "text-yellow-500";
      case "A": return "text-green-500";
      case "D": return "text-red-500";
      case "R": return "text-blue-500";
      case "?": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  const stagedFiles = status?.files.filter((f) => f.staged) ?? [];
  const unstagedFiles = status?.files.filter((f) => !f.staged) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Source Control</span>
        <div className="flex gap-0.5">
          <button onClick={refresh} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => gitAction("git.fetch")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Fetch">
            <Cloud className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => gitAction("git.pull")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Pull">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => gitAction("git.push")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Push">
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => gitAction("git.sync")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Sync">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Branch selector */}
      <div className="border-b border-border px-3 py-2 shrink-0">
        <button onClick={() => setShowBranches(!showBranches)} className="flex w-full items-center gap-2 text-xs font-mono">
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left">{status?.branch ?? "No branch"}</span>
          {(status?.ahead ?? 0) > 0 && <span className="text-xs text-accent">↑{status?.ahead}</span>}
          {(status?.behind ?? 0) > 0 && <span className="text-xs text-muted-foreground">↓{status?.behind}</span>}
          <span className="text-muted-foreground text-[10px]">{showBranches ? "▲" : "▼"}</span>
        </button>
        {showBranches && (
          <div className="mt-1.5 space-y-0.5">
            {branches.filter((b) => !b.is_remote).map((b) => (
              <button key={b.name} onClick={() => { gitAction("git.checkout", { branch: b.name }); setShowBranches(false); }}
                className={`w-full rounded px-2 py-1 text-left text-xs font-mono ${b.is_current ? "bg-accent/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/5"}`}>
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 border-b border-border px-3 py-1.5 shrink-0">
        <button onClick={() => gitAction("git.stage_all")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Stage All">
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => gitAction("git.unstage_all")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Unstage All">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => gitAction("git.stash_push")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Stash">
          <Archive className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => gitAction("git.stash_pop")} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Pop Stash">
          <PackageOpen className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { if (confirm("Discard all changes?")) gitAction("git.discard_all"); }} className="flex h-6 w-6 items-center justify-center rounded text-destructive/60 hover:text-destructive" title="Discard All">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <span className="flex-1" />
        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]" title={cwd}>{cwd}</span>
      </div>

      {/* Commit */}
      <div className="border-b border-border px-3 py-2 shrink-0">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          className="w-full resize-none bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground/40"
          rows={2}
        />
        <button
          onClick={() => { if (commitMessage.trim()) { gitAction("git.commit", { message: commitMessage }); setCommitMessage(""); } }}
          disabled={!commitMessage.trim() || stagedFiles.length === 0}
          className="mt-1 w-full rounded bg-accent/10 py-1.5 text-xs font-mono text-primary hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Commit ({stagedFiles.length} staged)
        </button>
      </div>

      {/* File lists */}
      <div className="flex-1 overflow-y-auto">
        {stagedFiles.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Staged Changes</div>
            {stagedFiles.map((f) => (
              <div key={`s-${f.path}`} className="group flex items-center gap-2 px-3 py-1 text-xs font-mono hover:bg-accent/5">
                <span className={`w-4 text-center font-bold ${statusColor(f.status)}`}>{f.status}</span>
                <span className="flex-1 truncate text-muted-foreground">{f.path.split("/").pop()}</span>
                {f.additions != null && <span className="text-green-500">+{f.additions}</span>}
                {(f.deletions ?? 0) > 0 && <span className="text-red-500">-{f.deletions}</span>}
                <button onClick={() => gitAction("git.unstage", { files: [f.path] })} className="text-muted-foreground hover:text-foreground"><Minus className="h-3 w-3" /></button>
                <button onClick={() => { if (confirm(`Discard ${f.path}?`)) gitAction("git.discard", { files: [f.path] }); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
        {unstagedFiles.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Changes</div>
            {unstagedFiles.map((f) => (
              <div key={`u-${f.path}`} className="group flex items-center gap-2 px-3 py-1 text-xs font-mono hover:bg-accent/5">
                <span className={`w-4 text-center font-bold ${statusColor(f.status)}`}>{f.status}</span>
                <span className="flex-1 truncate text-muted-foreground">{f.path.split("/").pop()}</span>
                {f.additions != null && <span className="text-green-500">+{f.additions}</span>}
                {(f.deletions ?? 0) > 0 && <span className="text-red-500">-{f.deletions}</span>}
                <button onClick={() => gitAction("git.stage", { files: [f.path] })} className="text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></button>
                <button onClick={() => { if (confirm(`Discard ${f.path}?`)) gitAction("git.discard", { files: [f.path] }); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
        {status && status.files.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground/40 font-mono">No changes</p>
        )}
        {stashes.length > 0 && (
          <div className="border-t border-border/60">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stashes</div>
            {stashes.map((s) => (
              <div key={s.name} className="group flex items-center gap-2 px-3 py-1 text-xs font-mono hover:bg-accent/5">
                <Archive className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-muted-foreground">{s.message}</span>
                <button onClick={() => gitAction("git.stash_apply", { stash: s.name })} className="text-muted-foreground hover:text-foreground"><Check className="h-3 w-3" /></button>
                <button onClick={() => gitAction("git.stash_drop", { stash: s.name })} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
