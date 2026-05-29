import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { MarkdownWebView } from "@/components/MarkdownWebView";
import { ArrowLeft, Eye, Code } from "lucide-react-native";

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/notes/${id}`)
      .then((res) => res.json())
      .then((note) => {
        setTitle(note.title);
        setContent(note.content);
      })
      .catch(() => router.back());
  }, [id]);

  const save = async () => {
    if (!id) return;
    await apiFetch(`/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#050D10" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#123238", backgroundColor: "#071418" }}>
        <TouchableOpacity onPress={() => { save(); router.back(); }}>
          <ArrowLeft size={18} stroke="#EEEEEE" />
        </TouchableOpacity>
        <Text style={{ color: "#EEEEEE", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>{title || "Untitled"}</Text>
        <TouchableOpacity onPress={() => setShowPreview(!showPreview)}>
          {showPreview ? <Code size={18} stroke="#8FA3A8" /> : <Eye size={18} stroke="#32E0C4" />}
        </TouchableOpacity>
      </View>

      {/* Title */}
      <TextInput
        value={title}
        onChangeText={setTitle}
        onBlur={save}
        placeholder="Note title..."
        placeholderTextColor="#3D555A"
        style={{ color: "#EEEEEE", fontSize: 16, fontWeight: "600", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#123238" }}
      />

      {/* Content */}
      {showPreview ? (
        <MarkdownWebView visible onClose={() => setShowPreview(false)} title={title} content={content} />
      ) : (
        <TextInput
          value={content}
          onChangeText={setContent}
          onBlur={save}
          placeholder="Write markdown here..."
          placeholderTextColor="#3D555A"
          multiline
          style={{ flex: 1, color: "#EEEEEE", fontSize: 14, fontFamily: "monospace", lineHeight: 22, paddingHorizontal: 16, paddingTop: 12, textAlignVertical: "top" }}
        />
      )}
    </View>
  );
}
