import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Pressable, Animated } from "react-native";
import { Monitor as MonitorIcon, ChevronRight, ChevronDown, Terminal as TerminalIcon, Plus, X } from "lucide-react-native";
import { useTerminalStore, type Workspace, type TerminalWindow, type Terminal } from "@/stores/terminal-store";
import { C, S, R, FS, IS } from "@/theme/tokens";

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onTerminalSelect: (terminalId: string) => void;
}

function TerminalItem({ terminal, isActive, onSelect }: { terminal: Terminal; isActive: boolean; onSelect: () => void }) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: S.sm,
        paddingVertical: S.sm,
        paddingHorizontal: S.xl,
        paddingLeft: 48,
        backgroundColor: isActive ? C.primaryBg : "transparent",
        borderLeftWidth: 2,
        borderLeftColor: isActive ? C.primary : "transparent",
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: terminal.status === "running" ? C.primary : C.textDisabled }} />
      <Text style={{ color: isActive ? C.text : C.textMuted, fontSize: FS.base, flex: 1 }} numberOfLines={1}>
        {terminal.name}
      </Text>
      <Text style={{ color: C.textDisabled, fontSize: FS.xs }}>{terminal.shell}</Text>
    </TouchableOpacity>
  );
}

function WindowItem({ window, expanded, onToggle, activeTerminal, onTerminalSelect }: {
  window: TerminalWindow;
  expanded: boolean;
  onToggle: () => void;
  activeTerminal: string | null;
  onTerminalSelect: (id: string) => void;
}) {
  return (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: S.sm,
          paddingVertical: S.md,
          paddingHorizontal: S.xl,
          paddingLeft: 32,
        }}
      >
        {expanded ? <ChevronDown size={IS.lg} stroke={C.textMuted} /> : <ChevronRight size={IS.lg} stroke={C.textMuted} />}
        <MonitorIcon size={IS.lg} stroke={C.textMuted} />
        <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "500", flex: 1 }}>{window.name}</Text>
        <Text style={{ color: C.textDisabled, fontSize: FS.xs }}>{window.terminals.length}</Text>
      </TouchableOpacity>
      {expanded && window.terminals.map((terminal) => (
        <TerminalItem
          key={terminal.id}
          terminal={terminal}
          isActive={activeTerminal === terminal.id}
          onSelect={() => onTerminalSelect(terminal.id)}
        />
      ))}
    </View>
  );
}

function WorkspaceItem({ workspace, expanded, onToggle, activeWindow, activeTerminal, onWindowToggle, onTerminalSelect }: {
  workspace: Workspace;
  expanded: boolean;
  onToggle: () => void;
  activeWindow: number;
  activeTerminal: string | null;
  onWindowToggle: (idx: number) => void;
  onTerminalSelect: (id: string) => void;
}) {
  return (
    <View style={{ marginBottom: S.sm }}>
      <TouchableOpacity
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: S.sm,
          paddingVertical: S.md,
          paddingHorizontal: S.xl,
        }}
      >
        {expanded ? <ChevronDown size={IS.lg} stroke={C.primary} /> : <ChevronRight size={IS.lg} stroke={C.primary} />}
        <Text style={{ color: C.primary, fontSize: FS.base, fontWeight: "600", flex: 1 }}>{workspace.name}</Text>
        <Text style={{ color: C.textDisabled, fontSize: FS.xs }}>{workspace.windows.length}w</Text>
      </TouchableOpacity>
      {expanded && workspace.windows.map((window, idx) => (
        <WindowItem
          key={window.id}
          window={window}
          expanded={activeWindow === idx}
          onToggle={() => onWindowToggle(idx)}
          activeTerminal={activeTerminal}
          onTerminalSelect={onTerminalSelect}
        />
      ))}
    </View>
  );
}

export function Sidebar({ visible, onClose, onTerminalSelect }: SidebarProps) {
  const { workspaces, activeWorkspace, activeWindow, activeTerminal, setActiveWorkspace, setActiveWindow, setActiveTerminal } = useTerminalStore();
  const [expandedWorkspaces, setExpandedWorkspaces] = React.useState<Set<number>>(new Set([0]));
  const [expandedWindows, setExpandedWindows] = React.useState<Set<number>>(new Set([0]));

  const slideAnim = useRef(new Animated.Value(-280)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -280, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const toggleWorkspace = (idx: number) => {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleWindow = (idx: number) => {
    setExpandedWindows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleTerminalSelect = (id: string) => {
    setActiveTerminal(id);
    onTerminalSelect(id);
  };

  if (!visible) return null;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0, zIndex: 100, flexDirection: "row" }}>
      {/* Backdrop */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
      </Animated.View>

      {/* Sidebar panel */}
      <Animated.View style={{ width: 280, backgroundColor: C.surface, borderRightWidth: 1, borderRightColor: C.border, transform: [{ translateX: slideAnim }] }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
            <TerminalIcon size={IS.lg} stroke={C.text} />
            <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Terminal</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: S.sm }}>
            <X size={IS.lg} stroke={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Workspace tree */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: S.sm }}>
          {workspaces.map((workspace, idx) => (
            <WorkspaceItem
              key={workspace.id}
              workspace={workspace}
              expanded={expandedWorkspaces.has(idx)}
              onToggle={() => toggleWorkspace(idx)}
              activeWindow={activeWindow}
              activeTerminal={activeTerminal}
              onWindowToggle={toggleWindow}
              onTerminalSelect={handleTerminalSelect}
            />
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={{ padding: S.lg, borderTopWidth: 1, borderTopColor: C.border }}>
          <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.md, paddingHorizontal: S.lg, borderRadius: R.sm, backgroundColor: C.primaryBg }}>
            <Plus size={IS.lg} stroke={C.primary} />
            <Text style={{ color: C.primary, fontSize: FS.base }}>New Terminal</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}
