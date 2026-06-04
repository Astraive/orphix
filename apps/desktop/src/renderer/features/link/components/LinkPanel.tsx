import { useLinkStore, type ApprovalRequest, type LinkSession } from "../stores/link-store";
import { useLinkConnection } from "../hooks/use-link-connection";
import { useAuth } from "@/providers/AuthProvider";
import { CONTROL_URL } from "@/lib/env";
import { Link2, Check, X, Monitor, Smartphone, Wifi, WifiOff, User, RefreshCw, AlertCircle, PlugZap, Unplug } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface LinkedDeviceSummary {
  id: string;
  deviceId: string;
  deviceType: string;
  deviceName: string;
  platform: string | null;
  status: string;
  online: boolean;
  lastSeenAt: string | null;
  seenInLast7Days?: boolean;
}

export function LinkPanel() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return <SignInPrompt onLogin={login} />;
  }

  return <AuthenticatedLinkPanel />;
}

function SignInPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--orphix-color-base-background)" }}>
      <PanelHeader />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
        <User size={32} style={{ color: "var(--orphix-color-text-muted)", opacity: 0.4 }} />
        <div style={{ fontSize: 14, color: "var(--orphix-color-text-muted)", textAlign: "center" }}>
          Sign in to connect your devices
        </div>
        <button
          onClick={onLogin}
          style={{
            fontSize: 14, padding: "6px 16px", borderRadius: 6,
            border: "1px solid var(--orphix-color-primary)",
            background: "rgba(50,224,196,0.1)",
            color: "var(--orphix-color-primary)",
            cursor: "pointer",
          }}
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}

