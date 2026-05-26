import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { C, S, R, FS, IS } from "@/theme/tokens";

const WEB_AUTH_URL = "http://localhost:3000/login";
const REDIRECT_URI = "orphix://auth/callback";

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Open web login page with client=mobile and redirect deep link
      const authUrl = `${WEB_AUTH_URL}?client=mobile&redirect=${encodeURIComponent(REDIRECT_URI)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

      if (result.type === "success" && result.url) {
        // Parse tokens from the deep link callback fragment
        const url = new URL(result.url);
        const hash = url.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          await SecureStore.setItemAsync("orphix_access_token", accessToken);
          await SecureStore.setItemAsync("orphix_refresh_token", refreshToken);
          router.replace("/home");
        }
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", paddingHorizontal: S.xxl }}>
      <View style={{ alignItems: "center", marginBottom: 48 }}>
        <View style={{ width: 80, height: 80, borderRadius: R.xl, backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primaryBorder, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: FS.xxxl, color: C.primary }}>⌘</Text>
        </View>
        <Text style={{ color: C.text, fontSize: FS.xxxl, fontWeight: "bold", marginTop: S.xl }}>Orphix</Text>
        <Text style={{ color: C.textMuted, fontSize: FS.base, marginTop: S.sm }}>Secure terminal control</Text>
      </View>

      <View style={{ gap: S.sm, marginBottom: S.xxxl }}>
        {["Control desktop terminals from anywhere", "End-to-end encrypted P2P", "Works on any network"].map((text) => (
          <View key={text} style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: R.sm, padding: S.lg, borderWidth: 1, borderColor: C.border }}>
            <View style={{ width: 10, height: 10, borderRadius: R.full, backgroundColor: C.primary, marginRight: S.lg }} />
            <Text style={{ color: C.textMuted, fontSize: FS.base }}>{text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{ backgroundColor: C.text, borderRadius: R.sm, paddingVertical: 18, alignItems: "center", opacity: loading ? 0.5 : 1 }}
      >
        {loading ? (
          <ActivityIndicator color={C.bg} />
        ) : (
          <Text style={{ color: C.bg, fontSize: FS.base, fontWeight: "600" }}>Sign in with GitHub</Text>
        )}
      </TouchableOpacity>

      <Text style={{ color: C.textDisabled, fontSize: FS.sm, textAlign: "center", marginTop: S.lg }}>
        Opens secure web login
      </Text>
    </View>
  );
}
