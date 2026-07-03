import { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Monitor, Wifi, WifiOff, Plus, Layout, Terminal as TerminalIcon, ChevronRight, ChevronDown, Loader2, AlertCircle, RefreshCw, Settings, Smartphone, Globe } from "lucide-react-native";
import { C, S, R, FS, IS } from "@/theme/tokens";
import { apiFetch } from "@/lib/api";
import { useLinkStore } from "@/stores/link-store";

interface Device {
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

function formatLastSeen(value: string | null): string {
  if (!value) return "Not seen yet";
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWindows, setExpandedWindows] = useState<Set<string>>(new Set());
  const [selectedDesktop, setSelectedDesktop] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);

  const linkState = useLinkStore((s) => s.state);
  const linkError = useLinkStore((s) => s.error);
  const workspaces = useLinkStore((s) => s.workspaces);
  const connect = useLinkStore((s) => s.connect);
  const requestLink = useLinkStore((s) => s.requestLink);
  const createTerminal = useLinkStore((s) => s.createTerminal);
  const reset = useLinkStore((s) => s.reset);
  const notifications = useLinkStore((s) => s.notifications);
  const markNotificationsRead = useLinkStore((s) => s.markNotificationsRead);
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;
  const recentDevices = devices.filter((device) => device.online || device.seenInLast7Days);

  const loadDevices = useCallback(async () => {
    const token = await SecureStore.getItemAsync("orphix_access_token");
    if (!token) { router.replace("/login"); return; }
    try {
      const res = await apiFetch("/me/devices");
      if (res.ok) setDevices(await res.json());
    } catch (err) {
      console.error("Failed to load devices:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === selectedWorkspaceId) ?? workspaces[0] ?? null,
    [selectedWorkspaceId, workspaces],
  );

  useEffect(() => {
    if (!selectedWorkspace && workspaces[0]) {
      setSelectedWorkspaceId(workspaces[0].id);
    } else if (selectedWorkspace && selectedWorkspace.id !== selectedWorkspaceId) {
      setSelectedWorkspaceId(selectedWorkspace.id);
    }
  }, [selectedWorkspace, selectedWorkspaceId, workspaces]);

  useEffect(() => {
    if (!selectedWorkspace) return;
    setExpandedWindows((prev) => {
      const next = new Set(prev);
      selectedWorkspace.windows.forEach((win) => next.add(win.id));
      return next;
    });
  }, [selectedWorkspace]);

  const handleConnect = async (device: Device) => {
    if (device.deviceType !== "desktop") return;
    setSelectedDesktop(device.deviceId);
    try {
      await connect();
      requestLink(device.deviceId);
    } catch (err) {
      console.error("Connection failed:", err);
    }
  };

  const handleDisconnect = () => {
    reset();
    setSelectedDesktop(null);
  };

  const handleSelectTerminal = (terminalId: string) => {
    router.push(`/terminal/${terminalId}`);
  };

  const handleLogout = async () => {
    const refreshToken = await SecureStore.getItemAsync("orphix_refresh_token");
    if (refreshToken) {
      apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }).catch(() => {});
    }
    await SecureStore.deleteItemAsync("orphix_access_token");
    await SecureStore.deleteItemAsync("orphix_refresh_token");
    router.replace("/login");
  };

  const isConnected = linkState === "p2p_connected";
  const isConnecting = ["connecting", "connected", "authenticated", "requesting", "awaiting_approval", "p2p_connecting"].includes(linkState);

  // When connected, show workspace tree
  if (isConnected || isConnecting) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }}>
          <Text style={{ color: C.primary, fontSize: FS.base, fontWeight: "600" }}>
            {isConnected ? "Connected" : "Connecting..."}
          </Text>
          <View style={{ flexDirection: "row", gap: S.md }}>
            <TouchableOpacity onPress={markNotificationsRead} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <View>
                <AlertCircle size={IS.md} stroke={unreadNotifications > 0 ? C.primary : C.textMuted} />
                {unreadNotifications > 0 && (
                  <View style={{ position: "absolute", top: -6, right: -8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                    <Text style={{ color: C.bg, fontSize: 10, fontWeight: "700" }}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            {isConnected && (
              <TouchableOpacity onPress={() => createTerminal()} style={{ backgroundColor: C.primaryBg, borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection: "row", alignItems: "center", gap: S.xs }}>
                <Plus size={IS.sm} stroke={C.primary} />
                <Text style={{ color: C.primary, fontSize: FS.sm, fontWeight: "500" }}>New Terminal</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDisconnect} style={{ backgroundColor: C.dangerBg, borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.sm }}>
              <Text style={{ color: C.danger, fontSize: FS.sm }}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connecting state */}
        {isConnecting && (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: S.xxxl, gap: S.lg }}>
            <Loader2 size={IS.xxl} stroke={C.accent} />
            <Text style={{ color: C.accent, fontSize: FS.lg, fontWeight: "600", textAlign: "center" }}>
              {linkState === "awaiting_approval" ? "Waiting for approval" : "Connecting..."}
            </Text>
            <Text style={{ color: C.textDisabled, fontSize: FS.sm, textAlign: "center", lineHeight: 20 }}>
              {linkState === "awaiting_approval"
                ? "Approve the link request on your desktop"
                : "Establishing secure connection to your desktop"}
            </Text>
            <TouchableOpacity onPress={handleDisconnect} style={{ backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: S.xxl, paddingVertical: S.md, borderWidth: 1, borderColor: C.border, marginTop: S.md }}>
              <Text style={{ color: C.textMuted, fontSize: FS.sm }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error state */}
        {linkState === "error" && (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: S.xxxl, gap: S.lg }}>
            <AlertCircle size={IS.xxl} stroke={C.danger} />
            <Text style={{ color: C.danger, fontSize: FS.lg, fontWeight: "600", textAlign: "center" }}>Connection failed</Text>
            <Text style={{ color: C.textDisabled, fontSize: FS.sm, textAlign: "center" }}>{linkError ?? "Could not establish connection"}</Text>
            <View style={{ flexDirection: "row", gap: S.md, marginTop: S.md }}>
              <TouchableOpacity onPress={() => { reset(); if (selectedDesktop) handleConnect({ deviceId: selectedDesktop, deviceType: "desktop" } as Device); }} style={{ backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: S.xl, paddingVertical: S.md, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", gap: S.sm }}>
                <RefreshCw size={IS.sm} stroke={C.text} />
                <Text style={{ color: C.text, fontSize: FS.sm }}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDisconnect} style={{ backgroundColor: C.dangerBg, borderRadius: R.md, paddingHorizontal: S.xl, paddingVertical: S.md, borderWidth: 1, borderColor: C.dangerBorder }}>
                <Text style={{ color: C.danger, fontSize: FS.sm }}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Workspace tree */}
        {isConnected && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: S.md }}>
            {notifications.length > 0 && (
              <View style={{ backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.sm }}>
                  <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600" }}>Recent Alerts</Text>
                  <Text style={{ color: unreadNotifications > 0 ? C.primary : C.textMuted, fontSize: FS.xs }}>
                    {unreadNotifications > 0 ? `${unreadNotifications} unread` : "All caught up"}
                  </Text>
                </View>
                {notifications.slice(0, 3).map((notification) => (
                  <View key={notification.id} style={{ paddingVertical: S.sm, borderTopWidth: 1, borderTopColor: C.border }}>
                    <Text style={{ color: notification.severity === "error" ? C.danger : notification.severity === "warning" ? C.accent : C.text, fontSize: FS.sm, fontWeight: "600" }}>
                      {notification.title}
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: FS.xs, marginTop: 2 }}>
                      {notification.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={{ flexDirection: "row", gap: S.sm, marginBottom: S.md }}>
              <TouchableOpacity
                onPress={() => setWorkspacePickerOpen(true)}
                style={{ flex: 1, minHeight: 40, backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.md, flexDirection: "row", alignItems: "center", gap: S.sm }}
              >
                <Layout size={IS.sm} stroke={C.textMuted} />
                <Text style={{ color: C.text, fontSize: FS.sm, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                  {selectedWorkspace?.name ?? "No workspace"}
                </Text>
                <ChevronDown size={IS.sm} stroke={C.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => createTerminal()} style={{ width: 40, height: 40, backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" }}>
                <Plus size={IS.sm} stroke={C.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => createTerminal(undefined, undefined, selectedWorkspace?.id)} style={{ backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.md, paddingVertical: S.sm, marginBottom: S.md, flexDirection: "row", alignItems: "center", gap: S.sm }}>
              <Plus size={IS.sm} stroke={C.primary} />
              <Text style={{ color: C.primary, fontSize: FS.sm, fontWeight: "500" }}>New window</Text>
            </TouchableOpacity>
            {workspaces.length === 0 && (
              <View style={{ alignItems: "center", paddingTop: 60, gap: S.md }}>
                <TerminalIcon size={IS.xl} stroke={C.textDisabled} />
                <Text style={{ color: C.textMuted, fontSize: FS.sm }}>No terminals yet</Text>
                <TouchableOpacity onPress={() => createTerminal()} style={{ backgroundColor: C.primaryBg, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, flexDirection: "row", alignItems: "center", gap: S.sm }}>
                  <Plus size={IS.sm} stroke={C.primary} />
                  <Text style={{ color: C.primary, fontSize: FS.sm }}>Create Terminal</Text>
                </TouchableOpacity>
              </View>
            )}
            {selectedWorkspace && (
              <View key={selectedWorkspace.id} style={{ marginBottom: S.sm }}>
                {selectedWorkspace.windows.map((win) => (
                  <View key={win.id} style={{ marginLeft: S.lg }}>
                    <TouchableOpacity onPress={() => {
                      const next = new Set(expandedWindows);
                      next.has(win.id) ? next.delete(win.id) : next.add(win.id);
                      setExpandedWindows(next);
                    }} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.xs, paddingHorizontal: S.sm }}>
                      {expandedWindows.has(win.id) ? <ChevronDown size={IS.xs} stroke={C.textDisabled} /> : <ChevronRight size={IS.xs} stroke={C.textDisabled} />}
                      <Layout size={IS.sm} stroke={C.textDisabled} />
                      <Text style={{ color: C.textMuted, fontSize: FS.sm, flex: 1 }}>{win.name}</Text>
                      <TouchableOpacity onPress={() => createTerminal(undefined, undefined, selectedWorkspace.id, win.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Plus size={IS.sm} stroke={C.textMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {expandedWindows.has(win.id) && win.terminals.map((term) => (
                      <TouchableOpacity key={term.id} onPress={() => handleSelectTerminal(term.id)} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.sm, paddingHorizontal: S.md, marginLeft: S.lg, borderRadius: R.sm }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: term.status === "running" ? C.primary : term.status === "exited" ? C.danger : C.textDisabled }} />
                        <TerminalIcon size={IS.xs} stroke={C.textMuted} />
                        <Text style={{ color: C.text, fontSize: FS.sm, flex: 1 }}>{term.name}</Text>
                        <Text style={{ color: C.textDisabled, fontSize: FS.xs }}>{term.status}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}
            <Modal transparent visible={workspacePickerOpen} animationType="fade" onRequestClose={() => setWorkspacePickerOpen(false)}>
              <TouchableOpacity activeOpacity={1} onPress={() => setWorkspacePickerOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: S.xl }}>
                <View style={{ backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
                  {workspaces.map((ws) => (
                    <TouchableOpacity
                      key={ws.id}
                      onPress={() => { setSelectedWorkspaceId(ws.id); setWorkspacePickerOpen(false); }}
                      style={{ paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border }}
                    >
                      <Text style={{ color: selectedWorkspace?.id === ws.id ? C.primary : C.text, fontSize: FS.sm, fontWeight: "600" }}>{ws.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </ScrollView>
        )}
      </View>
    );
  }

  // Device list (default state)
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }}>
        <Text style={{ color: C.primary, fontSize: FS.base, fontWeight: "600", letterSpacing: 1 }}>ORPHIX</Text>
        <View style={{ flexDirection: "row", gap: S.md }}>
          <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
            <View>
              <AlertCircle size={IS.md} stroke={unreadNotifications > 0 ? C.primary : C.textMuted} />
              {unreadNotifications > 0 && (
                <View style={{ position: "absolute", top: -6, right: -8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                  <Text style={{ color: C.bg, fontSize: 10, fontWeight: "700" }}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/settings")} style={{ padding: S.sm }}>
            <Settings size={IS.md} stroke={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={{ padding: S.sm }}>
            <Text style={{ color: C.danger, fontSize: FS.sm }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevices(); }} tintColor={C.primary} />}
        contentContainerStyle={{ padding: S.lg }}
      >
        <Text style={{ color: C.textMuted, fontSize: FS.sm, marginBottom: S.md }}>Your Devices</Text>
        {devices.filter((d) => d.deviceType === "desktop").map((device) => (
          <TouchableOpacity
            key={device.id}
            onPress={() => handleConnect(device)}
            style={{ backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.xl, marginBottom: S.md }}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: S.lg }}>
                <Monitor size={IS.xl} stroke={C.textMuted} />
                <View>
                  <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600" }}>{device.deviceName}</Text>
                  <Text style={{ color: C.textMuted, fontSize: FS.sm }}>{device.platform ?? "desktop"} · {device.deviceId}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
                  {device.online ? <Wifi size={IS.sm} stroke={C.primary} /> : <WifiOff size={IS.sm} stroke={C.textDisabled} />}
                  <Text style={{ fontSize: FS.xs, color: device.online ? C.primary : C.textDisabled }}>{device.online ? "Online" : "Offline"}</Text>
                </View>
                <TouchableOpacity onPress={() => handleConnect(device)} style={{ backgroundColor: C.primaryBg, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md }}>
                  <Text style={{ color: C.primary, fontSize: FS.sm, fontWeight: "500" }}>Connect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {recentDevices.filter((device) => device.deviceType !== "desktop").length > 0 && (
          <>
            <Text style={{ color: C.textMuted, fontSize: FS.sm, marginTop: S.lg, marginBottom: S.md }}>Seen In Last 7 Days</Text>
            {recentDevices.filter((device) => device.deviceType !== "desktop").map((device) => (
              <View
                key={device.id}
                style={{ backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, marginBottom: S.md, flexDirection: "row", alignItems: "center", gap: S.lg }}
              >
                {device.deviceType === "web" ? <Globe size={IS.lg} stroke={C.textMuted} /> : <Smartphone size={IS.lg} stroke={C.textMuted} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600" }}>{device.deviceName}</Text>
                  <Text style={{ color: C.textMuted, fontSize: FS.sm }}>{device.platform ?? device.deviceType} · {device.online ? "online now" : `last seen ${formatLastSeen(device.lastSeenAt)}`}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {devices.filter((d) => d.deviceType === "desktop").length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Monitor size={40} stroke={C.textDisabled} />
            <Text style={{ color: C.textMuted, fontSize: FS.base, marginTop: S.md }}>No desktop devices found</Text>
            <Text style={{ color: C.textDisabled, fontSize: FS.sm, marginTop: S.xs }}>Register a device from the desktop app</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
