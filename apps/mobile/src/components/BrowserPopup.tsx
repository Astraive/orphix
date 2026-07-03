import React, { useRef, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Animated } from "react-native";
import { Globe, Plus, RefreshCw, X } from "lucide-react-native";
import { useLinkStore } from "@/stores/link-store";
import { C, S, R, FS, IS } from "@/theme/tokens";

interface BrowserPopupProps {
  visible: boolean;
  onClose: () => void;
}

export function BrowserPopup({ visible, onClose }: BrowserPopupProps) {
  const rpc = useLinkStore((state) => state.rpc);
  const browserSessions = useLinkStore((state) => state.browserSessions);
  const workspaces = useLinkStore((state) => state.workspaces);
  const [draftUrl, setDraftUrl] = useState("https://example.com");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const slideAnim = useRef(new Animated.Value(420)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (!selectedSessionId && browserSessions[0]) {
      setSelectedSessionId(browserSessions[0].id);
    }
  }, [browserSessions, selectedSessionId]);

  const selectedWorkspace = workspaces[0] ?? null;
  const selectedWindow = selectedWorkspace?.windows[0] ?? null;
  const selectedSession = browserSessions.find((session) => session.id === selectedSessionId) ?? browserSessions[0] ?? null;

  const handleCreateSession = async () => {
    if (!draftUrl.trim()) return;
    await rpc("browser.session.create", { url: draftUrl.trim() });
  };

  const handleOpenTab = async () => {
    if (!selectedSession || !draftUrl.trim()) return;
    await rpc("browser.tab.open", { sessionId: selectedSession.id, url: draftUrl.trim() });
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={{ flex: 1, opacity: opacityAnim }}>
          <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
        </Animated.View>
        <Animated.View style={{ backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, maxHeight: "88%", borderTopWidth: 1, borderTopColor: C.border, transform: [{ translateY: slideAnim }] }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
              <Globe size={IS.lg} stroke={C.primary} />
              <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Browser</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={IS.lg} stroke={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md }}>
            <TextInput
              value={draftUrl}
              onChangeText={setDraftUrl}
              placeholder="https://example.com"
              placeholderTextColor={C.textDisabled}
              style={{ flex: 1, backgroundColor: C.surfaceMuted, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, color: C.text, borderWidth: 1, borderColor: C.border }}
            />
            <TouchableOpacity onPress={handleCreateSession} style={{ justifyContent: "center", paddingHorizontal: S.lg, borderRadius: R.sm, backgroundColor: C.primaryBg }}>
              <Plus size={IS.lg} stroke={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenTab} style={{ justifyContent: "center", paddingHorizontal: S.lg, borderRadius: R.sm, borderWidth: 1, borderColor: C.border }}>
              <Globe size={IS.lg} stroke={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 460 }}>
            {browserSessions.map((session) => (
              <View key={session.id} style={{ marginHorizontal: S.lg, marginBottom: S.md, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceMuted, overflow: "hidden" }}>
                <TouchableOpacity onPress={() => setSelectedSessionId(session.id)} style={{ paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border }}>
                  <Text style={{ color: selectedSession?.id === session.id ? C.primary : C.text, fontSize: FS.base, fontWeight: "600" }}>{session.name}</Text>
                  <Text style={{ color: C.textDisabled, fontSize: FS.xs }}>{session.tabs.length} tabs</Text>
                </TouchableOpacity>

                {session.tabs.map((tab) => (
                  <View key={tab.id} style={{ paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <Text style={{ color: C.text, fontSize: FS.sm, fontWeight: "500" }} numberOfLines={1}>{tab.title}</Text>
                    <Text style={{ color: C.textDisabled, fontSize: FS.xs }} numberOfLines={1}>{tab.url}</Text>
                    <View style={{ flexDirection: "row", gap: S.sm, marginTop: S.sm }}>
                      <TouchableOpacity
                        onPress={() => rpc("browser.snapshot", { sessionId: session.id, tabId: tab.id })}
                        style={{ flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.md, paddingVertical: S.xs, borderRadius: R.sm, borderWidth: 1, borderColor: C.border }}
                      >
                        <RefreshCw size={IS.sm} stroke={C.textMuted} />
                        <Text style={{ color: C.textMuted, fontSize: FS.xs }}>Snapshot</Text>
                      </TouchableOpacity>
                      {tab.attachment?.workspaceId ? (
                        <TouchableOpacity
                          onPress={() => rpc("browser.detach", { sessionId: session.id, tabId: tab.id })}
                          style={{ flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.md, paddingVertical: S.xs, borderRadius: R.sm, borderWidth: 1, borderColor: C.border }}
                        >
                          <X size={IS.sm} stroke={C.textMuted} />
                          <Text style={{ color: C.textMuted, fontSize: FS.xs }}>Detach</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() =>
                            rpc("browser.attach", {
                              sessionId: session.id,
                              tabId: tab.id,
                              workspaceId: selectedWorkspace?.id,
                              windowId: selectedWindow?.id,
                              paneId: `browser:${tab.id}`,
                            })
                          }
                          style={{ flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.md, paddingVertical: S.xs, borderRadius: R.sm, borderWidth: 1, borderColor: C.border }}
                        >
                          <Plus size={IS.sm} stroke={C.textMuted} />
                          <Text style={{ color: C.textMuted, fontSize: FS.xs }}>Attach</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {tab.snapshotDataUrl ? (
                      <View style={{ marginTop: S.sm, borderRadius: R.sm, overflow: "hidden", borderWidth: 1, borderColor: C.border }}>
                        {/* React Native Image could be used, but a compact URL preview keeps the linked state lightweight. */}
                        <Text style={{ color: C.textDisabled, fontSize: FS.xs, padding: S.sm }} numberOfLines={2}>
                          Snapshot captured and synced
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
            {browserSessions.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: S.xxl }}>
                <Text style={{ color: C.textMuted, fontSize: FS.sm }}>No shared browser sessions</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
