import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Globe, Folder, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, parseArrayResponse } from "@/lib/api";
import type { Note } from "./notes.api";
import PageHeader from "@/components/shell/PageHeader";
import LoadingState from "@/components/shell/LoadingState";
import EmptyState from "@/components/shell/EmptyState";
import ErrorState from "@/components/shell/ErrorState";

export default function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "global" | "workspace">("all");

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/notes");
      const data = await parseArrayResponse<Note>(res);
      setNotes(data);
    } catch {
      setError("Failed to load notes. The server may be unreachable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotes(); }, []);

  const handleCreate = async () => {
    const res = await apiFetch("/notes", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled", content: "", syncEnabled: true }),
    });
    if (res.ok) {
      const note = await res.json();
      navigate(`/dashboard/notes/${note.id}`);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiFetch(`/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const filtered = notes.filter((n) => {
    if (filter === "global") return !n.workspaceId;
    if (filter === "workspace") return !!n.workspaceId;
    return true;
  });

  return (
    <div className="space-y-6 anim-slide-up">
      <PageHeader title="Notes" description="Your synced and local notes" action={<Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> New Note</Button>} />

      <div className="flex gap-2">
        {(["all", "global", "workspace"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-4 py-2 text-sm transition-colors ${filter === f ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "All" : f === "global" ? "Global" : "Workspace"}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadNotes} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No notes yet" description="Create your first note to get started." action={<Button variant="outline" size="sm" onClick={handleCreate}><Plus className="mr-2 h-3.5 w-3.5" /> Create note</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <Card key={note.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/dashboard/notes/${note.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-primary/70" />
                    <span className="truncate text-base font-medium">{note.title || "Untitled"}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 ml-2">
                    {note.workspaceId ? (
                      <Badge variant="secondary" className="text-xs"><Folder className="mr-1 h-3.5 w-3.5" />Workspace</Badge>
                    ) : (
                      <Badge variant="default" className="text-xs"><Globe className="mr-1 h-3.5 w-3.5" />Global</Badge>
                    )}
                    <button onClick={(e) => handleDelete(note.id, e)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mb-2 line-clamp-3 text-xs text-muted-foreground">{note.content || "Empty note"}</p>
                <div className="text-xs text-muted-foreground">
                  {new Date(note.updatedAt).toLocaleDateString()} · {note.syncEnabled ? "Synced" : "Local"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
