import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Monitor, Smartphone, Wifi, WifiOff } from "lucide-react-native";
import { C, S, R, FS, IS } from "@/theme/tokens";

interface Device {
  id: string;
  deviceId: string;
  deviceType: string;
  deviceName: string;
  platform: string | null;
  status: string;
  lastSeenAt: string | null;
}

export default function DevicesScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDevices = useCallback(async () => {
    const token = await SecureStore.getItemAsync("orphix_access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch("http://localhost:2605/me/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const handleConnect = (device: Device) => {
    if (device.deviceType === "desktop") {
      router.push(`/terminal/${device.deviceId}`);
    }
  };

  const renderDevice = ({ item }: { item: Device }) => {
    const isDesktop = item.deviceType === "desktop";
    const isTrusted = item.status === "trusted";
    const isOnline = item.status === "online";

    return (
      <TouchableOpacity
        onPress={() => handleConnect(item)}
        style={{ marginHorizontal: S.lg, marginBottom: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: S.xl }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: S.lg }}>
            {isDesktop ? (
              <Monitor size={IS.xl} stroke={C.textMuted} />
            ) : (
              <Smartphone size={IS.xl} stroke={C.textMuted} />
            )}
            <View>
              <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600" }}>{item.deviceName}</Text>
              <Text style={{ color: C.textMuted, fontSize: FS.sm }}>
                {item.platform ?? item.deviceType} · {item.deviceId}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
            <View
              style={{ borderRadius: R.full, paddingHorizontal: S.sm, paddingVertical: S.xs, backgroundColor: isTrusted ? C.primaryBgStrong : "rgba(143, 163, 168, 0.15)" }}
            >
              <Text
                style={{ fontSize: FS.sm, fontWeight: "500", color: isTrusted ? C.primary : C.textMuted }}
              >
                {item.status}
              </Text>
            </View>
            {isDesktop && (
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
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevices(); }} tintColor={C.primary} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Monitor size={40} stroke="#5A7A80" />
            <Text style={{ marginTop: 16, fontSize: 16, color: C.textMuted }}>No devices found</Text>
            <Text style={{ fontSize: 12, color: C.textDisabled }}>Register a device from the desktop app</Text>
          </View>
        }
      />
    </View>
  );
}
