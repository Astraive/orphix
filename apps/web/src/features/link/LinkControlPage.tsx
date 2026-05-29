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
} from "lucide-react";
import { useLinkStore } from "./link-store";

export default function LinkControlPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();

  const linkState = useLinkStore((s) => s.state);
  const error = useLinkStore((s) => s.error);
  const terminalOutput = useLinkStore((s) => s.terminalOutput);
  const connectionMode = useLinkStore((s) => s.connectionMode);
  const workspaces = useLinkStore((s) => s.workspaces);
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

  useEffect(() => { if (linkState === "disconnected" && !error) navigate("/dashboard", { replace: true }); }, [linkState, error, navigate]);

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
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        xtermRef.current?.focus();
      });
    };
    init();
    return () => {
      disposed = true;
      term?.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      setXtermReady(false);
    };
  }, [activeTerminal, isConnected, sendTerminalInput, sendTerminalResize, terminalHost]);

  useEffect(() => { const handleResize = () => fitAddonRef.current?.fit(); window.addEventListener("resize", handleResize); return () => window.removeEventListener("resize", handleResize); }, []);

  useEffect(() => {
    if (!xtermRef.current || !xtermReady || terminalOutput.length === 0) return;
    const newChunks = terminalOutput.slice(lastFlushedRef.current);
    lastFlushedRef.current = terminalOutput.length;
    for (const chunk of newChunks) xtermRef.current.write(chunk);
  }, [terminalOutput, xtermReady]);

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!sidebarCollapsed && (
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex min-w-0 items-center gap-2"><Monitor className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate text-sm font-medium text-foreground">{deviceId}</span></div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSidebarCollapsed(true)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="shrink-0 border-b border-border px-4 py-3">
            {isConnected && <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500" /><span className="text-xs text-green-500">{connectionMode === "websocket" ? "Reliable Relay" : connectionMode === "webrtc" ? "Direct P2P" : "Auto"}</span></div>}
            {isConnecting && <div className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">{linkState === "awaiting_approval" ? "Awaiting approval..." : "Connecting..."}</span></div>}
            {linkState === "error" && <div className="flex items-center gap-2"><AlertCircle className="h-3 w-3 text-destructive" /><span className="text-xs text-destructive">Error</span></div>}
          </div>
          <div className="shrink-0 space-y-2 border-b border-border p-3">
            <div className="flex items-center gap-1">
              <div className="relative min-w-0 flex-1">
                <select
                  value={selectedWorkspace?.id ?? ""}
                  onChange={(event) => setSelectedWorkspaceId(event.target.value)}
                  className="h-8 w-full appearance-none rounded-md border border-border bg-background pl-8 pr-7 text-xs font-medium text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary"
                >
                  {workspaces.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                  {workspaces.length === 0 && <option value="">No workspace</option>}
                </select>
                <Layout className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3 w-3 text-muted-foreground" />
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleCreateTerminal()} title="New workspace">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-1.5 text-xs" onClick={() => handleCreateTerminal()}>
              <Plus className="h-3.5 w-3.5" /> New window
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3" aria-label="Workspace tree">
            {workspaces.length === 0 && isConnected && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <TerminalIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No terminals yet</p>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleCreateTerminal()}>
                  <Plus className="h-3.5 w-3.5" /> New Terminal
                </Button>
              </div>
            )}
            {selectedWorkspace && (
              <div className="mb-1">
                {selectedWorkspace.windows.map((win) => (
                  <div key={win.id}>
                    <div className="flex items-center">
                      <Button variant="ghost" size="sm" className="h-8 flex-1 justify-start gap-2 text-sm" onClick={() => toggleWindow(win.id)}>
                        {expandedWindows.has(win.id) ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        <Layout className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{win.name}</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCreateTerminal(win.id)} title="New Terminal">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {expandedWindows.has(win.id) && win.terminals.map((term) => (
                      <Button key={term.id} variant={activeTerminal === term.id ? "secondary" : "ghost"} size="sm" className="h-8 w-full justify-start gap-2 pl-8 text-sm" onClick={() => handleSelectTerminal(term.id)}>
                        <TerminalIcon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{term.name}</span>
                        {term.status === "running" && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500" />}
                      </Button>
                    ))}
                  </div>
                ))}
                {selectedWorkspace.windows.length === 0 && (
                  <Button variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-sm text-muted-foreground" onClick={() => handleCreateTerminal()}>
                    <Plus className="h-3.5 w-3.5" /> New window
                  </Button>
                )}
              </div>
            )}
          </nav>
          <Separator />
          <div className="shrink-0 p-3"><Button variant="destructive" size="sm" className="w-full" onClick={handleDisconnect}><Unplug className="mr-2 h-4 w-4" /> Disconnect</Button></div>
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex min-w-0 items-center gap-3">
            {sidebarCollapsed && <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSidebarCollapsed(false)}><Layout className="h-4 w-4" /></Button>}
            <TerminalIcon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate text-sm font-medium text-foreground">{activeTerminal ?? "Select a terminal"}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isConnected && <Badge variant="default" className="gap-1 text-[10px]"><Wifi className="h-3 w-3" /> {connectionMode === "websocket" ? "Relay" : connectionMode === "webrtc" ? "P2P" : "Auto"}</Badge>}
            {linkState === "error" && <Button variant="outline" size="sm" onClick={handleUseRelay} className="h-7 gap-1 text-xs"><RefreshCw className="h-3 w-3" /> Use Relay</Button>}
            <Button variant="outline" size="sm" onClick={handleDisconnect} className="h-7 text-xs"><Unplug className="mr-1 h-3 w-3" /> Disconnect</Button>
          </div>
        </div>

        {linkState === "awaiting_approval" && (
          <div className="flex flex-1 items-center justify-center p-4">
            <Card className="max-w-sm"><CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div><p className="text-lg font-medium text-foreground">Waiting for approval</p><p className="mt-1 text-sm text-muted-foreground">Approve the link request on your desktop to continue</p></div>
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
                <Button variant="outline" size="sm" onClick={handleUseRelay}><RefreshCw className="mr-1 h-4 w-4" /> Use Relay</Button>
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
              <div><p className="text-lg font-medium text-foreground">Connecting...</p><p className="mt-1 text-sm text-muted-foreground">Establishing secure connection to your desktop</p></div>
            </CardContent></Card>
          </div>
        )}

        {isConnected && (
          <div className="relative flex-1 overflow-hidden bg-background p-1">
            {activeTerminal ? (
              <div ref={setTerminalHost} className="h-full w-full overflow-hidden rounded-md border border-border bg-background" />
            ) : (
              <div className="flex h-full items-center justify-center p-4">
                <div className="text-center"><TerminalIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-20" /><p className="text-lg font-medium text-foreground">Select a terminal</p><p className="mt-1 text-sm text-muted-foreground">Choose a terminal from the sidebar to start</p></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
