import { useState, useEffect } from "react";
import { Plus, FileText, Globe, Folder, Trash2, StickyNote } from "lucide-react";
import { useNotesStore, type Note } from "../stores/notes-store";
import { MarkdownPreview } from "./MarkdownPreview";

function NoteCard({ note, isActive, onClick, onDelete }: { note: Note; isActive: boolean; onClick: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px",
        borderRadius: "10px",
        cursor: "pointer",
        background: isActive ? "rgba(50, 224, 196, 0.08)" : "transparent",
        border: isActive ? "1px solid rgba(50, 224, 196, 0.2)" : "1px solid transparent",
        marginBottom: "4px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={14} style={{ color: "var(--orphix-color-primary)", opacity: 0.7 }} />
          <span style={{ fontSize: "0.875rem", color: "var(--orphix-color-text)", fontWeight: 500 }}>{note.title || "Untitled"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {note.workspaceId ? (
            <Folder size={14} style={{ color: "var(--orphix-color-text-muted)" }} />
          ) : (
            <Globe size={14} style={{ color: "var(--orphix-color-primary)" }} />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
          >
            <Trash2 size={14} style={{ color: "var(--orphix-color-text-muted)" }} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: "0.875rem", color: "var(--orphix-color-text-muted)", marginTop: "4px" }}>
        {new Date(note.updatedAt).toLocaleDateString()} · {note.syncEnabled ? "Synced" : "Local"}
      </div>
    </div>
  );
}

function NoteEditor({ note, onClose }: { note: Note; onClose: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [showPreview, setShowPreview] = useState(false);
  const updateNote = useNotesStore((s) => s.updateNote);

  const handleSave = () => {
    updateNote(note.id, { title, content });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--orphix-color-base-background)" }}>
      {/* Editor header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          placeholder="Note title..."
          style={{
            background: "transparent",
            border: "none",
            color: "var(--orphix-color-text)",
            fontSize: "0.875rem",
            fontWeight: 600,
            outline: "none",
            flex: 1,
          }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{ fontSize: "0.875rem", color: showPreview ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
          <button onClick={onClose} style={{ fontSize: "0.875rem", color: "var(--orphix-color-text-muted)", background: "none", border: "none", cursor: "pointer" }}>Close</button>
        </div>
      </div>

      {/* Editor body */}
      {showPreview ? (
        <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
          <MarkdownPreview content={content} />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleSave}
          placeholder="Write markdown here..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "var(--orphix-color-text)",
            fontSize: "0.875rem",
            fontFamily: "var(--orphix-font-terminal)",
            lineHeight: "1.6",
            padding: "12px",
            outline: "none",
            resize: "none",
          }}
        />
      )}
    </div>
  );
}

export function NotesPanel() {
  const { notes, loading, activeNoteId, editorOpen, loadNotes, createNote, deleteNote, setActiveNote, setEditorOpen } = useNotesStore();
  const [filter, setFilter] = useState<"all" | "global" | "workspace">("all");

  useEffect(() => {
    loadNotes();
  }, []);

  const filtered = notes.filter((n) => {
    if (filter === "global") return !n.workspaceId;
    if (filter === "workspace") return !!n.workspaceId;
    return true;
  });

  const activeNote = notes.find((n) => n.id === activeNoteId);

  if (editorOpen && activeNote) {
    return <NoteEditor note={activeNote} onClose={() => { setEditorOpen(false); setActiveNote(null); }} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--orphix-color-base-background)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StickyNote size={16} style={{ color: "var(--orphix-color-primary)" }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--orphix-color-text)" }}>Notes</span>
        </div>
        <button
          onClick={() => createNote({ sync: true })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
        >
          <Plus size={16} style={{ color: "var(--orphix-color-primary)" }} />
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "2px", padding: "6px 8px", borderBottom: "1px solid var(--orphix-color-base-border)" }}>
        {(["all", "global", "workspace"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: "0.875rem",
              padding: "4px 10px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: filter === f ? "rgba(50, 224, 196, 0.1)" : "transparent",
              color: filter === f ? "var(--orphix-color-primary)" : "var(--orphix-color-text-muted)",
            }}
          >
            {f === "all" ? "All" : f === "global" ? "Global" : "Workspace"}
          </button>
        ))}
      </div>

      {/* Note list */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 6px" }}>
        {loading && <div style={{ padding: "16px", textAlign: "center", fontSize: "0.875rem", color: "var(--orphix-color-text-muted)" }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <FileText size={20} style={{ color: "var(--orphix-color-text-muted)", opacity: 0.4 }} />
            <div style={{ fontSize: "0.875rem", color: "var(--orphix-color-text-muted)", marginTop: "8px" }}>No notes yet</div>
          </div>
        )}
        {filtered.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isActive={note.id === activeNoteId}
            onClick={() => setActiveNote(note.id)}
            onDelete={() => deleteNote(note.id)}
          />
        ))}
      </div>
    </div>
  );
}
