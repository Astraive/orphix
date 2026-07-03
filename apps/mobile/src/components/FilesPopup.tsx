import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
} from "react-native";
import { ArrowLeft, Check, FileText, Folder, Plus, RefreshCw, Trash2, X } from "lucide-react-native";
import { useLinkStore } from "@/stores/link-store";
import { C, S, R, FS, IS } from "@/theme/tokens";

interface FileEntry {
  name: string;
  path: string;
  is_dir?: boolean;
  isDir?: boolean;
}

interface FilesPopupProps {
  visible: boolean;
  onClose: () => void;
  cwd?: string | null;
}

function pathSeparator(path: string): string {
  return path.includes("\\") ? "\\" : "/";
}

function joinPath(parent: string, child: string): string {
  const separator = pathSeparator(parent);
  return `${parent.replace(/[\\/]+$/, "")}${separator}${child}`;
}

function parentPath(path: string, fallback: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  const cut = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (cut < 0) return fallback;
  const parent = normalized.slice(0, cut);
  if (/^[A-Za-z]:$/.test(parent)) {
    return `${parent}\\`;
  }
  return parent || fallback;
}

export function FilesPopup({ visible, onClose, cwd }: FilesPopupProps) {
  const rpc = useLinkStore((state) => state.rpc);
  const capabilities = useLinkStore((state) => state.capabilities);
  const [currentPath, setCurrentPath] = useState(cwd || capabilities.filesystem.root || ".");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [createName, setCreateName] = useState("");
  const [createMode, setCreateMode] = useState<"file" | "folder">("file");

  const slideAnim = useRef(new Animated.Value(420)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const effectiveRoot = useMemo(
    () => cwd || capabilities.filesystem.focusedPath || capabilities.filesystem.root || ".",
    [capabilities.filesystem.focusedPath, capabilities.filesystem.root, cwd],
  );

  const loadDir = async (path: string) => {
    setLoading(true);
    try {
      const result = await rpc("fs.list", { path }, path);
      setEntries(Array.isArray(result) ? result : []);
      setCurrentPath(path);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (path: string) => {
    setLoading(true);
    try {
      const result = await rpc("fs.read", { path }, currentPath);
      setSelectedFile(path);
      setContent(typeof result?.content === "string" ? result.content : "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    loadDir(effectiveRoot).catch(() => {});
  }, [effectiveRoot, visible]);

  const goUp = () => {
    if (currentPath === effectiveRoot) return;
    const parent = parentPath(currentPath, effectiveRoot);
    loadDir(parent).catch(() => {});
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    const path = joinPath(currentPath, createName.trim());
    await rpc("fs.create", { path, isDir: createMode === "folder" }, currentPath);
    setCreateName("");
    await loadDir(currentPath);
  };

  const handleDelete = async (path: string) => {
    await rpc("fs.delete", { path }, currentPath);
    if (selectedFile === path) {
      setSelectedFile(null);
      setContent("");
    }
    await loadDir(currentPath);
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    await rpc("fs.write", { path: selectedFile, content }, currentPath);
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={{ flex: 1, opacity: opacityAnim }}>
          <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
        </Animated.View>
        <Animated.View
          style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: R.lg,
            borderTopRightRadius: R.lg,
            maxHeight: "88%",
            borderTopWidth: 1,
            borderTopColor: C.border,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
              <Folder size={IS.lg} stroke={C.primary} />
              <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Files</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={IS.lg} stroke={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <TouchableOpacity onPress={goUp} style={{ padding: S.sm }}>
              <ArrowLeft size={IS.lg} stroke={C.textMuted} />
            </TouchableOpacity>
            <Text style={{ color: C.textMuted, fontSize: FS.sm, flex: 1 }} numberOfLines={1}>{currentPath}</Text>
            <TouchableOpacity onPress={() => loadDir(currentPath)} style={{ padding: S.sm }}>
              <RefreshCw size={IS.lg} stroke={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md }}>
            <TextInput
              value={createName}
              onChangeText={setCreateName}
              placeholder={createMode === "folder" ? "new-folder" : "new-file.txt"}
              placeholderTextColor={C.textDisabled}
              style={{ flex: 1, backgroundColor: C.surfaceMuted, borderRadius: R.sm, paddingHorizontal: S.lg, paddingVertical: S.md, color: C.text, borderWidth: 1, borderColor: C.border }}
            />
            <TouchableOpacity onPress={() => setCreateMode(createMode === "file" ? "folder" : "file")} style={{ justifyContent: "center", paddingHorizontal: S.lg, borderRadius: R.sm, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.textMuted, fontSize: FS.sm }}>{createMode === "file" ? "File" : "Folder"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} style={{ justifyContent: "center", paddingHorizontal: S.lg, borderRadius: R.sm, backgroundColor: C.primaryBg }}>
              <Plus size={IS.lg} stroke={C.primary} />
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator color={C.primary} style={{ paddingVertical: S.sm }} />}

          <ScrollView style={{ maxHeight: 260, borderTopWidth: 1, borderTopColor: C.border }}>
            {entries.map((entry) => {
              const isDir = Boolean(entry.isDir ?? entry.is_dir);
              return (
                <TouchableOpacity
                  key={entry.path}
                  onPress={() => (isDir ? loadDir(entry.path) : loadFile(entry.path))}
                  style={{ flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.xl, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border }}
                >
                  {isDir ? <Folder size={IS.lg} stroke={C.accent} /> : <FileText size={IS.lg} stroke={C.textMuted} />}
                  <Text style={{ color: C.text, fontSize: FS.sm, flex: 1 }} numberOfLines={1}>{entry.name}</Text>
                  <TouchableOpacity onPress={() => handleDelete(entry.path)}>
                    <Trash2 size={IS.md} stroke={C.danger} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
            {entries.length === 0 && !loading && (
              <View style={{ alignItems: "center", paddingVertical: S.xxl }}>
                <Text style={{ color: C.textMuted, fontSize: FS.sm }}>Empty directory</Text>
              </View>
            )}
          </ScrollView>

          <View style={{ borderTopWidth: 1, borderTopColor: C.border, padding: S.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.sm }}>
              <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "500" }} numberOfLines={1}>
                {selectedFile ? selectedFile.split(/[\\/]/).pop() : "Preview"}
              </Text>
              {selectedFile && (
                <TouchableOpacity onPress={handleSave} style={{ flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.md, paddingVertical: S.xs, borderRadius: R.sm, backgroundColor: C.primaryBg }}>
                  <Check size={IS.sm} stroke={C.primary} />
                  <Text style={{ color: C.primary, fontSize: FS.sm }}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              value={content}
              onChangeText={setContent}
              editable={Boolean(selectedFile)}
              multiline
              numberOfLines={8}
              placeholder={selectedFile ? "Edit file..." : "Select a file to preview"}
              placeholderTextColor={C.textDisabled}
              style={{ minHeight: 160, textAlignVertical: "top", backgroundColor: C.surfaceMuted, borderRadius: R.sm, padding: S.lg, color: C.text, borderWidth: 1, borderColor: C.border }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
