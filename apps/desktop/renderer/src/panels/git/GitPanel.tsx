import { useEffect, useState, useCallback } from "react";
import { useGitStore } from "./git-store";
import { invoke } from "../../lib/electron-ipc";
import { CHANNELS } from "../../../../shared/channels";
import type { GitFile } from "../../../../shared/types";

interface Branch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

export function GitPanel() {
  const { branch, files, ahead, behind, commitMessage, refresh, watch, unwatch, stage, unstage, commit, checkout, setCommitMessage } = useGitStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showBranches, setShowBranches] = useState(false);
  const [cwd, setCwd] = useState<string>("");

  useEffect(() => {
    invoke<string>(CHANNELS.SYSTEM_WORKSPACE_DIR).then(async (workspaceDir) => {
      setCwd(workspaceDir);
      await watch(workspaceDir);
      const branchList = await invoke<Branch[]>(CHANNELS.GIT_BRANCHES, { cwd: workspaceDir });
      setBranches(branchList);
    });
    return () => { unwatch(); };
  }, [watch, unwatch]);

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

  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);

  const statusColor = (status: string) => {
    switch (status) {
      case "M": return "#E5C07B";
      case "A": return "#32E0C4";
      case "D": return "#FF6B6B";
      case "R": return "#C678DD";
      case "??": return "#0D7377";
      default: return "var(--ox-text-dim)";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 flex items-center justify-between border-b border-ox-border">
        <span className="text-[10px] tracking-[0.15em] uppercase text-ox-accent font-semibold">Source Control</span>
        <button onClick={handleRefresh} className="toolbar-btn !w-6 !h-6" title="Refresh">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
        </button>
      </div>

      <div className="px-3 py-2 border-b border-ox-border">
        <button onClick={() => setShowBranches(!showBranches)} className="flex items-center gap-2 text-xs font-mono text-ox-text w-full">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M12 9v3"/><path d="M9 16l3-3"/><path d="M15 16l-3-3"/></svg>
          <span className="flex-1 text-left truncate">{branch ?? "No branch"}</span>
          {ahead > 0 && <span className="text-ox-accent">↑{ahead}</span>}
          {behind > 0 && <span className="text-ox-muted">↓{behind}</span>}
          <span className="text-ox-muted text-[10px]">{showBranches ? "▲" : "▼"}</span>
        </button>
        {showBranches && (
          <div className="mt-2 space-y-0.5">
            {branches.map((b) => (
              <button
                key={b.name}
                onClick={() => handleCheckout(b.name)}
                className={`w-full text-left px-2 py-1 text-xs font-mono rounded transition-colors ${
                  b.isCurrent ? "bg-ox-accent/10 text-ox-accent" : "text-ox-text-dim hover:bg-white/5"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-b border-ox-border">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          className="w-full bg-transparent text-xs font-mono text-ox-text outline-none resize-none placeholder:text-ox-muted/40"
          rows={2}
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || stagedFiles.length === 0}
          className="mt-1 w-full py-1 text-xs font-mono rounded bg-ox-accent/10 text-ox-accent hover:bg-ox-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Commit ({stagedFiles.length} staged)
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {stagedFiles.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] tracking-wider uppercase text-ox-muted font-semibold">Staged Changes</div>
            {stagedFiles.map((f) => (
              <FileRow key={`s-${f.path}`} file={f} staged onUnstage={() => handleUnstage(f)} statusColor={statusColor} />
            ))}
          </div>
        )}
        {unstagedFiles.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[10px] tracking-wider uppercase text-ox-muted font-semibold">Changes</div>
            {unstagedFiles.map((f) => (
              <FileRow key={`u-${f.path}`} file={f} staged={false} onStage={() => handleStage(f)} statusColor={statusColor} />
            ))}
          </div>
        )}
        {files.length === 0 && (
          <div className="px-3 py-4 text-xs text-ox-muted/40 font-mono text-center">No changes</div>
        )}
      </div>
    </div>
  );
}

function FileRow({ file, staged, onStage, onUnstage, statusColor }: {
  file: GitFile; staged: boolean; onStage?: () => void; onUnstage?: () => void;
  statusColor: (s: string) => string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 text-xs font-mono hover:bg-white/5 transition-colors group">
      <span className="w-4 text-center text-[10px] font-bold" style={{ color: statusColor(file.status) }}>{file.status}</span>
      <span className="flex-1 truncate text-ox-text-dim">{file.path.split("/").pop()}</span>
      <span className="text-ox-muted/40 text-[10px] truncate max-w-[80px]">{file.path}</span>
      {staged ? (
        <button onClick={onUnstage} className="opacity-0 group-hover:opacity-100 text-ox-muted hover:text-ox-accent transition-opacity" title="Unstage">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
        </button>
      ) : (
        <button onClick={onStage} className="opacity-0 group-hover:opacity-100 text-ox-muted hover:text-ox-accent transition-opacity" title="Stage">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        </button>
      )}
    </div>
  );
}
