import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Monitor, Smartphone } from "lucide-react-native";
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

    return (
      <TouchableOpacity
        onPress={() => handleConnect(item)}
        style={{ marginHorizontal: S.lg, marginBottom: S.md, borderRadius: R.md, backgroundColor: C.surface, padding: S.xl, borderWidth: 1, borderColor: C.border }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: S.lg }}>
            <View style={{ width: 48, height: 48, borderRadius: R.md, backgroundColor: C.surfaceMuted, justifyContent: "center", alignItems: "center" }}>
              {isDesktop ? <Monitor size={IS.xl} stroke={C.primary} /> : <Smartphone size={IS.xl} stroke={C.accent} />}
            </View>
            <View>
              <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600" }}>{item.deviceName}</Text>
              <Text style={{ color: C.textDisabled, fontSize: FS.sm }}>{item.platform ?? item.deviceType} · {item.deviceId}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: S.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
              <View style={{ width: 10, height: 10, borderRadius: R.full, backgroundColor: isTrusted ? C.primary : C.textDisabled }} />
              <Text style={{ color: isTrusted ? C.primary : C.textDisabled, fontSize: FS.sm }}>{item.status}</Text>
            </View>
            {isDesktop && (
              <TouchableOpacity
                onPress={() => handleConnect(item)}
                style={{ backgroundColor: C.primaryBgStrong, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md }}
              >
                <Text style={{ color: C.primary, fontSize: FS.sm, fontWeight: "500" }}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
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
        contentContainerStyle={{ paddingVertical: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevices(); }} tintColor={C.primary} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Monitor size={40} stroke={C.textDisabled} />
            <Text style={{ color: C.textMuted, fontSize: 16, marginTop: 12 }}>No devices found</Text>
            <Text style={{ color: C.textDisabled, fontSize: 12, marginTop: 4 }}>Register a device from the desktop app</Text>
          </View>
        }
      />
    </View>
  );
}
