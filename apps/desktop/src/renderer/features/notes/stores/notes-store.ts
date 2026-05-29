import { create } from "zustand";
import { CONTROL_URL } from "@/lib/env";

export interface Note {
  id: string;
  userId: string;
  workspaceId: string | null;
  title: string;
  content: string;
  syncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotesState {
  notes: Note[];
  loading: boolean;
  activeNoteId: string | null;
  editorOpen: boolean;

  loadNotes: () => Promise<void>;
  createNote: (opts?: { workspaceId?: string | null; title?: string; sync?: boolean }) => Promise<Note | null>;
  updateNote: (id: string, updates: Partial<Pick<Note, "title" | "content" | "syncEnabled">>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  setEditorOpen: (open: boolean) => void;
}

const API_URL = CONTROL_URL;

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,
  activeNoteId: null,
  editorOpen: false,

  loadNotes: async () => {
    set({ loading: true });
    try {
      const token = localStorage.getItem("orphix_access_token");
      if (!token) return;
      const res = await fetch(`${API_URL}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const notes = await res.json();
        set({ notes });
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      set({ loading: false });
    }
  },

  createNote: async (opts) => {
    try {
      const token = localStorage.getItem("orphix_access_token");
      if (!token) return null;
      const res = await fetch(`${API_URL}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workspaceId: opts?.workspaceId ?? null,
          title: opts?.title ?? "Untitled",
          content: "",
          syncEnabled: opts?.sync ?? true,
        }),
      });
      if (res.ok) {
        const note = await res.json();
        set((s) => ({ notes: [...s.notes, note], activeNoteId: note.id, editorOpen: true }));
        return note;
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    }
    return null;
  },

  updateNote: async (id, updates) => {
    try {
      const token = localStorage.getItem("orphix_access_token");
      if (!token) return;
      const res = await fetch(`${API_URL}/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? updated : n)) }));
      }
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  },

  deleteNote: async (id) => {
    try {
      const token = localStorage.getItem("orphix_access_token");
      if (!token) return;
      await fetch(`${API_URL}/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      set((s) => ({
        notes: s.notes.filter((n) => n.id !== id),
        activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
        editorOpen: s.activeNoteId === id ? false : s.editorOpen,
      }));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  },

  setActiveNote: (id) => set({ activeNoteId: id, editorOpen: id !== null }),
  setEditorOpen: (open) => set({ editorOpen: open }),
}));
