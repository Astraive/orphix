import { create } from "zustand";
import { apiFetch } from "@/lib/api";

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
  loadNotes: () => Promise<void>;
  createNote: (title?: string) => Promise<Note | null>;
  updateNote: (id: string, updates: Partial<Pick<Note, "title" | "content" | "syncEnabled">>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  loading: false,

  loadNotes: async () => {
    set({ loading: true });
    try {
      const res = await apiFetch("/notes");
      if (res.ok) {
        set({ notes: await res.json() });
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      set({ loading: false });
    }
  },

  createNote: async (title) => {
    try {
      const res = await apiFetch("/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title ?? "Untitled", content: "", syncEnabled: true }),
      });
      if (res.ok) {
        const note = await res.json();
        set((s) => ({ notes: [...s.notes, note] }));
        return note;
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    }
    return null;
  },

  updateNote: async (id, updates) => {
    try {
      const res = await apiFetch(`/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      await apiFetch(`/notes/${id}`, { method: "DELETE" });
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  },
}));
