import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator } from "react-native";
import { GitBranch, GitCommit, GitPullRequest, RefreshCw, Check, X, ChevronDown, ChevronRight, Trash2 } from "lucide-react-native";
import { useGitStore, type GitFile } from "@/stores/git-store";
import { C, S, R, FS, IS } from "@/theme/tokens";

interface GitPopupProps {
  visible: boolean;
  onClose: () => void;
  onAction: (method: string, params?: any) => Promise<any>;
}

function FileItem({ file, onAction }: { file: GitFile; onAction: (method: string, params?: any) => Promise<any> }) {
  const statusColor = file.staged ? C.primary : C.accent;
  const statusLabel = file.staged ? "S" : "M";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.sm, paddingHorizontal: S.xl }}>
      <Text style={{ color: statusColor, fontSize: FS.sm, fontWeight: "600", width: S.xl }}>{statusLabel}</Text>
      <Text style={{ color: C.text, fontSize: FS.sm, flex: 1 }} numberOfLines={1}>{file.path}</Text>
      <TouchableOpacity onPress={() => onAction(file.staged ? "git.unstage" : "git.stage", { files: [file.path] })}>
        <Text style={{ color: C.primary, fontSize: FS.sm }}>{file.staged ? "Unstage" : "Stage"}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function GitPopup({ visible, onClose, onAction }: GitPopupProps) {
  const { status, branches, stashes, loading } = useGitStore();
  const [commitMsg, setCommitMsg] = useState("");
  const [showBranches, setShowBranches] = useState(false);
  const [showStashes, setShowStashes] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const doAction = async (method: string, params?: any) => {
    setActionLoading(method);
    try {
      await onAction(method, params);
    } finally {
      setActionLoading(null);
    }
  };

  const stagedFiles = status?.files.filter((f) => f.staged) ?? [];
  const unstagedFiles = status?.files.filter((f) => !f.staged) ?? [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, maxHeight: "80%", borderTopWidth: 1, borderTopColor: C.border }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
              <GitBranch size={IS.lg} stroke={C.primary} />
              <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Git</Text>
              {status && <Text style={{ color: C.textMuted, fontSize: FS.sm }}>{status.branch}</Text>}
            </View>
            <TouchableOpacity onPress={onClose}><X size={IS.lg} stroke={C.textMuted} /></TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            {/* Quick actions */}
            <View style={{ flexDirection: "row", gap: S.sm, padding: S.lg }}>
              {[
                { label: "Fetch", icon: RefreshCw, method: "git.fetch" },
                { label: "Pull", icon: GitPullRequest, method: "git.pull" },
                { label: "Push", icon: GitCommit, method: "git.push" },
                { label: "Sync", icon: RefreshCw, method: "git.sync" },
              ].map(({ label, icon: Icon, method }) => (
                <TouchableOpacity
                  key={method}
                  onPress={() => doAction(method)}
                  disabled={actionLoading === method}
                  style={{ flex: 1, alignItems: "center", gap: S.sm, paddingVertical: S.lg, borderRadius: R.sm, backgroundColor: C.surfaceMuted, borderWidth: 1, borderColor: C.border }}
                >
                  {actionLoading === method ? <ActivityIndicator size="small" color={C.primary} /> : <Icon size={IS.lg} stroke={C.textMuted} />}
                  <Text style={{ color: C.textMuted, fontSize: FS.sm }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Commit */}
            {stagedFiles.length > 0 && (
              <View style={{ paddingHorizontal: S.lg, paddingBottom: S.lg }}>
                <View style={{ flexDirection: "row", gap: S.sm }}>
                  <TextInput
                    value={commitMsg}
                    onChangeText={setCommitMsg}
                    placeholder="Commit message..."
                    placeholderTextColor={C.textDisabled}
                    style={{ flex: 1, backgroundColor: C.surfaceMuted, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, color: C.text, fontSize: FS.base, borderWidth: 1, borderColor: C.border }}
                  />
                  <TouchableOpacity
                    onPress={() => { doAction("git.commit", { message: commitMsg }); setCommitMsg(""); }}
                    disabled={!commitMsg.trim()}
                    style={{ backgroundColor: C.primary, borderRadius: R.sm, paddingHorizontal: S.xl, justifyContent: "center", opacity: commitMsg.trim() ? 1 : 0.5 }}
                  >
                    <Check size={IS.lg} stroke={C.bg} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Staged files */}
            {stagedFiles.length > 0 && (
              <View style={{ marginBottom: S.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingVertical: S.sm }}>
                  <Text style={{ color: C.primary, fontSize: FS.sm, fontWeight: "600" }}>STAGED ({stagedFiles.length})</Text>
                  <TouchableOpacity onPress={() => doAction("git.unstage_all")}><Text style={{ color: C.textMuted, fontSize: FS.sm }}>Unstage All</Text></TouchableOpacity>
                </View>
                {stagedFiles.map((f) => <FileItem key={f.path} file={f} onAction={doAction} />)}
              </View>
            )}

            {/* Unstaged files */}
            {unstagedFiles.length > 0 && (
              <View style={{ marginBottom: S.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingVertical: S.sm }}>
                  <Text style={{ color: C.accent, fontSize: FS.sm, fontWeight: "600" }}>CHANGES ({unstagedFiles.length})</Text>
                  <TouchableOpacity onPress={() => doAction("git.stage_all")}><Text style={{ color: C.textMuted, fontSize: FS.sm }}>Stage All</Text></TouchableOpacity>
                </View>
                {unstagedFiles.map((f) => <FileItem key={f.path} file={f} onAction={doAction} />)}
              </View>
            )}

            {/* Branches */}
            <TouchableOpacity onPress={() => setShowBranches(!showBranches)} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.xl, paddingVertical: S.md }}>
              {showBranches ? <ChevronDown size={IS.lg} stroke={C.textMuted} /> : <ChevronRight size={IS.lg} stroke={C.textMuted} />}
              <GitBranch size={IS.lg} stroke={C.textMuted} />
              <Text style={{ color: C.text, fontSize: FS.base }}>Branches ({branches.length})</Text>
            </TouchableOpacity>
            {showBranches && branches.map((b) => (
              <TouchableOpacity key={b.name} onPress={() => doAction("git.checkout", { branch: b.name })} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.sm, paddingHorizontal: S.xl, paddingLeft: 48 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.is_current ? C.primary : C.textDisabled }} />
                <Text style={{ color: b.is_current ? C.primary : C.textMuted, fontSize: FS.sm, flex: 1 }}>{b.name}</Text>
                {b.is_remote && <Text style={{ color: C.textDisabled, fontSize: FS.xs }}>remote</Text>}
              </TouchableOpacity>
            ))}

            {/* Stashes */}
            <TouchableOpacity onPress={() => setShowStashes(!showStashes)} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.xl, paddingVertical: S.md }}>
              {showStashes ? <ChevronDown size={IS.lg} stroke={C.textMuted} /> : <ChevronRight size={IS.lg} stroke={C.textMuted} />}
              <Trash2 size={IS.lg} stroke={C.textMuted} />
              <Text style={{ color: C.text, fontSize: FS.base }}>Stashes ({stashes.length})</Text>
            </TouchableOpacity>
            {showStashes && stashes.map((s) => (
              <View key={s.index} style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.sm, paddingHorizontal: S.xl, paddingLeft: 48 }}>
                <Text style={{ color: C.textMuted, fontSize: FS.sm, flex: 1 }}>{s.message || s.name}</Text>
                <TouchableOpacity onPress={() => doAction("git.stash_pop")}><Text style={{ color: C.primary, fontSize: FS.sm }}>Pop</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => doAction("git.stash_drop", { stash: s.name })}><Text style={{ color: C.danger, fontSize: FS.sm }}>Drop</Text></TouchableOpacity>
              </View>
            ))}

            {/* Empty state */}
            {status && status.files.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: S.xxl }}>
                <Check size={IS.xxl} stroke={C.primary} />
                <Text style={{ color: C.textMuted, fontSize: FS.base, marginTop: S.sm }}>Working tree clean</Text>
              </View>
            )}

            {loading && (
              <View style={{ alignItems: "center", paddingVertical: S.xxl }}>
                <ActivityIndicator color={C.primary} />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
