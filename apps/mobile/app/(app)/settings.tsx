import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { LogOut, User } from "lucide-react-native";
import { C, S, R, FS, IS } from "@/theme/tokens";
import { apiFetch } from "@/lib/api";
import { useLinkStore, type ConnectionMode } from "@/stores/link-store";

const LINK_MODE_KEY = "orphix_link_transport_mode";

export default function SettingsScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const connectionMode = useLinkStore((s) => s.connectionMode);
  const setConnectionMode = useLinkStore((s) => s.setConnectionMode);

  useEffect(() => {
    apiFetch("/me")
      .then((res) => res.json())
      .then((user) => setUsername(user.githubUsername))
      .catch(() => {});
    SecureStore.getItemAsync(LINK_MODE_KEY).then((mode) => {
      if (mode === "auto" || mode === "webrtc" || mode === "websocket" || mode === "local") {
        setConnectionMode(mode);
      }
    });
  }, []);

  const chooseMode = async (mode: ConnectionMode) => {
    setConnectionMode(mode);
    await SecureStore.setItemAsync(LINK_MODE_KEY, mode);
  };

  const handleLogout = async () => {
    const refreshToken = await SecureStore.getItemAsync("orphix_refresh_token");
    if (refreshToken) {
      apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    await SecureStore.deleteItemAsync("orphix_access_token");
    await SecureStore.deleteItemAsync("orphix_refresh_token");
    router.replace("/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingHorizontal: S.lg, paddingVertical: S.xl }}>
      {/* Account */}
      <View style={{ marginBottom: S.xl, borderRadius: R.md, backgroundColor: C.surface, padding: S.xl, borderWidth: 1, borderColor: C.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.lg }}>
          <View style={{ width: 56, height: 56, borderRadius: R.full, backgroundColor: C.primaryBg, justifyContent: "center", alignItems: "center" }}>
            <User size={IS.lg} stroke={C.primary} />
          </View>
          <View>
            <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>{username ?? "Loading..."}</Text>
            <Text style={{ color: C.textMuted, fontSize: FS.sm }}>GitHub Account</Text>
          </View>
        </View>
      </View>

      <View style={{ marginBottom: S.xl, borderRadius: R.md, backgroundColor: C.surface, padding: S.xl, borderWidth: 1, borderColor: C.border }}>
        <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600", marginBottom: S.md }}>Connection Mode</Text>
        {([
          ["auto", "Auto"],
          ["webrtc", "Direct P2P"],
          ["websocket", "Reliable Relay"],
          ["local", "Local/LAN"],
        ] as Array<[ConnectionMode, string]>).map(([mode, label]) => (
          <TouchableOpacity
            key={mode}
            onPress={() => chooseMode(mode)}
            style={{
              padding: S.md,
              borderRadius: R.sm,
              borderWidth: 1,
              borderColor: connectionMode === mode ? C.primary : C.border,
              backgroundColor: connectionMode === mode ? C.primaryBg : "transparent",
              marginTop: S.sm,
            }}
          >
            <Text style={{ color: connectionMode === mode ? C.primary : C.text, fontSize: FS.sm }}>{label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={{ color: C.textMuted, fontSize: FS.sm, marginTop: S.md }}>End-to-end encryption is on for relayed traffic by default.</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity
        onPress={handleLogout}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm, backgroundColor: C.dangerBg, borderRadius: R.md, padding: S.xl, borderWidth: 1, borderColor: C.dangerBorder, marginTop: S.lg }}
      >
        <LogOut size={IS.lg} stroke={C.danger} />
        <Text style={{ color: C.danger, fontSize: FS.base, fontWeight: "500" }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
