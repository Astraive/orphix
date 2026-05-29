import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// On a real device, "localhost" points to the phone itself.
// For development on a physical device, set the host machine's LAN IP here.
// For Android emulator, use 10.0.2.2; for iOS simulator, localhost works.
const DEV_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

const CONTROL_URL = process.env.EXPO_PUBLIC_CONTROL_URL ?? `http://${DEV_HOST}:2605`;
const LINK_URL = process.env.EXPO_PUBLIC_LINK_URL ?? `http://${DEV_HOST}:2606`;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync("orphix_access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${CONTROL_URL}${path}`, { ...options, headers });
}

export function getLinkUrl() {
  return LINK_URL;
}

export function getControlUrl() {
  return CONTROL_URL;
}
