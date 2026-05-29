import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Code, Trash2, Globe, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import MarkdownPreview from "@/components/MarkdownPreview";

export default function NoteEditorPage() {
  const navigate = useNavigate();
  const { id: noteId } = useParams<{ id: string }>();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!noteId) return;
    apiFetch(`/notes/${noteId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((note) => {
        setTitle(note.title);
        setContent(note.content);
        setWorkspaceId(note.workspaceId);
        setSyncEnabled(note.syncEnabled);
      })
      .catch(() => navigate("/dashboard/notes", { replace: true }));
  }, [noteId, navigate]);

  const save = useCallback(async () => {
    if (!noteId) return;
    setSaving(true);
    await apiFetch(`/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify({ title, content, syncEnabled }),
    });
    setSaving(false);
  }, [noteId, title, content, syncEnabled]);

  const handleDelete = async () => {
    if (!noteId) return;
    await apiFetch(`/notes/${noteId}`, { method: "DELETE" });
    navigate("/dashboard/notes", { replace: true });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 anim-slide-up">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/notes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save} placeholder="Note title..." className="text-xl font-semibold bg-transparent border-none outline-none min-w-0 flex-1" />
          {workspaceId ? (
            <Badge variant="secondary" className="text-xs shrink-0"><Folder className="mr-1 h-3.5 w-3.5" />Workspace</Badge>
          ) : (
            <Badge variant="default" className="text-xs shrink-0"><Globe className="mr-1 h-3.5 w-3.5" />Global</Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <Code className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
            {showPreview ? "Edit" : "Preview"}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden pt-4">
        {showPreview ? (
          <div className="h-full overflow-auto"><MarkdownPreview content={content} /></div>
        ) : (
          <textarea value={content} onChange={(e) => setContent(e.target.value)} onBlur={save} placeholder="Write markdown here..." className="w-full h-full bg-transparent border-none outline-none resize-none font-mono text-sm leading-relaxed" spellCheck={false} />
        )}
      </div>
    </div>
  );
}
