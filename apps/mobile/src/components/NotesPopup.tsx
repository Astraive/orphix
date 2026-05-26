import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator } from "react-native";
import { useNotesStore, type Note } from "@/stores/notes-store";
import { X, Plus, FileText, Globe, Folder, Trash2 } from "lucide-react-native";
import { C, S, R, FS, IS } from "@/theme/tokens";

interface NotesPopupProps {
  visible: boolean;
  onClose: () => void;
}

function NoteCard({ note, onOpen, onDelete }: { note: Note; onOpen: () => void; onDelete: () => void }) {
  return (
    <TouchableOpacity onPress={onOpen} style={{ backgroundColor: C.surfaceMuted, borderRadius: R.md, padding: S.lg, marginBottom: S.md, borderWidth: 1, borderColor: C.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          <FileText size={IS.sm} stroke={C.primary} />
          <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "500" }}>{note.title || "Untitled"}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          {note.workspaceId ? (
            <Folder size={IS.xs} stroke={C.textMuted} />
          ) : (
            <Globe size={IS.xs} stroke={C.primary} />
          )}
          <TouchableOpacity onPress={onDelete}>
            <Trash2 size={IS.sm} stroke={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={{ color: C.textMuted, fontSize: FS.xs }} numberOfLines={2}>
        {note.content || "Empty note"}
      </Text>
      <Text style={{ color: C.textDisabled, fontSize: FS.xs, marginTop: S.sm }}>
        {new Date(note.updatedAt).toLocaleDateString()} · {note.syncEnabled ? "Synced" : "Local"}
      </Text>
    </TouchableOpacity>
  );
}

function NoteEditor({ note, onClose, onSave }: { note: Note; onClose: () => void; onSave: (title: string, content: string) => void }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: S.lg, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface }}>
        <TouchableOpacity onPress={() => { onSave(title, content); onClose(); }}>
          <Text style={{ color: C.primary, fontSize: FS.base }}>Done</Text>
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: FS.base, fontWeight: "600" }}>Edit Note</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={IS.lg} stroke={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Title input */}
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Note title..."
        placeholderTextColor={C.textDisabled}
        style={{ color: C.text, fontSize: FS.lg, fontWeight: "600", paddingHorizontal: S.xl, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border }}
      />

      {/* Content editor */}
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Write markdown here..."
        placeholderTextColor={C.textDisabled}
        multiline
        style={{ flex: 1, color: C.text, fontSize: FS.base, fontFamily: "monospace", lineHeight: 24, paddingHorizontal: S.xl, paddingTop: S.lg, textAlignVertical: "top" }}
      />
    </View>
  );
}

export function NotesPopup({ visible, onClose }: NotesPopupProps) {
  const { notes, loading, loadNotes, createNote, updateNote, deleteNote } = useNotesStore();
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (visible) loadNotes();
  }, [visible]);

  const handleCreate = async () => {
    const note = await createNote();
    if (note) setEditingNote(note);
  };

  if (editingNote) {
    return (
      <Modal visible animationType="slide">
        <NoteEditor
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSave={(title, content) => updateNote(editingNote.id, { title, content })}
        />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, maxHeight: "80%", borderTopWidth: 1, borderTopColor: C.border }}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.lg, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
              <FileText size={IS.lg} stroke={C.primary} />
              <Text style={{ color: C.text, fontSize: FS.lg, fontWeight: "600" }}>Notes</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.lg }}>
              <TouchableOpacity onPress={handleCreate}>
                <Plus size={IS.lg} stroke={C.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <X size={IS.lg} stroke={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Note list */}
          <ScrollView style={{ maxHeight: 400, padding: S.lg }}>
            {loading && <ActivityIndicator color={C.primary} style={{ padding: S.xxl }} />}
            {!loading && notes.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: S.xxxl }}>
                <FileText size={IS.xxl} stroke={C.textDisabled} />
                <Text style={{ color: C.textMuted, fontSize: FS.base, marginTop: S.sm }}>No notes yet</Text>
              </View>
            )}
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={() => setEditingNote(note)}
                onDelete={() => deleteNote(note.id)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
