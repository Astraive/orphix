import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import {
  Archive,
  Check,
  Cloud,
  Download,
  GitBranch,
  LogOut,
  Minus,
  PackageOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { useGitStore } from "../stores/git-store";
import { invoke } from "@/lib/ipc-client";
import { CHANNELS } from "@shared/ipc/channels";
import type { GitFile } from "@shared/types/common";
import { useFocusedTerminalCwd } from "../../workspace/hooks/use-focused-terminal-cwd";
import { getWorkspaceCwd } from "../../workspace/lib/workspace-cwd";

interface Branch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

export function GitPanel() {
  const {
    branch,
    files,
    ahead,
    behind,
    commitMessage,
    stashes,
    refresh,
    watch,
    unwatch,
    stage,
    unstage,
    commit,
    checkout,
    fetch,
    pull,
    push,
    sync,
    stageAll,
    unstageAll,
    discard,
    discardAll,
    stashPush,
    stashPop,
    stashApply,
    stashDrop,
    setCommitMessage,
  } = useGitStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showBranches, setShowBranches] = useState(false);
  const [cwd, setCwd] = useState<string>("");
  const [gitUser, setGitUser] = useState<string | null>(null);
  const [ghUser, setGhUser] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const focusedTerminalCwd = useFocusedTerminalCwd();

  useEffect(() => {
    let cancelled = false;

    const syncCwd = async () => {
      const nextCwd = focusedTerminalCwd ?? await getWorkspaceCwd();
      if (cancelled || nextCwd === cwd) return;

      setCwd(nextCwd);
      await watch(nextCwd);
      const branchList = await invoke<Branch[]>(CHANNELS.GIT_BRANCHES, { cwd: nextCwd });
      if (!cancelled) setBranches(branchList);
    };

    syncCwd().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [cwd, focusedTerminalCwd, watch]);

  useEffect(() => () => { unwatch(); }, [unwatch]);

  useEffect(() => {
    const orphix = (window.orphix as unknown) as Record<string, unknown>;
    const authApi = orphix?.auth as { getStatus?: () => Promise<{ user?: { login?: string; name?: string } | null }> } | undefined;
    authApi?.getStatus?.().then((auth) => {
      if (auth.user?.login) setGitUser(auth.user.login);
      else if (auth.user?.name) setGitUser(auth.user.name);
    }).catch(() => {});
  }, []);

  // Fetch gh CLI user
  useEffect(() => {
    if (!cwd) return;
    invoke<{ stdout: string } | null>("git:exec", { cwd, args: ["auth", "status", "-t"] }).then((result) => {
      if (result?.stdout) {
        const match = result.stdout.match(/Logged in to github\.com account (\S+)/);
        if (match) setGhUser(match[1]);
      }
    }).catch(() => {});
  }, [cwd]);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const close = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [showUserMenu]);

  const handleRefresh = useCallback(async () => {
    if (cwd) {
      await refresh(cwd);
      const branchList = await invoke<Branch[]>(CHANNELS.GIT_BRANCHES, { cwd });
      setBranches(branchList);
    }
  }, [cwd, refresh]);

  const handleStage = useCallback(async (file: GitFile) => {
    if (cwd) await stage(cwd, [file.path]);
  }, [cwd, stage]);

  const handleUnstage = useCallback(async (file: GitFile) => {
    if (cwd) await unstage(cwd, [file.path]);
  }, [cwd, unstage]);

  const handleCommit = useCallback(async () => {
    if (cwd) await commit(cwd);
  }, [cwd, commit]);

  const handleCheckout = useCallback(async (b: string) => {
    if (cwd) {
      await checkout(cwd, b);
      setShowBranches(false);
      const branchList = await invoke<Branch[]>(CHANNELS.GIT_BRANCHES, { cwd });
      setBranches(branchList);
    }
  }, [cwd, checkout]);

  const handleAction = useCallback(async (action: (cwd: string) => Promise<void>) => {
    if (cwd) await action(cwd);
  }, [cwd]);

  const handleDiscardAll = useCallback(async () => {
    if (!cwd || !window.confirm("Discard all local changes and remove untracked files?")) return;
    await discardAll(cwd);
  }, [cwd, discardAll]);

  const handleDiscardFile = useCallback(async (file: GitFile) => {
    if (!cwd || !window.confirm(`Discard changes in ${file.path}?`)) return;
    await discard(cwd, [file.path]);
  }, [cwd, discard]);

  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);

  const statusColor = (status: string) => {
    switch (status) {
      case "M": return "var(--orphix-color-warning)";
      case "A": return "var(--orphix-color-success)";
      case "D": return "var(--orphix-color-danger)";
      case "R": return "var(--orphix-color-info)";
      case "??": return "var(--orphix-color-secondary)";
      default: return "var(--orphix-color-text-subtle)";
    }
  };

  return (
    <div className="h-full flex flex-col anim-slide-up">
      <div className="px-3 py-2 flex items-center justify-between border-b border-ox-border">
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 text-sm tracking-[0.15em] uppercase text-ox-accent font-semibold hover:text-ox-text transition-colors"
            title={ghUser ? `GitHub: @${ghUser}` : "Source Control"}
          >
            {ghUser ? <User size={14} /> : null}
            <span className="truncate max-w-[140px]">{ghUser ?? gitUser ?? "Source Control"}</span>
          </button>
          {showUserMenu && (
            <div className="absolute left-0 top-full mt-1 z-[200] min-w-[200px] py-1.5 rounded-xl shadow-xl anim-scale-in"
              style={{
                background: "color-mix(in srgb, var(--orphix-color-base-background) 95%, transparent)",
                border: "1px solid var(--orphix-color-base-border)",
                backdropFilter: "blur(16px)",
              }}>
              {ghUser && (
                <div className="px-4 py-2 text-sm font-mono border-b" style={{ borderColor: "var(--orphix-color-base-border)", color: "var(--orphix-color-text-subtle)" }}>
                  Signed in as <strong>@{ghUser}</strong>
                </div>
              )}
              <button className="w-full px-4 py-2 text-sm font-mono text-left flex items-center gap-3 hover:bg-ox-accent/10 transition-colors" style={{ color: "var(--orphix-color-text-subtle)" }}
                onClick={async () => {
                  setShowUserMenu(false);
                  try { await invoke("git:exec", { cwd, args: ["auth", "login", "-w"] }); } catch {}
                }}>
                <User size={16} /> <span>{ghUser ? "Switch Account" : "Login with GitHub"}</span>
              </button>
              {ghUser && (
                <button className="w-full px-4 py-2 text-sm font-mono text-left flex items-center gap-3 hover:bg-ox-accent/10 transition-colors" style={{ color: "var(--orphix-color-danger)" }}
                  onClick={async () => {
                    setShowUserMenu(false);
                    try { await invoke("git:exec", { cwd, args: ["auth", "logout"] }); setGhUser(null); } catch {}
                  }}>
                  <LogOut size={16} /> <span>Logout</span>
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <IconButton title="Refresh" onClick={handleRefresh}><RefreshCw size={16} /></IconButton>
          <IconButton title="Fetch" onClick={() => handleAction(fetch)}><Cloud size={16} /></IconButton>
          <IconButton title="Pull" onClick={() => handleAction(pull)}><Download size={16} /></IconButton>
          <IconButton title="Push" onClick={() => handleAction(push)}><Upload size={16} /></IconButton>
          <IconButton title="Sync" onClick={() => handleAction(sync)}><RotateCcw size={16} /></IconButton>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-ox-border">
        <button onClick={() => setShowBranches(!showBranches)} className="flex items-center gap-2 text-sm font-mono text-ox-text w-full">
          <GitBranch size={16} />
          <span className="flex-1 text-left truncate">{branch ?? "No branch"}</span>
          {ahead > 0 && <span className="text-ox-accent">↑{ahead}</span>}
          {behind > 0 && <span className="text-ox-muted">↓{behind}</span>}
          <span className="text-ox-muted text-sm">{showBranches ? "▲" : "▼"}</span>
        </button>
        {showBranches && (
          <div className="mt-2 space-y-0.5">
            {branches.map((b) => (
              <button
                key={b.name}
                onClick={() => handleCheckout(b.name)}
                className={`w-full text-left px-2 py-1.5 text-sm font-mono rounded transition-colors ${
                  b.isCurrent ? "bg-ox-accent/10 text-ox-accent" : "text-ox-text-dim hover:bg-orphix-hover-subtle"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-b border-ox-border">
        <div className="flex gap-1">
          <IconButton title="Stage all" onClick={() => handleAction(stageAll)}><Plus size={16} /></IconButton>
          <IconButton title="Unstage all" onClick={() => handleAction(unstageAll)}><Minus size={16} /></IconButton>
          <IconButton title="Stash changes" onClick={() => handleAction((root) => stashPush(root))}><Archive size={16} /></IconButton>
          <IconButton title="Pop stash" onClick={() => handleAction(stashPop)}><PackageOpen size={16} /></IconButton>
          <IconButton title="Discard all" onClick={handleDiscardAll}><Trash2 size={16} /></IconButton>
        </div>
        {cwd && (
          <div className="mt-1 truncate text-sm font-mono text-ox-muted/50" title={cwd}>
            {cwd}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-b border-ox-border">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          className="w-full bg-transparent text-sm font-mono text-ox-text outline-none resize-none placeholder:text-ox-muted/40"
          rows={2}
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || stagedFiles.length === 0}
          className="mt-1 w-full py-2 text-sm font-mono rounded bg-ox-accent/10 text-ox-accent hover:bg-ox-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Commit ({stagedFiles.length} staged)
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {stagedFiles.length > 0 && (
          <div>
            <div className="px-3 py-1 text-sm tracking-wider uppercase text-ox-muted font-semibold">Staged Changes</div>
            {stagedFiles.map((f) => (
              <FileRow key={`s-${f.path}`} file={f} staged onUnstage={() => handleUnstage(f)} onDiscard={() => handleDiscardFile(f)} statusColor={statusColor} />
            ))}
          </div>
        )}
        {unstagedFiles.length > 0 && (
          <div>
            <div className="px-3 py-1 text-sm tracking-wider uppercase text-ox-muted font-semibold">Changes</div>
            {unstagedFiles.map((f) => (
              <FileRow key={`u-${f.path}`} file={f} staged={false} onStage={() => handleStage(f)} onDiscard={() => handleDiscardFile(f)} statusColor={statusColor} />
            ))}
          </div>
        )}
        {files.length === 0 && (
          <div className="px-3 py-4 text-sm text-ox-muted/40 font-mono text-center">No changes</div>
        )}
        {stashes.length > 0 && (
          <div className="border-t border-ox-border/60">
            <div className="px-3 py-1 text-sm tracking-wider uppercase text-ox-muted font-semibold">Stashes</div>
            {stashes.map((stash) => (
              <div key={stash.name} className="flex items-center gap-2 px-3 py-1 text-sm font-mono hover:bg-orphix-hover-subtle group">
                <Archive size={14} className="text-ox-muted" />
                <span className="flex-1 truncate text-ox-text-dim" title={`${stash.name}: ${stash.message}`}>
                  {stash.message}
                </span>
                <IconButton title="Apply stash" onClick={() => cwd && stashApply(cwd, stash.name)}><Check size={16} /></IconButton>
                <IconButton title="Drop stash" onClick={() => cwd && stashDrop(cwd, stash.name)}><X size={16} /></IconButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FileRow({ file, staged, onStage, onUnstage, onDiscard, statusColor }: {
  file: GitFile; staged: boolean; onStage?: () => void; onUnstage?: () => void; onDiscard?: () => void;
  statusColor: (s: string) => string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm font-mono hover:bg-orphix-hover-subtle transition-colors group">
      <span className="w-5 text-center text-sm font-bold shrink-0" style={{ color: statusColor(file.status) }}>{file.status}</span>
      <span
        className="flex-1 truncate text-ox-text-dim"
        title={file.path + (file.additions != null ? ` (+${file.additions} -${file.deletions ?? 0})` : "")}
      >
        {file.path.split("/").pop()}
      </span>
      {file.additions != null && (
        <span className="text-sm font-mono shrink-0">
          <span className="text-green-400">+{file.additions}</span>
          {(file.deletions ?? 0) > 0 && <span className="text-red-400 ml-1">-{file.deletions}</span>}
        </span>
      )}
      {staged ? (
        <IconButton title="Unstage" onClick={onUnstage}><Minus size={18} /></IconButton>
      ) : (
        <IconButton title="Stage" onClick={onStage}><Plus size={18} /></IconButton>
      )}
      <IconButton title="Discard" onClick={onDiscard}><Trash2 size={16} /></IconButton>
    </div>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="toolbar-btn !w-7 !h-7 text-ox-muted hover:text-ox-accent"
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}
