import { FileText, Search, GitBranch, Puzzle, Container, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useCanvasStore } from "../stores/canvas-store";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/cn";

interface LeftSidebarProps {
  activePanel: string | null;
  onTogglePanel: (panel: string | null) => void;
  visible: boolean;
}

const SIDEBAR_ITEMS = [
  { id: "files", Icon: FileText, label: "Files" },
  { id: "search", Icon: Search, label: "Search" },
  { id: "git", Icon: GitBranch, label: "Git" },
  { id: "docker", Icon: Container, label: "Docker" },
  { id: "extensions", Icon: Puzzle, label: "Extensions" },
] as const;

export function LeftSidebar({ activePanel, onTogglePanel, visible }: LeftSidebarProps) {
  const workspaces = useCanvasStore((s) => s.workspaces);
  const activeWsIdx = useCanvasStore((s) => s.activeWorkspaceIndex);
  const jumpToWorkspace = useCanvasStore((s) => s.jumpToWorkspace);
  const { isAuthenticated, user, login, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div
      className="flex flex-col items-center py-3 gap-1.5 w-16 shrink-0 z-40"
      style={{
        background: "color-mix(in srgb, var(--orphix-color-base-background) 95%, transparent)",
        borderRight: "1px solid var(--orphix-color-base-border)",
      }}
    >
      {/* Top: tool buttons */}
      <div className="flex flex-col items-center gap-1.5">
        {SIDEBAR_ITEMS.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => onTogglePanel(activePanel === id ? null : id)}
            className={cn(
              "w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
              activePanel === id
                ? "text-ox-accent bg-ox-accent/10"
                : "text-ox-muted hover:text-ox-text-dim hover:bg-orphix-hover-subtle",
            )}
            title={label}
          >
            <Icon size={22} strokeWidth={1.5} />
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: workspace squares */}
      <div className="flex flex-col items-center gap-2 pb-1">
        {workspaces.map((_, i) => (
          <button
            key={i}
            onClick={() => jumpToWorkspace(i)}
            title={`Workspace ${i + 1}`}
            className="transition-transform duration-300 hover:scale-125"
          >
            {i === activeWsIdx ? (
              <div className="w-4 h-4 rounded-sm bg-ox-accent" />
            ) : (
              <div className="w-4 h-4 rounded-sm border-[1.5px] border-ox-muted opacity-40" />
            )}
          </button>
        ))}
      </div>

      {/* Profile icon */}
      <div className="relative flex flex-col items-center pb-2">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={cn(
            "w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
            isAuthenticated
              ? "text-ox-accent hover:bg-ox-accent/10"
              : "text-ox-muted hover:text-ox-text-dim hover:bg-orphix-hover-subtle",
          )}
          title={isAuthenticated ? (user?.username ?? "Signed in") : "Sign in"}
        >
          {isAuthenticated ? (
            <div className="w-8 h-8 rounded-full bg-ox-accent/20 flex items-center justify-center text-sm font-semibold text-ox-accent uppercase">
              {(user?.username ?? "U")[0]}
            </div>
          ) : (
            <User size={20} strokeWidth={1.5} />
          )}
        </button>

        {/* Profile dropdown */}
        {showProfileMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setShowProfileMenu(false)} />
            <div
              className="absolute bottom-14 left-0 z-50 w-56 rounded-xl overflow-hidden"
              style={{
                background: "var(--orphix-color-surface-elevated)",
                border: "1px solid var(--orphix-color-base-border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              {isAuthenticated ? (
                <>
                  <div
                    className="px-4 py-2.5 text-sm font-medium truncate"
                    style={{ color: "var(--orphix-color-text)", borderBottom: "1px solid var(--orphix-color-base-border)" }}
                  >
                    {user?.username ?? "Signed in"}
                  </div>
                  <button
                    onClick={() => { logout(); setShowProfileMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ color: "var(--orphix-color-danger, #FF5370)" }}
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { login(); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                  style={{ color: "var(--orphix-color-primary)" }}
                >
                  <User size={14} /> Sign in with GitHub
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
