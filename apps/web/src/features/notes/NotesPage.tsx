import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Plus, FileText, Globe, Folder, Trash2 } from "lucide-react";
import { Card, CardContent } from "@orphix/ui";
import { Button } from "@orphix/ui";
import { Badge } from "@orphix/ui";
import { Skeleton } from "@orphix/ui";
import { ToggleGroup, ToggleGroupItem } from "@orphix/ui";
import PageHeader from "@/components/shell/PageHeader";
import EmptyState from "@/components/shell/EmptyState";

export default function NotesPage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);
  const notes = useQuery(
    api.notes.listByUser,
    user ? { userId: user._id } : "skip"
  );
  const createNote = useMutation(api.notes.create);
  const deleteNote = useMutation(api.notes.remove);

  const [filter, setFilter] = useState<"all" | "global" | "workspace">("all");

  const loading = notes === undefined;
  const noteList = notes ?? [];

  const filtered = noteList.filter((n) => {
    if (filter === "global") return !n.workspaceId;
    if (filter === "workspace") return !!n.workspaceId;
    return true;
  });

  const handleCreate = async () => {
    if (!user) return;
    try {
      const note = await createNote({
        userId: user._id,
        title: "Untitled",
        content: "",
        syncEnabled: true,
      });
      if (note) {
        navigate(`/dashboard/notes/${note._id}`);
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  const handleDelete = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteNote({ userId: user._id, noteId: noteId as any });
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  return (
    <div className="flex flex-col gap-6 anim-slide-up">
      <PageHeader title="Notes" description="Your synced and local notes" action={<Button onClick={handleCreate}><Plus data-icon="inline-start" /> New Note</Button>} />

      <ToggleGroup type="single" value={filter} onValueChange={(value) => { if (value) setFilter(value as typeof filter); }}>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="global">Global</ToggleGroupItem>
        <ToggleGroupItem value="workspace">Workspace</ToggleGroupItem>
      </ToggleGroup>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No notes yet" description="Create your first note to get started." action={<Button variant="outline" size="sm" onClick={handleCreate}><Plus data-icon="inline-start" /> Create note</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <Card key={note._id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/dashboard/notes/${note._id}`)}>
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
                    <Button variant="ghost" size="icon-xs" onClick={(e) => handleDelete(note._id, e)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 />
                    </Button>
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
