import React, { useState, useCallback } from "react";
import { View, TouchableOpacity, Text } from "react-native";
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
    // In real implementation, send via WebSocket/DataChannel to desktop
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
        <TouchableOpacity onPress={toggleSidebar} style={{ padding: S.sm }}>
          <Menu size={IS.xl} stroke={C.text} />
        </TouchableOpacity>

        <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Orphix</Text>

        <View style={{ flexDirection: "row", gap: S.lg }}>
          <TouchableOpacity onPress={() => setGitOpen(true)} style={{ padding: S.sm }}>
            <GitBranch size={IS.xl} stroke={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDockerOpen(true)} style={{ padding: S.sm }}>
            <Container size={IS.xl} stroke={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTerminalMenuOpen(true)} style={{ padding: S.sm }}>
            <Terminal size={IS.xl} stroke={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNotesOpen(true)} style={{ padding: S.sm }}>
            <FileText size={IS.xl} stroke={C.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(app)/settings")} style={{ padding: S.sm }}>
            <Settings size={IS.xl} stroke={C.textMuted} />
          </TouchableOpacity>
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
