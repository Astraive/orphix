import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, Animated } from "react-native";
import { Terminal, Plus, Trash2, X, Maximize2, Minimize2 } from "lucide-react-native";
import { C, S, R, FS, IS } from "@/theme/tokens";

interface TerminalMenuPopupProps {
  visible: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  terminalId: string | null;
}

function MenuButton({ label, icon: Icon, color, onPress }: {
  label: string; icon: any; color: string; onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 100, friction: 5 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 5 }).start()}
        style={{ flexDirection: "row", alignItems: "center", gap: S.lg, paddingVertical: S.lg, paddingHorizontal: S.xl }}
      >
        <Icon size={IS.lg} stroke={color} />
        <Text style={{ color, fontSize: FS.base }}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function TerminalMenuPopup({ visible, onClose, onAction, terminalId }: TerminalMenuPopupProps) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const items = [
    { label: "New Terminal", icon: Plus, action: "new", color: C.primary },
    { label: "Split Horizontal", icon: Maximize2, action: "split_h", color: C.textMuted },
    { label: "Split Vertical", icon: Minimize2, action: "split_v", color: C.textMuted },
    { label: "---" },
    { label: "Kill Terminal", icon: Trash2, action: "kill", color: C.danger },
    { label: "Kill All Terminals", icon: X, action: "kill_all", color: C.danger },
    { label: "---" },
    { label: "Zoom In", icon: Maximize2, action: "zoom_in", color: C.textMuted },
    { label: "Zoom Out", icon: Minimize2, action: "zoom_out", color: C.textMuted },
  ];

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={{ flex: 1, opacity: opacityAnim }}>
          <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
        </Animated.View>
        <Animated.View style={{ backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: S.xxl, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
              <Terminal size={IS.lg} stroke={C.primary} />
              <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Terminal</Text>
            </View>
            <TouchableOpacity onPress={onClose}><X size={IS.lg} stroke={C.textMuted} /></TouchableOpacity>
          </View>

          {/* Items */}
          <View style={{ paddingVertical: S.sm }}>
            {items.map((item, idx) => {
              if (item.label === "---") {
                return <View key={idx} style={{ height: 1, backgroundColor: C.border, marginVertical: S.sm }} />;
              }
              return (
                <MenuButton
                  key={item.action}
                  label={item.label}
                  icon={item.icon!}
                  color={item.color!}
                  onPress={() => { onAction(item.action!); onClose(); }}
                />
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
