import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "@xterm/xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Wifi, Loader2, Terminal as TerminalIcon, Monitor, Layout,
  X, RefreshCw, AlertCircle, ChevronRight, ChevronDown, Unplug, Plus,
  FileText, GitBranch, Container, Settings,
} from "lucide-react";
import { useLinkStore } from "./link-store";
import { FileExplorer } from "./panels/FileExplorer";
import { GitPanel } from "./panels/GitPanel";
import { DockerPanel } from "./panels/DockerPanel";
import { BrowserPanel } from "./panels/BrowserPanel";
import { NotificationBell } from "@/features/notifications/NotificationBell";

type SidebarTab = "files" | "git" | "docker" | "browser" | "workspaces";

export default function LinkControlPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();

  const linkState = useLinkStore((s) => s.state);
  const error = useLinkStore((s) => s.error);
  const terminalOutput = useLinkStore((s) => s.terminalOutput);
  const connectionMode = useLinkStore((s) => s.connectionMode);
  const workspaces = useLinkStore((s) => s.workspaces);
  const browserSessions = useLinkStore((s) => s.browserSessions);
  const connect = useLinkStore((s) => s.connect);
  const disconnect = useLinkStore((s) => s.disconnect);
  const requestLink = useLinkStore((s) => s.requestLink);
  const sendTerminalInput = useLinkStore((s) => s.sendTerminalInput);
  const sendTerminalResize = useLinkStore((s) => s.sendTerminalResize);
  const attachTerminal = useLinkStore((s) => s.attachTerminal);
  const createTerminal = useLinkStore((s) => s.createTerminal);
  const startRelay = useLinkStore((s) => s.startRelay);
  const setConnectionMode = useLinkStore((s) => s.setConnectionMode);
  const clearTerminalOutput = useLinkStore((s) => s.clearTerminalOutput);
  const reset = useLinkStore((s) => s.reset);

  const [activeTerminal, setActiveTerminal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>("workspaces");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [expandedWindows, setExpandedWindows] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalHost, setTerminalHost] = useState<HTMLDivElement | null>(null);
  const [xtermReady, setXtermReady] = useState(false);

  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const lastFlushedRef = useRef(0);
  const isConnected = linkState === "p2p_connected";
  const isConnecting = ["connecting", "connected", "authenticated", "requesting", "awaiting_approval", "p2p_connecting"].includes(linkState);

  useEffect(() => { connect().then(() => { if (deviceId) requestLink(deviceId); }); }, [deviceId, connect, requestLink]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === selectedWorkspaceId) ?? workspaces[0] ?? null,
    [workspaces, selectedWorkspaceId],
  );

  useEffect(() => {
    if (!selectedWorkspace && workspaces[0]) {
      setSelectedWorkspaceId(workspaces[0].id);
      return;
    }
    if (selectedWorkspace && selectedWorkspace.id !== selectedWorkspaceId) {
      setSelectedWorkspaceId(selectedWorkspace.id);
    }
  }, [selectedWorkspace, selectedWorkspaceId, workspaces]);

  useEffect(() => {
    if (!selectedWorkspace) return;
    setExpandedWindows((prev) => {
      const next = new Set(prev);
      for (const win of selectedWorkspace.windows) next.add(win.id);
      return next;
    });
  }, [selectedWorkspace]);

  // Derive CWD from the active terminal (like desktop's useFocusedTerminalCwd)
  const terminalCwd = useMemo(() => {
    if (!activeTerminal || !selectedWorkspace) return null;
    for (const win of selectedWorkspace.windows) {
      for (const term of win.terminals) {
        if (term.id === activeTerminal && term.cwd) return term.cwd;
      }
    }
    return null;
  }, [activeTerminal, selectedWorkspace]);

  useEffect(() => { if (linkState === "disconnected" && !error) navigate("/dashboard", { replace: true }); }, [linkState, error, navigate]);

  // xterm initialization
  useEffect(() => {
    if (!isConnected || !activeTerminal || !terminalHost) return;
    let term: any = null;
    let fitAddon: any = null;
    let disposed = false;
    setXtermReady(false);

    const init = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      if (disposed) return;
      const cs = getComputedStyle(document.documentElement);
      const cv = (name: string) => cs.getPropertyValue(name).trim();
      term = new Terminal({
        theme: {
          background: cv("--color-background") || "#050D10",
          foreground: cv("--color-foreground") || "#EEEEEE",
          cursor: cv("--color-primary") || "#32E0C4",
          cursorAccent: cv("--color-background") || "#050D10",
          selectionBackground: "rgba(50,224,196,0.2)",
          black: cv("--color-card") || "#071418",
          red: cv("--color-destructive") || "#FF4040",
          green: cv("--color-primary") || "#32E0C4",
          yellow: cv("--color-accent") || "#FED500",
          blue: cv("--color-secondary") || "#0D7377",
          magenta: cv("--color-muted-foreground") || "#8BA0A5",
          cyan: cv("--color-primary") || "#32E0C4",
          white: cv("--color-foreground") || "#EEEEEE",
          brightBlack: cv("--color-muted") || "#3D555A",
          brightRed: cv("--color-destructive") || "#FF4040",
          brightGreen: cv("--color-primary") || "#32E0C4",
          brightYellow: cv("--color-accent") || "#FED500",
          brightBlue: cv("--color-secondary") || "#0D7377",
          brightMagenta: cv("--color-muted-foreground") || "#8BA0A5",
          brightCyan: cv("--color-primary") || "#32E0C4",
          brightWhite: cv("--color-foreground") || "#EEEEEE",
        },
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 14, cursorBlink: true, cursorStyle: "bar", scrollback: 10000, allowTransparency: true,
      });
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalHost);
      fitAddon.fit();
      term.onData((data: string) => sendTerminalInput(data));
      term.onResize(({ cols, rows }: { cols: number; rows: number }) => sendTerminalResize(cols, rows));
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      setXtermReady(true);
      requestAnimationFrame(() => { fitAddonRef.current?.fit(); xtermRef.current?.focus(); });
    };
    init();
    return () => { disposed = true; term?.dispose(); xtermRef.current = null; fitAddonRef.current = null; setXtermReady(false); };
  }, [activeTerminal, isConnected, sendTerminalInput, sendTerminalResize, terminalHost]);

  useEffect(() => { const handleResize = () => fitAddonRef.current?.fit(); window.addEventListener("resize", handleResize); return () => window.removeEventListener("resize", handleResize); }, []);

  // Flush terminal output to xterm
  useEffect(() => {
    if (!xtermRef.current || !xtermReady || terminalOutput.length === 0) return;
    const newChunks = terminalOutput.slice(lastFlushedRef.current);
    lastFlushedRef.current = terminalOutput.length;
    for (const chunk of newChunks) xtermRef.current.write(chunk);
  }, [terminalOutput, xtermReady]);

  // Attach terminal on connect
  useEffect(() => {
    if (linkState === "p2p_connected" && activeTerminal) {
      clearTerminalOutput(); lastFlushedRef.current = 0; xtermRef.current?.clear();
      attachTerminal(activeTerminal); xtermRef.current?.focus();
    }
  }, [linkState, activeTerminal, attachTerminal, clearTerminalOutput]);

  const handleSelectTerminal = (terminalId: string) => {
    setActiveTerminal(terminalId);
    if (linkState === "p2p_connected") {
      clearTerminalOutput(); lastFlushedRef.current = 0; xtermRef.current?.clear();
      attachTerminal(terminalId); xtermRef.current?.focus();
    }
  };

  const handleDisconnect = () => { disconnect(); navigate("/dashboard", { replace: true }); };
  const handleUseRelay = () => { if (activeTerminal) startRelay(activeTerminal); else setConnectionMode("websocket"); };
  const toggleWindow = (id: string) => { setExpandedWindows((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const handleCreateTerminal = (windowId?: string) => createTerminal(undefined, undefined, selectedWorkspace?.id, windowId);

  // Activity bar icon component
  const SideIcon = ({ tab, icon: Icon, label, active, onClick }: { tab?: SidebarTab; icon: any; label: string; active?: boolean; onClick?: () => void }) => (
    <button
      onClick={onClick ?? (() => {
        if (activeTab === tab && !sidebarCollapsed) { setSidebarCollapsed(true); }
        else { setActiveTab(tab!); setSidebarCollapsed(false); }
      })}
      className={`relative flex h-9 w-9 items-center justify-center rounded transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
      title={label}
    >
      <Icon className="h-[18px] w-[18px]" />
      {active && <div className="absolute left-0 top-1.5 h-6 w-0.5 rounded-r bg-primary" />}
    </button>
  );

  // Workspace tree content
  const WorkspacePanel = () => (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Workspace selector */}
      <div className="shrink-0 border-b border-border p-2">
        <div className="flex items-center gap-1">
          <div className="relative min-w-0 flex-1">
            <select
              value={selectedWorkspace?.id ?? ""}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="h-7 w-full appearance-none rounded border border-border bg-background pl-7 pr-6 text-xs font-medium text-foreground outline-none"
            >
              {workspaces.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
              {workspaces.length === 0 && <option value="">No workspace</option>}
            </select>
            <Layout className="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <ChevronDown className="pointer-events-none absolute right-1.5 top-2 h-3 w-3 text-muted-foreground" />
          </div>
          <button onClick={() => handleCreateTerminal()} className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground" title="New workspace">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* New Window button */}
      <div className="shrink-0 border-b border-border p-2">
        <button onClick={() => handleCreateTerminal()} className="flex h-7 w-full items-center gap-1.5 rounded border border-dashed border-border px-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground">
          <Plus className="h-3 w-3" /> New Window
        </button>
      </div>

      {/* Window/terminal tree */}
      <nav className="flex-1 overflow-y-auto p-2">
        {selectedWorkspace?.windows.map((win) => (
          <div key={win.id} className="mb-1">
            <div className="flex items-center rounded px-1 py-0.5">
              <button onClick={() => toggleWindow(win.id)} className="flex h-6 flex-1 items-center gap-1 text-xs font-medium text-foreground">
                {expandedWindows.has(win.id) ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                <span className="truncate">{win.name}</span>
              </button>
              <button onClick={() => handleCreateTerminal(win.id)} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground" title="New terminal">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {expandedWindows.has(win.id) && win.terminals.map((term) => (
              <button
                key={term.id}
                onClick={() => handleSelectTerminal(term.id)}
                className={`flex h-6 w-full items-center gap-1.5 rounded pl-5 pr-2 text-xs transition-colors ${activeTerminal === term.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${term.status === "running" ? "bg-green-500" : term.status === "exited" ? "bg-destructive" : "bg-muted-foreground"}`} />
                <span className="truncate">{term.name}</span>
              </button>
            ))}
          </div>
        ))}

        {selectedWorkspace && selectedWorkspace.windows.length === 0 && (
          <button onClick={() => handleCreateTerminal()} className="flex h-7 w-full items-center gap-1.5 rounded px-2 text-xs text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3" /> New window
          </button>
        )}

        {workspaces.length === 0 && isConnected && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <TerminalIcon className="h-6 w-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No terminals yet</p>
            <button onClick={() => handleCreateTerminal()} className="flex h-7 items-center gap-1 rounded border border-border px-2 text-xs text-muted-foreground hover:text-foreground">
              <Plus className="h-3 w-3" /> Create Terminal
            </button>
          </div>
        )}
      </nav>
    </div>
  );

  // Auto-load sidebar panels when tab is selected
  useEffect(() => {
    if (!isConnected) return;
    // Panels auto-load via their own useEffect
  }, [activeTab, isConnected]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Activity Bar (narrow icon strip) */}
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-border bg-card py-2">
        {/* Device indicator */}
        <div className="mb-2 flex h-7 w-7 items-center justify-center" title={deviceId ?? ""}>
          <Monitor className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mb-2 h-px w-6 bg-border" />
        {/* Tab icons */}
        <SideIcon tab="files" icon={FileText} label="Files" active={activeTab === "files" && !sidebarCollapsed} />
        <SideIcon tab="git" icon={GitBranch} label="Git" active={activeTab === "git" && !sidebarCollapsed} />
        <SideIcon tab="docker" icon={Container} label="Docker" active={activeTab === "docker" && !sidebarCollapsed} />
        <SideIcon tab="browser" icon={Layout} label="Browser" active={activeTab === "browser" && !sidebarCollapsed} />
        <SideIcon tab="workspaces" icon={TerminalIcon} label="Terminal" active={activeTab === "workspaces" && !sidebarCollapsed} />
        <div className="flex-1" />
        {/* Bottom icons */}
        <SideIcon icon={Settings} label="Settings" onClick={() => navigate("/dashboard/settings/link")} />
        <button onClick={handleDisconnect} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:text-destructive" title="Disconnect">
          <Unplug className="h-4 w-4" />
        </button>
      </div>

      {/* Side Panel (content) */}
      {!sidebarCollapsed && (
        <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
          {/* Header */}
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {activeTab === "files"
                  ? "Explorer"
                  : activeTab === "git"
                    ? "Source Control"
                    : activeTab === "docker"
                      ? "Docker"
                      : activeTab === "browser"
                        ? "Browser"
                        : "Terminal"}
              </span>
            <div className="flex items-center gap-1">
              {isConnected && (
                <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono ${connectionMode === "websocket" ? "text-yellow-500" : "text-green-500"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${connectionMode === "websocket" ? "bg-yellow-500" : "bg-green-500"}`} />
                  {connectionMode === "websocket" ? "Relay" : "P2P"}
                </span>
              )}
              <button onClick={() => setSidebarCollapsed(true)} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Panel content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {activeTab === "files" && <FileExplorer cwd={terminalCwd} />}
            {activeTab === "git" && <GitPanel cwd={terminalCwd} />}
            {activeTab === "docker" && <DockerPanel />}
            {activeTab === "browser" && <BrowserPanel selectedWorkspaceId={selectedWorkspace?.id ?? null} />}
            {activeTab === "workspaces" && <WorkspacePanel />}
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-3">
          <div className="flex min-w-0 items-center gap-2">
            <TerminalIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs font-medium text-foreground">{activeTerminal ?? "Select a terminal"}</span>
            {browserSessions.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {browserSessions.length} browser session{browserSessions.length === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <NotificationBell />
            {isConnected && (
              <div className="flex items-center gap-0.5 rounded border border-border bg-background p-0.5">
                <button
                  className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium transition-colors ${connectionMode === "websocket" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setConnectionMode("websocket")}
                >Relay</button>
                <button
                  className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium transition-colors ${connectionMode === "webrtc" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setConnectionMode("webrtc")}
                >P2P</button>
              </div>
            )}
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-0.5 text-[10px]">
              <Wifi className="h-2.5 w-2.5" /> {isConnected ? (connectionMode === "websocket" ? "Relay" : "P2P") : linkState}
            </Badge>
          </div>
        </div>

        {/* Connection states */}
        {linkState === "awaiting_approval" && (
          <div className="flex flex-1 items-center justify-center p-4">
            <Card className="max-w-sm"><CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div><p className="text-lg font-medium text-foreground">Waiting for approval</p><p className="mt-1 text-sm text-muted-foreground">Approve the link request on your desktop</p></div>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>Cancel</Button>
            </CardContent></Card>
          </div>
        )}

        {linkState === "error" && (
          <div className="flex flex-1 items-center justify-center p-4">
            <Card className="max-w-sm"><CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div><p className="text-lg font-medium text-foreground">Connection failed</p><p className="mt-1 text-sm text-muted-foreground">{error ?? "Could not establish connection"}</p></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleUseRelay}><RefreshCw className="mr-1 h-4 w-4" /> Relay</Button>
                <Button variant="outline" size="sm" onClick={() => { reset(); setTimeout(() => connect().then(() => { if (deviceId) requestLink(deviceId); }), 100); }}><RefreshCw className="mr-1 h-4 w-4" /> Retry</Button>
                <Button variant="destructive" size="sm" onClick={handleDisconnect}>Disconnect</Button>
              </div>
            </CardContent></Card>
          </div>
        )}

        {isConnecting && linkState !== "awaiting_approval" && (
          <div className="flex flex-1 items-center justify-center p-4">
            <Card className="max-w-sm"><CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div><p className="text-lg font-medium text-foreground">Connecting...</p><p className="mt-1 text-sm text-muted-foreground">Establishing secure connection</p></div>
            </CardContent></Card>
          </div>
        )}

        {/* Terminal area */}
        {isConnected && (
          <div className="relative flex-1 overflow-hidden bg-background p-1">
            {activeTerminal ? (
              <div ref={setTerminalHost} className="h-full w-full overflow-hidden rounded border border-border bg-background" />
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <div className="text-center">
                  <TerminalIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-20" />
                  <p className="text-sm font-medium text-foreground">Select a terminal</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Choose from the sidebar or create a new one</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
