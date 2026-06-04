import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { View, TouchableOpacity, Text, Animated } from "react-native";
import { Slot, useRouter } from "expo-router";
import { Menu, GitBranch, Container, Terminal, Settings, FileText, Folder, Globe } from "lucide-react-native";
import { Sidebar } from "@/components/Sidebar";
import { GitPopup } from "@/components/GitPopup";
import { DockerPopup } from "@/components/DockerPopup";
import { TerminalMenuPopup } from "@/components/TerminalMenuPopup";
import { NotesPopup } from "@/components/NotesPopup";
import { FilesPopup } from "@/components/FilesPopup";
import { BrowserPopup } from "@/components/BrowserPopup";
import { useLinkStore } from "@/stores/link-store";
import { useGitStore } from "@/stores/git-store";
import { useDockerStore } from "@/stores/docker-store";
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
  const workspaces = useLinkStore((state) => state.workspaces);
  const capabilities = useLinkStore((state) => state.capabilities);
  const createTerminal = useLinkStore((state) => state.createTerminal);
  const rpc = useLinkStore((state) => state.rpc);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null);
  const [gitOpen, setGitOpen] = useState(false);
  const [dockerOpen, setDockerOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [terminalMenuOpen, setTerminalMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const activeTerminalMeta = useMemo(() => {
    for (const workspace of workspaces) {
      for (const window of workspace.windows) {
        for (const terminal of window.terminals) {
          if (terminal.id === activeTerminal) {
            return {
              terminal,
              workspaceId: workspace.id,
              windowId: window.id,
            };
          }
        }
      }
    }
    return null;
  }, [activeTerminal, workspaces]);

  const activeCwd = activeTerminalMeta?.terminal.cwd || capabilities.filesystem.focusedPath || capabilities.filesystem.root;

  useEffect(() => {
    if (activeTerminal && activeTerminalMeta) return;
    const firstTerminal = workspaces[0]?.windows[0]?.terminals[0];
    if (firstTerminal?.id) {
      setActiveTerminal(firstTerminal.id);
    }
  }, [activeTerminal, activeTerminalMeta, workspaces]);

  const refreshGit = useCallback(async () => {
    if (!activeCwd) return;
    useGitStore.getState().setLoading(true);
    try {
      const [status, branches, stashes] = await Promise.all([
        rpc("git.status", {}, activeCwd),
        rpc("git.branches", {}, activeCwd),
        rpc("git.stash_list", {}, activeCwd),
      ]);
      useGitStore.getState().setStatus(status && !status.error ? status : null);
      useGitStore.getState().setBranches(Array.isArray(branches) ? branches : []);
      useGitStore.getState().setStashes(Array.isArray(stashes) ? stashes : []);
    } finally {
      useGitStore.getState().setLoading(false);
    }
  }, [activeCwd, rpc]);

  const refreshDocker = useCallback(async () => {
    useDockerStore.getState().setLoading(true);
    try {
      const [containers, images] = await Promise.all([
        rpc("docker.ps", { all: true }, activeCwd),
        rpc("docker.images", {}, activeCwd),
      ]);
      useDockerStore.getState().setContainers(Array.isArray(containers) ? containers : []);
      useDockerStore.getState().setImages(Array.isArray(images) ? images : []);
    } finally {
      useDockerStore.getState().setLoading(false);
    }
  }, [activeCwd, rpc]);

  const handleTerminalSelect = useCallback((terminalId: string) => {
    setActiveTerminal(terminalId);
    setSidebarOpen(false);
    router.push(`/terminal/${terminalId}`);
  }, [router]);

  const handleGitAction = useCallback(async (method: string, params?: any) => {
    const result = await rpc(method, params ?? {}, activeCwd);
    await refreshGit();
    return result;
  }, [activeCwd, refreshGit, rpc]);

  const handleDockerAction = useCallback(async (method: string, params?: any) => {
    const result = await rpc(method, params ?? {}, activeCwd);
    await refreshDocker();
    return result;
  }, [activeCwd, refreshDocker, rpc]);

  const handleTerminalAction = useCallback(async (action: string) => {
    if (action === "new") {
      createTerminal(activeCwd, undefined, activeTerminalMeta?.workspaceId, activeTerminalMeta?.windowId);
    }
  }, [activeCwd, activeTerminalMeta?.windowId, activeTerminalMeta?.workspaceId, createTerminal]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((current) => !current);
  }, []);

  useEffect(() => {
    if (gitOpen) {
      refreshGit().catch(() => {});
    }
  }, [gitOpen, refreshGit]);

  useEffect(() => {
    if (dockerOpen) {
      refreshDocker().catch(() => {});
    }
  }, [dockerOpen, refreshDocker]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Top toolbar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }}>
        <AnimatedIconButton onPress={toggleSidebar} icon={Menu} size={IS.xl} stroke={C.text} />

        <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Orphix</Text>

        <View style={{ flexDirection: "row", gap: S.lg }}>
          <AnimatedIconButton onPress={() => setFilesOpen(true)} icon={Folder} size={IS.xl} stroke={C.textMuted} />
          <AnimatedIconButton onPress={() => setGitOpen(true)} icon={GitBranch} size={IS.xl} stroke={C.textMuted} />
          <AnimatedIconButton onPress={() => setDockerOpen(true)} icon={Container} size={IS.xl} stroke={C.textMuted} />
          <AnimatedIconButton onPress={() => setBrowserOpen(true)} icon={Globe} size={IS.xl} stroke={C.textMuted} />
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
      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onTerminalSelect={handleTerminalSelect}
        onCreateTerminal={() => createTerminal(activeCwd, undefined, activeTerminalMeta?.workspaceId, activeTerminalMeta?.windowId)}
        activeTerminal={activeTerminal}
      />

      {/* Popups */}
      <FilesPopup visible={filesOpen} onClose={() => setFilesOpen(false)} cwd={activeCwd} />
      <GitPopup visible={gitOpen} onClose={() => setGitOpen(false)} onAction={handleGitAction} />
      <DockerPopup visible={dockerOpen} onClose={() => setDockerOpen(false)} onAction={handleDockerAction} />
      <BrowserPopup visible={browserOpen} onClose={() => setBrowserOpen(false)} />
      <TerminalMenuPopup visible={terminalMenuOpen} onClose={() => setTerminalMenuOpen(false)} onAction={handleTerminalAction} terminalId={activeTerminal} />
      <NotesPopup visible={notesOpen} onClose={() => setNotesOpen(false)} />
    </View>
  );
}
