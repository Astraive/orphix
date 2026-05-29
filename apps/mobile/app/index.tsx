import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    SecureStore.getItemAsync("orphix_access_token").then((token) => {
      if (token) {
        router.replace("/home");
      } else {
        router.replace("/login");
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050D10" }}>
      <ActivityIndicator color="#32E0C4" />
    </View>
  );
}
