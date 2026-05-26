import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { C } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="terminal/[id]" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }} />
      </Stack>
    </>
  );
}
