import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Monitor, Smartphone, Wifi, WifiOff, Plus, ChevronRight, ChevronDown, Layout, Terminal as TerminalIcon, Folder } from "lucide-react-native";
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
}

export default function DevicesScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [expandedWindows, setExpandedWindows] = useState<Set<string>>(new Set());

  const linkState = useLinkStore((s) => s.state);
  const workspaces = useLinkStore((s) => s.workspaces);
  const connect = useLinkStore((s) => s.connect);
  const requestLink = useLinkStore((s) => s.requestLink);
  const createTerminal = useLinkStore((s) => s.createTerminal);
  const reset = useLinkStore((s) => s.reset);

  const isConnected = linkState === "p2p_connected" || linkState === "terminal_attached";

  const loadDevices = useCallback(async () => {
    const token = await SecureStore.getItemAsync("orphix_access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const res = await apiFetch("/me/devices");
      if (res.ok) {
        setDevices(await res.json());
      }
    } catch (err) {
      console.error("Failed to load devices:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  // Auto-expand workspaces when they arrive
  useEffect(() => {
    if (workspaces.length > 0 && expandedWorkspaces.size === 0) {
      setExpandedWorkspaces(new Set(workspaces.map((ws) => ws.id)));
    }
  }, [workspaces]);

  const handleConnect = async (device: Device) => {
    if (device.deviceType === "desktop" && device.online) {
      await connect();
      requestLink(device.deviceId);
    }
  };

  const handleTerminalPress = (terminalId: string) => {
    router.push(`/terminal/${terminalId}`);
  };

  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleWindow = (id: string) => {
    setExpandedWindows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderWorkspaceTree = () => {
    if (!isConnected || workspaces.length === 0) return null;

    return (
      <View style={{ marginHorizontal: S.lg, marginBottom: S.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.md }}>
          <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600" }}>Workspaces</Text>
          <TouchableOpacity
            onPress={() => createTerminal()}
            style={{ flexDirection: "row", alignItems: "center", gap: S.xs, backgroundColor: C.primaryBg, borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.xs }}
          >
            <Plus size={IS.xs} stroke={C.primary} />
            <Text style={{ color: C.primary, fontSize: FS.sm, fontWeight: "500" }}>New Terminal</Text>
          </TouchableOpacity>
        </View>

        {workspaces.map((ws) => (
          <View key={ws.id} style={{ marginBottom: S.sm }}>
            <TouchableOpacity
              onPress={() => toggleWorkspace(ws.id)}
              style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.sm }}
            >
              {expandedWorkspaces.has(ws.id) ? (
                <ChevronDown size={IS.sm} stroke={C.textMuted} />
              ) : (
                <ChevronRight size={IS.sm} stroke={C.textMuted} />
              )}
              <Folder size={IS.sm} stroke={C.textMuted} />
              <Text style={{ color: C.text, fontSize: FS.sm, fontWeight: "500" }}>{ws.name}</Text>
            </TouchableOpacity>

            {expandedWorkspaces.has(ws.id) && ws.windows.map((win) => (
              <View key={win.id} style={{ marginLeft: S.lg }}>
                <TouchableOpacity
                  onPress={() => toggleWindow(win.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.xs }}
                >
                  {expandedWindows.has(win.id) ? (
                    <ChevronDown size={IS.xs} stroke={C.textMuted} />
                  ) : (
                    <ChevronRight size={IS.xs} stroke={C.textMuted} />
                  )}
                  <Layout size={IS.xs} stroke={C.textMuted} />
                  <Text style={{ color: C.textMuted, fontSize: FS.sm }}>{win.name}</Text>
                </TouchableOpacity>

                {expandedWindows.has(win.id) && win.terminals.map((term) => (
                  <TouchableOpacity
                    key={term.id}
                    onPress={() => handleTerminalPress(term.id)}
                    style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.xs, marginLeft: S.lg, paddingLeft: S.sm }}
                  >
                    <TerminalIcon size={IS.xs} stroke={C.textMuted} />
                    <Text style={{ color: C.text, fontSize: FS.sm, flex: 1 }}>{term.name}</Text>
                    {term.status === "running" && (
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderDevice = ({ item }: { item: Device }) => {
    const isDesktop = item.deviceType === "desktop";
    const isOnline = item.online;

    return (
      <TouchableOpacity
        onPress={() => handleConnect(item)}
        style={{ marginHorizontal: S.lg, marginBottom: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: S.xl }}
        activeOpacity={0.7}
        disabled={!isOnline}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: S.lg }}>
            {isDesktop ? (
              <Monitor size={IS.xl} stroke={isOnline ? C.text : C.textDisabled} />
            ) : (
              <Smartphone size={IS.xl} stroke={isOnline ? C.text : C.textDisabled} />
            )}
            <View>
              <Text style={{ color: isOnline ? C.text : C.textDisabled, fontSize: FS.base, fontWeight: "600" }}>{item.deviceName}</Text>
              <Text style={{ color: C.textMuted, fontSize: FS.sm }}>
                {item.platform ?? item.deviceType}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
            {isOnline ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs, backgroundColor: C.primaryBg, borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: S.xs }}>
                <Wifi size={IS.xs} stroke={C.primary} />
                <Text style={{ fontSize: FS.sm, fontWeight: "500", color: C.primary }}>Online</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs, backgroundColor: "rgba(143, 163, 168, 0.15)", borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: S.xs }}>
                <WifiOff size={IS.xs} stroke={C.textMuted} />
                <Text style={{ fontSize: FS.sm, fontWeight: "500", color: C.textMuted }}>Offline</Text>
              </View>
            )}
            {isDesktop && isOnline && (
              <TouchableOpacity
                onPress={() => handleConnect(item)}
                style={{ borderRadius: R.sm, backgroundColor: C.primaryBg, paddingHorizontal: S.lg, paddingVertical: S.md }}
              >
                <Text style={{ fontSize: FS.sm, fontWeight: "500", color: C.primary }}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        contentContainerStyle={{ paddingVertical: S.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevices(); }} tintColor={C.primary} />
        }
        ListHeaderComponent={renderWorkspaceTree()}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Monitor size={40} stroke={C.textDisabled} />
            <Text style={{ color: C.textMuted, fontSize: FS.base, marginTop: S.md }}>No devices found</Text>
            <Text style={{ color: C.textDisabled, fontSize: FS.sm, marginTop: S.xs }}>Register a device from the desktop app</Text>
          </View>
        }
      />
    </View>
  );
}
