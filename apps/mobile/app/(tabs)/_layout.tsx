import { Text } from "react-native";
import { Tabs } from "expo-router";
import { Monitor, Link2, Settings } from "lucide-react-native";
import { C, S, FS, IS } from "@/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: C.surface },
        headerTintColor: C.text,
        headerTitleStyle: { fontSize: FS.lg, fontWeight: "600" },
        tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.border, paddingTop: S.sm, paddingBottom: S.sm, height: 56 },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textSubtle,
        tabBarLabelStyle: { fontSize: FS.xs, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="devices"
        options={{
          title: "Devices",
          tabBarIcon: ({ color, size }) => <Monitor size={IS.xl} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "Connect",
          tabBarIcon: ({ color, size }) => <Link2 size={IS.xl} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={IS.xl} stroke={color} />,
        }}
      />
    </Tabs>
  );
}
