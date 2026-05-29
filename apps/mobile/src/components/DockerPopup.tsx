import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Animated } from "react-native";
import { Container, Play, Square, RotateCw, Trash2, X, ChevronDown, ChevronRight, FileText } from "lucide-react-native";
import { useDockerStore, type DockerContainer } from "@/stores/docker-store";
import { C, S, R, FS, IS } from "@/theme/tokens";

interface DockerPopupProps {
  visible: boolean;
  onClose: () => void;
  onAction: (method: string, params?: any) => Promise<any>;
}

function ContainerCard({ container, onAction }: { container: DockerContainer; onAction: (method: string, params?: any) => Promise<any> }) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = container.state === "running";
  const stateColor = isRunning ? C.primary : container.state === "exited" ? C.danger : C.accent;
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(expandAnim, { toValue: expanded ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [expanded]);

  return (
    <View style={{ marginHorizontal: S.lg, marginBottom: S.md, borderRadius: R.lg, backgroundColor: C.surfaceMuted, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: stateColor }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "500" }} numberOfLines={1}>{container.name}</Text>
          <Text style={{ color: C.textDisabled, fontSize: FS.sm }} numberOfLines={1}>{container.image}</Text>
        </View>
        <Text style={{ color: stateColor, fontSize: FS.xs }}>{container.state}</Text>
        {expanded ? <ChevronDown size={IS.lg} stroke={C.textMuted} /> : <ChevronRight size={IS.lg} stroke={C.textMuted} />}
      </TouchableOpacity>

      {expanded && (
        <Animated.View style={{ borderTopWidth: 1, borderTopColor: C.border, padding: S.lg, opacity: expandAnim }}>
          {container.ports ? (
            <Text style={{ color: C.textMuted, fontSize: FS.sm, marginBottom: S.sm }}>Ports: {container.ports}</Text>
          ) : null}
          <Text style={{ color: C.textMuted, fontSize: FS.sm, marginBottom: S.sm }}>{container.status}</Text>

          <View style={{ flexDirection: "row", gap: S.sm }}>
            {isRunning ? (
              <>
                <ActionButton label="Stop" icon={Square} stroke={C.danger} onPress={() => onAction("docker.stop", { id: container.id })} />
                <ActionButton label="Restart" icon={RotateCw} stroke={C.accent} onPress={() => onAction("docker.restart", { id: container.id })} />
                <ActionButton label="Logs" icon={FileText} stroke={C.textMuted} onPress={() => onAction("docker.logs", { id: container.id, tail: 50 })} />
              </>
            ) : (
              <>
                <ActionButton label="Start" icon={Play} stroke={C.primary} onPress={() => onAction("docker.start", { id: container.id })} />
                <ActionButton label="Remove" icon={Trash2} stroke={C.danger} onPress={() => onAction("docker.remove", { id: container.id, force: true })} />
              </>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function ActionButton({ label, icon: Icon, stroke, onPress }: { label: string; icon: React.ComponentType<{ size: number; stroke: string }>; stroke: string; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.93, useNativeDriver: true, tension: 100, friction: 5 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 5 }).start()}
        style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.md, paddingHorizontal: S.lg, borderRadius: R.sm, backgroundColor: `${stroke}15`, borderWidth: 1, borderColor: `${stroke}30` }}
      >
        <Icon size={IS.sm} stroke={stroke} />
        <Text style={{ color: stroke, fontSize: FS.sm }}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function DockerPopup({ visible, onClose, onAction }: DockerPopupProps) {
  const { containers, images, loading } = useDockerStore();
  const [tab, setTab] = useState<"containers" | "images">("containers");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const doAction = async (method: string, params?: any) => {
    setActionLoading(method + JSON.stringify(params));
    try {
      await onAction(method, params);
    } finally {
      setActionLoading(null);
    }
  };

  const running = containers.filter((c) => c.state === "running");
  const stopped = containers.filter((c) => c.state !== "running");

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={{ flex: 1, opacity: opacityAnim }}>
          <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
        </Animated.View>
        <Animated.View style={{ backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, maxHeight: "80%", borderTopWidth: 1, borderTopColor: C.border, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
              <Container size={IS.lg} stroke={C.primary} />
              <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Docker</Text>
            </View>
            <TouchableOpacity onPress={onClose}><X size={IS.lg} stroke={C.textMuted} /></TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border }}>
            {(["containers", "images"] as const).map((t) => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: S.md, alignItems: "center", borderBottomWidth: 2, borderBottomColor: tab === t ? C.primary : "transparent" }}>
                <Text style={{ color: tab === t ? C.primary : C.textMuted, fontSize: FS.base, fontWeight: tab === t ? "600" : "400" }}>
                  {t === "containers" ? `Containers (${containers.length})` : `Images (${images.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            {loading && <ActivityIndicator color={C.primary} style={{ padding: 24 }} />}

            {tab === "containers" && !loading && (
              <>
                {running.length > 0 && (
                  <View style={{ paddingTop: 8 }}>
                    <Text style={{ color: C.primary, fontSize: FS.sm, fontWeight: "600", paddingHorizontal: S.xl, paddingBottom: S.sm }}>RUNNING ({running.length})</Text>
                    {running.map((c) => <ContainerCard key={c.id} container={c} onAction={doAction} />)}
                  </View>
                )}
                {stopped.length > 0 && (
                  <View style={{ paddingTop: 8 }}>
                    <Text style={{ color: C.danger, fontSize: FS.sm, fontWeight: "600", paddingHorizontal: S.xl, paddingBottom: S.sm }}>STOPPED ({stopped.length})</Text>
                    {stopped.map((c) => <ContainerCard key={c.id} container={c} onAction={doAction} />)}
                  </View>
                )}
                {containers.length === 0 && (
                  <View style={{ alignItems: "center", paddingVertical: S.xxl }}>
                    <Container size={IS.xxl} stroke={C.textDisabled} />
                    <Text style={{ color: C.textMuted, fontSize: FS.base, marginTop: S.sm }}>No containers</Text>
                  </View>
                )}
              </>
            )}

            {tab === "images" && !loading && (
              <>
                {images.map((img) => (
                  <View key={img.id} style={{ flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm, paddingHorizontal: S.xl }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: FS.sm }}>{img.repository}:{img.tag}</Text>
                      <Text style={{ color: C.textDisabled, fontSize: FS.xs }}>{img.size}</Text>
                    </View>
                    <TouchableOpacity onPress={() => doAction("docker.image_remove", { id: img.id })}>
                      <Trash2 size={IS.lg} stroke={C.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length === 0 && (
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <Text style={{ color: C.textMuted, fontSize: 14 }}>No images</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
