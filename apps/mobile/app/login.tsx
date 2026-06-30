import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { C, S, R, FS, IS } from "@/theme/tokens";

const WEB_AUTH_URL = `${process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000"}/login`;
const REDIRECT_URI = "orphix://auth/callback";
const AUTH_STATE_BYTES = 32;

function createAuthState() {
  const bytes = new Uint8Array(AUTH_STATE_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateCallbackUrl(callbackUrl: string, expectedState: string) {
  const url = new URL(callbackUrl);
  const expectedUrl = new URL(REDIRECT_URI);

  if (url.protocol !== expectedUrl.protocol || url.hostname !== expectedUrl.hostname || url.pathname !== expectedUrl.pathname) {
    throw new Error("Unexpected authentication callback URL");
  }

  const params = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.search);
  const state = params.get("state");

  if (!state || state !== expectedState) {
    throw new Error("Authentication state mismatch");
  }

  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
  };
}

const FEATURES = [
  "Control desktop terminals from anywhere",
  "End-to-end encrypted P2P",
  "Works on any network",
];

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(12)).current;
  const featureOpacities = FEATURES.map(() => useRef(new Animated.Value(0)).current);
  const featureTranslates = FEATURES.map(() => useRef(new Animated.Value(16)).current);
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(titleOpacity, { toValue: 1, duration: 300, delay: 200, useNativeDriver: true }),
      Animated.timing(titleTranslate, { toValue: 0, duration: 300, delay: 200, useNativeDriver: true }),
    ]).start();

    FEATURES.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(featureOpacities[i], { toValue: 1, duration: 300, delay: 400 + i * 100, useNativeDriver: true }),
        Animated.timing(featureTranslates[i], { toValue: 0, duration: 300, delay: 400 + i * 100, useNativeDriver: true }),
      ]).start();
    });

    Animated.parallel([
      Animated.timing(buttonOpacity, { toValue: 1, duration: 300, delay: 700, useNativeDriver: true }),
      Animated.timing(buttonTranslate, { toValue: 0, duration: 300, delay: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const authState = createAuthState();
      const params = new URLSearchParams({
        client: "mobile",
        redirect: REDIRECT_URI,
        state: authState,
      });
      const authUrl = `${WEB_AUTH_URL}?${params.toString()}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

      if (result.type === "success" && result.url) {
        const { accessToken, refreshToken } = validateCallbackUrl(result.url, authState);

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
      {/* Logo */}
      <Animated.View style={{ alignItems: "center", marginBottom: 48, opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <View style={{ width: 80, height: 80, borderRadius: R.xl, backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primaryBorder, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: FS.xxxl, color: C.primary }}>⌘</Text>
        </View>
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslate }] }}>
          <Text style={{ color: C.text, fontSize: FS.xxxl, fontWeight: "bold", marginTop: S.xl }}>Orphix</Text>
          <Text style={{ color: C.textMuted, fontSize: FS.base, marginTop: S.sm }}>Secure terminal control</Text>
        </Animated.View>
      </Animated.View>

      {/* Features */}
      <View style={{ gap: S.sm, marginBottom: S.xxxl }}>
        {FEATURES.map((text, i) => (
          <Animated.View key={text} style={{ opacity: featureOpacities[i], transform: [{ translateY: featureTranslates[i] }] }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: R.sm, padding: S.lg, borderWidth: 1, borderColor: C.border }}>
              <View style={{ width: 10, height: 10, borderRadius: R.full, backgroundColor: C.primary, marginRight: S.lg }} />
              <Text style={{ color: C.textMuted, fontSize: FS.base }}>{text}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Login button */}
      <Animated.View style={{ opacity: buttonOpacity, transform: [{ translateY: buttonTranslate }] }}>
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
      </Animated.View>

      <Animated.Text style={{ color: C.textDisabled, fontSize: FS.sm, textAlign: "center", marginTop: S.lg, opacity: buttonOpacity }}>
        Opens secure web login
      </Animated.Text>
    </View>
  );
}
