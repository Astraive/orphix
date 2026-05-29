import React, { useState, useCallback, useRef } from "react";
import { View, TouchableOpacity, Text, Animated } from "react-native";
import { Slot, useRouter } from "expo-router";
import { Menu, GitBranch, Container, Terminal, Settings, FileText } from "lucide-react-native";
import { Sidebar } from "@/components/Sidebar";
import { GitPopup } from "@/components/GitPopup";
import { DockerPopup } from "@/components/DockerPopup";
import { TerminalMenuPopup } from "@/components/TerminalMenuPopup";
import { NotesPopup } from "@/components/NotesPopup";
import { useTerminalStore } from "@/stores/terminal-store";
import { useGitStore } from "@/stores/git-store";
import { useDockerStore } from "@/stores/docker-store";
import { apiFetch } from "@/lib/api";
import { C, S, FS, IS } from "@/theme/tokens";

function AnimatedIconButton({ onPress, icon: Icon, size, stroke }: {
  onPress: () => void; icon: any; size: number; stroke: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, tension: 100, friction: 5 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 5 }).start()}
        style={{ padding: S.sm }}
      >
        <Icon size={size} stroke={stroke} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AppLayout() {
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, setSidebarOpen, activeTerminal } = useTerminalStore();
  const [gitOpen, setGitOpen] = useState(false);
  const [dockerOpen, setDockerOpen] = useState(false);
  const [terminalMenuOpen, setTerminalMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const handleTerminalSelect = useCallback((terminalId: string) => {
    setSidebarOpen(false);
    router.push(`/terminal/${terminalId}`);
  }, [router]);

  const handleGitAction = useCallback(async (method: string, params?: any) => {
    console.log("Git action:", method, params);
  }, []);

  const handleDockerAction = useCallback(async (method: string, params?: any) => {
    console.log("Docker action:", method, params);
  }, []);

  const handleTerminalAction = useCallback((action: string) => {
    console.log("Terminal action:", action);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Top toolbar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }}>
        <AnimatedIconButton onPress={toggleSidebar} icon={Menu} size={IS.xl} stroke={C.text} />

        <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Orphix</Text>

        <View style={{ flexDirection: "row", gap: S.lg }}>
          <AnimatedIconButton onPress={() => setGitOpen(true)} icon={GitBranch} size={IS.xl} stroke={C.textMuted} />
          <AnimatedIconButton onPress={() => setDockerOpen(true)} icon={Container} size={IS.xl} stroke={C.textMuted} />
          <AnimatedIconButton onPress={() => setTerminalMenuOpen(true)} icon={Terminal} size={IS.xl} stroke={C.textMuted} />
          <AnimatedIconButton onPress={() => setNotesOpen(true)} icon={FileText} size={IS.xl} stroke={C.textMuted} />
          <AnimatedIconButton onPress={() => router.push("/(app)/settings")} icon={Settings} size={IS.xl} stroke={C.textMuted} />
        </View>
      </View>

      {/* Main content */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      {/* Sidebar */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} onTerminalSelect={handleTerminalSelect} />

      {/* Popups */}
      <GitPopup visible={gitOpen} onClose={() => setGitOpen(false)} onAction={handleGitAction} />
      <DockerPopup visible={dockerOpen} onClose={() => setDockerOpen(false)} onAction={handleDockerAction} />
      <TerminalMenuPopup visible={terminalMenuOpen} onClose={() => setTerminalMenuOpen(false)} onAction={handleTerminalAction} terminalId={activeTerminal} />
      <NotesPopup visible={notesOpen} onClose={() => setNotesOpen(false)} />
    </View>
  );
}
