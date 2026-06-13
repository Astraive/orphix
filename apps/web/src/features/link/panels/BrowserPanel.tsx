import { useEffect, useMemo, useState } from "react";
import { Globe, Link as LinkIcon, Monitor, Plus, RefreshCw, Unlink, X } from "lucide-react";
import { Button, Badge } from "@orphix/ui";
import { useLinkStore } from "../link-store";

interface BrowserPanelProps {
  selectedWorkspaceId?: string | null;
}

export function BrowserPanel({ selectedWorkspaceId }: BrowserPanelProps) {
  const rpc = useLinkStore((state) => state.rpc);
  const browserSessions = useLinkStore((state) => state.browserSessions);
  const workspaces = useLinkStore((state) => state.workspaces);
  const capabilities = useLinkStore((state) => state.capabilities);
  const [draftUrl, setDraftUrl] = useState("https://example.com");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [pendingTabUrls, setPendingTabUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSessionId && browserSessions[0]) {
      setSelectedSessionId(browserSessions[0].id);
    }
    if (selectedSessionId && !browserSessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(browserSessions[0]?.id ?? "");
    }
  }, [browserSessions, selectedSessionId]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0] ?? null,
    [selectedWorkspaceId, workspaces],
  );

  const selectedWindow = selectedWorkspace?.windows[0] ?? null;
  const selectedSession = browserSessions.find((session) => session.id === selectedSessionId) ?? browserSessions[0] ?? null;

  const runAction = async (action: () => Promise<unknown>) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!draftUrl.trim()) return;
    await runAction(async () => {
      await rpc("browser.session.create", { url: draftUrl.trim() });
    });
  };

  const handleOpenTab = async () => {
    if (!selectedSession || !draftUrl.trim()) return;
    await runAction(async () => {
      await rpc("browser.tab.open", {
        sessionId: selectedSession.id,
        url: draftUrl.trim(),
      });
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Browser</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {capabilities.browser.sessionCount} sessions
        </Badge>
      </div>

      <div className="border-b border-border px-3 py-2 shrink-0">
        <div className="flex gap-1.5">
          <input
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            placeholder="https://example.com"
            className="h-8 flex-1 rounded border border-border bg-background px-2 text-xs text-foreground outline-none"
          />
          <Button size="sm" variant="outline" onClick={handleCreateSession} disabled={loading}>
            <Plus className="mr-1 h-3 w-3" />
            Session
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenTab} disabled={loading || !selectedSession}>
            <Globe className="mr-1 h-3 w-3" />
            Tab
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-44 shrink-0 border-r border-border overflow-y-auto">
          {browserSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              className={`flex w-full flex-col items-start gap-0.5 border-b border-border/50 px-3 py-2 text-left ${
                selectedSession?.id === session.id ? "bg-primary/10" : "hover:bg-accent/5"
              }`}
            >
              <span className="truncate text-xs font-medium text-foreground">{session.name}</span>
              <span className="text-[10px] text-muted-foreground">{session.tabs.length} tabs</span>
            </button>
          ))}
          {browserSessions.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No browser sessions yet</div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" />
              <span>{selectedWorkspace?.name ?? "Attach target unavailable"}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => runAction(async () => { await rpc("browser.sessions"); })}
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {!selectedSession && (
              <div className="py-8 text-center text-xs text-muted-foreground">Select a session to inspect shared tabs.</div>
            )}

            {selectedSession?.tabs.map((tab) => {
              const pendingUrl = pendingTabUrls[tab.id] ?? tab.url;
              const canAttach = Boolean(selectedWorkspace && selectedWindow);
              return (
                <div key={tab.id} className="mb-3 rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{tab.title || tab.url}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{tab.url}</div>
                    </div>
                    <Badge variant={tab.status === "ready" ? "default" : "secondary"} className="text-[10px]">
                      {tab.status}
                    </Badge>
                  </div>

                  <div className="mb-2 flex gap-2">
                    <input
                      value={pendingUrl}
                      onChange={(event) =>
                        setPendingTabUrls((current) => ({ ...current, [tab.id]: event.target.value }))
                      }
                      className="h-8 flex-1 rounded border border-border bg-background px-2 text-xs outline-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        runAction(async () => {
                          await rpc("browser.navigate", {
                            sessionId: selectedSession.id,
                            tabId: tab.id,
                            url: pendingUrl,
                          });
                        })
                      }
                      disabled={loading}
                    >
                      Go
                    </Button>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        runAction(async () => {
                          await rpc("browser.snapshot", {
                            sessionId: selectedSession.id,
                            tabId: tab.id,
                          });
                        })
                      }
                      disabled={loading}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Snapshot
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        runAction(async () => {
                          await rpc("browser.tab.close", {
                            sessionId: selectedSession.id,
                            tabId: tab.id,
                          });
                        })
                      }
                      disabled={loading}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Close
                    </Button>
                    {tab.attachment?.workspaceId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          runAction(async () => {
                            await rpc("browser.detach", {
                              sessionId: selectedSession.id,
                              tabId: tab.id,
                            });
                          })
                        }
                        disabled={loading}
                      >
                        <Unlink className="mr-1 h-3 w-3" />
                        Detach
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          runAction(async () => {
                            await rpc("browser.attach", {
                              sessionId: selectedSession.id,
                              tabId: tab.id,
                              workspaceId: selectedWorkspace?.id,
                              windowId: selectedWindow?.id,
                              paneId: `browser:${tab.id}`,
                            });
                          })
                        }
                        disabled={loading || !canAttach}
                      >
                        <LinkIcon className="mr-1 h-3 w-3" />
                        Attach
                      </Button>
                    )}
                  </div>

                  {tab.attachment?.workspaceId && (
                    <div className="mb-3 text-[11px] text-muted-foreground">
                      Attached to {tab.attachment.workspaceId}:{tab.attachment.windowId}
                    </div>
                  )}

                  {tab.snapshotDataUrl ? (
                    <img
                      src={tab.snapshotDataUrl}
                      alt={tab.title}
                      className="h-40 w-full rounded border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
                      Snapshot not captured yet
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
