import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { LogOut, User, Shield, Bell } from "lucide-react-native";
import { C, S, R, FS, IS } from "@/theme/tokens";

export default function SettingsScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync("orphix_access_token").then((token) => {
      if (!token) return;
      fetch("http://localhost:2605/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((user) => setUsername(user.githubUsername))
        .catch(() => {});
    });
  }, []);

  const handleLogout = async () => {
    const token = await SecureStore.getItemAsync("orphix_access_token");
    const refreshToken = await SecureStore.getItemAsync("orphix_refresh_token");
    if (token && refreshToken) {
      fetch("http://localhost:2605/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

      {/* Security */}
      <View style={{ backgroundColor: C.surface, borderRadius: R.md, padding: S.lg, borderWidth: 1, borderColor: C.border, marginBottom: S.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.md, marginBottom: S.lg }}>
          <Shield size={IS.md} stroke={C.textMuted} />
          <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "500" }}>Security</Text>
        </View>
        <View style={{ gap: S.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: C.textMuted, fontSize: FS.sm }}>Device trust</Text>
            <Text style={{ color: C.primary, fontSize: FS.sm }}>Enabled</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: C.textMuted, fontSize: FS.sm }}>P2P encryption</Text>
            <Text style={{ color: C.primary, fontSize: FS.sm }}>Active</Text>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={{ backgroundColor: C.surface, borderRadius: R.md, padding: S.lg, borderWidth: 1, borderColor: C.border, marginBottom: S.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.md }}>
          <Bell size={IS.md} stroke={C.textMuted} />
          <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "500" }}>Notifications</Text>
        </View>
        <Text style={{ color: C.textDisabled, fontSize: FS.sm, marginTop: S.sm }}>Coming soon</Text>
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