function AuthenticatedLinkPanel() {
  useLinkConnection();
  const { token } = useAuth();
  const {
    enabled, status, error, deviceId,
    pendingApprovals, activeSessions,
    enable, disable, reconnect, approve, reject,
  } = useLinkStore();
  const removeSession = useLinkStore((state) => state.removeSession);
  const [devices, setDevices] = useState<LinkedDeviceSummary[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const loadDevices = useCallback(async () => {
    if (!token) return;
    setLoadingDevices(true);
    try {
      const response = await fetch(`${CONTROL_URL}/me/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Device fetch failed with ${response.status}`);
      }
      const data = await response.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error("[link-panel] Failed to load devices:", fetchError);
    } finally {
      setLoadingDevices(false);
    }
  }, [token]);

  useEffect(() => {
    loadDevices();
    const interval = window.setInterval(loadDevices, 30_000);
    return () => window.clearInterval(interval);
  }, [loadDevices]);

  const recentDevices = useMemo(
    () =>
      devices.filter((item) =>
        item.deviceType !== "desktop" && (item.online || item.seenInLast7Days),
      ),
    [devices],
  );

  const disconnectDevice = useCallback(async (targetDeviceId: string, sessionId?: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${CONTROL_URL}/devices/${targetDeviceId}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Disconnect failed with ${response.status}`);
      }
      if (sessionId) {
        removeSession(sessionId);
      }
      await loadDevices();
    } catch (disconnectError) {
      console.error("[link-panel] Failed to disconnect device:", disconnectError);
    }
  }, [loadDevices, removeSession, token]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--orphix-color-base-background)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link2 size={16} style={{ color: enabled ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--orphix-color-text)" }}>Link</span>
        </div>
        <ToggleSwitch enabled={enabled} onToggle={enabled ? disable : enable} />
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
        {/* Disabled state */}
        {!enabled && (
          <div style={{ textAlign: "center", paddingTop: 48 }}>
            <WifiOff size={24} style={{ color: "var(--orphix-color-text-muted)", opacity: 0.3 }} />
            <div style={{ fontSize: 14, color: "var(--orphix-color-text-muted)", marginTop: 8 }}>
              Link is disabled
            </div>
            <div style={{ fontSize: 12, color: "var(--orphix-color-text-muted)", opacity: 0.6, marginTop: 4 }}>
              Enable to allow mobile/web connections
            </div>
          </div>
        )}

        {/* Enabled — connecting */}
        {enabled && status === "connecting" && (
          <div style={{ textAlign: "center", paddingTop: 48 }}>
            <div style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
              <RefreshCw size={24} style={{ color: "var(--orphix-color-accent)" }} />
            </div>
            <div style={{ fontSize: 14, color: "var(--orphix-color-accent)", marginTop: 8 }}>
              Connecting to Orphix Link...
            </div>
          </div>
        )}

        {/* Enabled — error */}
        {enabled && status === "error" && (
          <div style={{ textAlign: "center", paddingTop: 32 }}>
            <AlertCircle size={24} style={{ color: "#FF5370" }} />
            <div style={{ fontSize: 14, color: "#FF5370", marginTop: 8 }}>
              Unable to connect
            </div>
            <div style={{ fontSize: 12, color: "var(--orphix-color-text-muted)", marginTop: 4, padding: "0 8px" }}>
              {error ?? "Could not reach the link server"}
            </div>
            <button
              onClick={reconnect}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                marginTop: 16, fontSize: 14, padding: "6px 16px", borderRadius: 6,
                border: "1px solid var(--orphix-color-primary)",
                background: "rgba(50,224,196,0.1)",
                color: "var(--orphix-color-primary)",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} /> Reconnect
            </button>
          </div>
        )}

        {/* Enabled — authenticated */}
        {enabled && status === "authenticated" && (
          <>
            {/* Connection indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Wifi size={14} style={{ color: "var(--orphix-color-primary)" }} />
              <span style={{ fontSize: 13, color: "var(--orphix-color-primary)" }}>
                Connected
              </span>
              {deviceId && (
                <span style={{ fontSize: 12, color: "var(--orphix-color-text-muted)", marginLeft: "auto" }}>
                  {deviceId}
                </span>
              )}
            </div>

            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel label="Connection Requests" />
                {pendingApprovals.map((req) => (
                  <ApprovalCard key={req.sessionId} req={req} onApprove={approve} onReject={reject} />
                ))}
              </div>
            )}

            {/* Active Sessions — most recent first */}
            {activeSessions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel label="Active Sessions" />
                {[...activeSessions].reverse().map((session) => (
                  <SessionCard
                    key={session.sessionId}
                    session={session}
                    device={devices.find((item) => item.deviceId === session.mobileDeviceId)}
                    onDisconnect={disconnectDevice}
                  />
                ))}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <SectionLabel label="Seen In Last 7 Days" />
                <button
                  onClick={loadDevices}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: "none",
                    background: "transparent",
                    color: "var(--orphix-color-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={12} className={loadingDevices ? "animate-spin" : undefined} />
                  Refresh
                </button>
              </div>
              {recentDevices.length > 0 ? (
                recentDevices.map((device) => (
                  <RecentDeviceCard key={device.id} device={device} onDisconnect={disconnectDevice} />
                ))
              ) : (
                <div style={{ fontSize: 12, color: "var(--orphix-color-text-muted)", opacity: 0.7 }}>
                  No mobile or web devices were active in the last 7 days.
                </div>
              )}
            </div>

            {/* Empty state */}
            {pendingApprovals.length === 0 && activeSessions.length === 0 && recentDevices.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 32 }}>
                <Link2 size={20} style={{ color: "var(--orphix-color-text-muted)", opacity: 0.3 }} />
                <div style={{ fontSize: 13, color: "var(--orphix-color-text-muted)", marginTop: 8 }}>
                  Waiting for mobile connections...
                </div>
                <div style={{ fontSize: 12, color: "var(--orphix-color-text-muted)", opacity: 0.5, marginTop: 4 }}>
                  Open Orphix on your phone and connect
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Components ──

function PanelHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--orphix-color-base-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link2 size={16} style={{ color: "var(--orphix-color-text-muted)" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--orphix-color-text)" }}>Link</span>
      </div>
    </div>
  );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 36, height: 20, borderRadius: 10, position: "relative",
        border: "none", cursor: "pointer", padding: 0,
        background: enabled ? "var(--orphix-color-primary)" : "var(--orphix-color-base-border)",
        transition: "background 0.2s",
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 8,
        background: enabled ? "#050D10" : "var(--orphix-color-text-muted)",
        position: "absolute", top: 2,
        left: enabled ? 18 : 2,
        transition: "left 0.2s, background 0.2s",
      }} />
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, color: "var(--orphix-color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1, fontWeight: 500 }}>
      {label}
    </div>
  );
}

function ApprovalCard({ req, onApprove, onReject }: { req: ApprovalRequest; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
    <div style={{
      padding: 10, borderRadius: 8, marginBottom: 6,
      background: "rgba(50,224,196,0.05)", border: "1px solid rgba(50,224,196,0.15)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Smartphone size={14} style={{ color: "var(--orphix-color-primary)" }} />
        <span style={{ fontSize: 13, color: "var(--orphix-color-text)", fontWeight: 500 }}>{req.mobileDeviceName}</span>
        <span style={{ fontSize: 12, color: "var(--orphix-color-text-muted)" }}>wants {req.mode}</span>
      </div>
      {req.terminalId && (
        <div style={{ fontSize: 12, color: "var(--orphix-color-text-muted)", marginBottom: 8 }}>
          Terminal: {req.terminalId}
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--orphix-color-text-muted)", marginBottom: 8 }}>
        Mode: {formatTransport(req.transportMode)} &middot; E2EE {req.requireE2ee === false ? "optional" : "required"}
        {req.expiresIn ? ` · expires in ${req.expiresIn}s` : ""}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onApprove(req.sessionId)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 6, fontSize: 13,
            background: "rgba(50,224,196,0.15)", border: "1px solid rgba(50,224,196,0.3)",
            color: "var(--orphix-color-primary)", cursor: "pointer",
          }}
        >
          <Check size={12} /> Approve
        </button>
        <button
          onClick={() => onReject(req.sessionId)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 6, fontSize: 13,
            background: "rgba(255,83,112,0.1)", border: "1px solid rgba(255,83,112,0.2)",
            color: "#FF5370", cursor: "pointer",
          }}
        >
          <X size={12} /> Reject
        </button>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  device,
  onDisconnect,
}: {
  session: LinkSession;
  device?: LinkedDeviceSummary;
  onDisconnect: (deviceId: string, sessionId?: string) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: 8, borderRadius: 6, marginBottom: 4,
      background: "var(--orphix-color-base-surface)", border: "1px solid var(--orphix-color-base-border)",
    }}>
      <Monitor size={14} style={{ color: "var(--orphix-color-primary)" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--orphix-color-text)" }}>
          {device?.deviceName ?? `Session ${session.sessionId.substring(0, 8)}`}
        </div>
        <div style={{ fontSize: 12, color: "var(--orphix-color-text-muted)" }}>
          {session.mode} &middot; {session.status} &middot; {formatTransport(session.activeTransport)}
        </div>
      </div>
      <button
        onClick={() => onDisconnect(session.mobileDeviceId, session.sessionId)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid rgba(255,83,112,0.25)",
          background: "rgba(255,83,112,0.08)",
          color: "#FF5370",
          cursor: "pointer",
        }}
      >
        <Unplug size={12} />
        Disconnect
      </button>
    </div>
  );
}

function RecentDeviceCard({
  device,
  onDisconnect,
}: {
  device: LinkedDeviceSummary;
  onDisconnect: (deviceId: string, sessionId?: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 8,
        marginBottom: 6,
        background: "var(--orphix-color-base-surface)",
        border: "1px solid var(--orphix-color-base-border)",
      }}
    >
      {device.deviceType === "web" ? (
        <PlugZap size={14} style={{ color: "var(--orphix-color-primary)" }} />
      ) : (
        <Smartphone size={14} style={{ color: "var(--orphix-color-primary)" }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--orphix-color-text)", fontWeight: 500 }}>
          {device.deviceName}
        </div>
        <div style={{ fontSize: 12, color: "var(--orphix-color-text-muted)" }}>
          {(device.platform ?? device.deviceType).toUpperCase()} &middot; {device.online ? "online now" : `last seen ${formatLastSeen(device.lastSeenAt)}`}
        </div>
      </div>
      <button
        onClick={() => onDisconnect(device.deviceId)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid rgba(255,83,112,0.25)",
          background: "rgba(255,83,112,0.08)",
          color: "#FF5370",
          cursor: "pointer",
        }}
      >
        <Unplug size={12} />
        Disconnect
      </button>
    </div>
  );
}

function formatLastSeen(value: string | null): string {
  if (!value) return "recently";

  const deltaMinutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;

  return `${Math.floor(deltaHours / 24)}d ago`;
}

function formatTransport(mode?: string) {
  switch (mode) {
    case "webrtc": return "Direct P2P";
    case "websocket": return "Reliable Relay";
    case "local": return "Local/LAN";
    case "auto": return "Auto";
    case "pending": return "Pending";
    default: return mode ?? "Auto";
  }
}
