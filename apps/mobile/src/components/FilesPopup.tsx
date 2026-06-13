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
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react-native";
import { useLinkStore } from "@/stores/link-store";
import { C, S, R, FS, IS } from "@/theme/tokens";

interface FileEntry {
  name: string;
  path: string;
  is_dir?: boolean;
  isDir?: boolean;
}

interface FileNode extends FileEntry {
  children?: FileNode[];
  expanded?: boolean;
  loaded?: boolean;
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

function mapEntries(entries: FileEntry[]): FileNode[] {
  return entries.map((entry) => ({
    ...entry,
    expanded: false,
    loaded: false,
    children: undefined,
  }));
}

function updateNode(nodes: FileNode[], path: string, updater: (node: FileNode) => FileNode): FileNode[] {
  return nodes.map((node) => {
    if (node.path === path) return updater(node);
    if (!node.children) return node;
    return { ...node, children: updateNode(node.children, path, updater) };
  });
}

export function FilesPopup({ visible, onClose, cwd }: FilesPopupProps) {
  const rpc = useLinkStore((state) => state.rpc);
  const capabilities = useLinkStore((state) => state.capabilities);
  const [currentPath, setCurrentPath] = useState(cwd || capabilities.filesystem.root || ".");
  const [tree, setTree] = useState<FileNode[]>([]);
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
    const result = await rpc("fs.list", { path }, path);
    return Array.isArray(result) ? mapEntries(result as FileEntry[]) : [];
  };

  const loadRoot = async (path: string) => {
    setLoading(true);
    try {
      const nodes = await loadDir(path);
      setTree(nodes);
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

  const toggleExpand = async (node: FileNode) => {
    const isDir = Boolean(node.isDir ?? node.is_dir);
    if (!isDir) {
      await loadFile(node.path);
      return;
    }

    if (node.loaded) {
      setTree((prev) =>
        updateNode(prev, node.path, (current) => ({ ...current, expanded: !current.expanded })),
      );
      return;
    }

    setTree((prev) =>
      updateNode(prev, node.path, (current) => ({ ...current, expanded: true })),
    );
    const children = await loadDir(node.path);
    setTree((prev) =>
      updateNode(prev, node.path, (current) => ({
        ...current,
        children,
        expanded: true,
        loaded: true,
      })),
    );
  };

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    loadRoot(effectiveRoot).catch(() => {});
  }, [effectiveRoot, visible]);

  const goUp = () => {
    if (currentPath === effectiveRoot) return;
    const parent = parentPath(currentPath, effectiveRoot);
    loadRoot(parent).catch(() => {});
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    const path = joinPath(currentPath, createName.trim());
    await rpc("fs.create", { path, isDir: createMode === "folder" }, currentPath);
    setCreateName("");
    await loadRoot(currentPath);
  };

  const handleDelete = async (path: string) => {
    await rpc("fs.delete", { path }, currentPath);
    if (selectedFile === path) {
      setSelectedFile(null);
      setContent("");
    }
    await loadRoot(currentPath);
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    await rpc("fs.write", { path: selectedFile, content }, currentPath);
  };

  const renderNode = (node: FileNode, depth: number) => {
    const isDir = Boolean(node.isDir ?? node.is_dir);

    return (
      <View key={node.path}>
        <TouchableOpacity
          onPress={() => { void toggleExpand(node); }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: S.sm,
            paddingVertical: S.sm,
            paddingHorizontal: S.lg,
            paddingLeft: S.lg + depth * 18,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            backgroundColor: selectedFile === node.path ? C.primaryBg : "transparent",
          }}
        >
          {isDir ? (
            node.expanded ? <ChevronDown size={IS.sm} stroke={C.textMuted} /> : <ChevronRight size={IS.sm} stroke={C.textMuted} />
          ) : (
            <View style={{ width: IS.sm, height: IS.sm }} />
          )}
          {isDir ? (
            <Folder size={IS.lg} stroke={node.expanded ? C.primary : C.accent} />
          ) : (
            <FileText size={IS.lg} stroke={C.textMuted} />
          )}
          <Text style={{ color: C.text, fontSize: FS.sm, flex: 1 }} numberOfLines={1}>
            {node.name}
          </Text>
          <TouchableOpacity onPress={() => { void handleDelete(node.path); }}>
            <Trash2 size={IS.md} stroke={C.danger} />
          </TouchableOpacity>
        </TouchableOpacity>
        {isDir && node.expanded && node.children?.map((child) => renderNode(child, depth + 1))}
      </View>
    );
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
            <TouchableOpacity onPress={() => { void loadRoot(currentPath); }} style={{ padding: S.sm }}>
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
            <TouchableOpacity onPress={() => { void handleCreate(); }} style={{ justifyContent: "center", paddingHorizontal: S.lg, borderRadius: R.sm, backgroundColor: C.primaryBg }}>
              <Plus size={IS.lg} stroke={C.primary} />
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator color={C.primary} style={{ paddingVertical: S.sm }} />}

          <ScrollView style={{ maxHeight: 320, borderTopWidth: 1, borderTopColor: C.border }}>
            {tree.map((node) => renderNode(node, 0))}
            {tree.length === 0 && !loading && (
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
                <TouchableOpacity onPress={() => { void handleSave(); }} style={{ flexDirection: "row", alignItems: "center", gap: S.xs, paddingHorizontal: S.md, paddingVertical: S.xs, borderRadius: R.sm, backgroundColor: C.primaryBg }}>
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
