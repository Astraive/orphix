import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { notes } from "@orphix/database";

@Injectable()
export class NotesService {
  constructor(private readonly db: DatabaseService) {}

  async listByUser(userId: string, workspaceId?: string) {
    const conditions = [eq(notes.userId, userId)];
    if (workspaceId) {
      conditions.push(eq(notes.workspaceId, workspaceId));
    }
    return (this.db.db as any).select().from(notes).where(and(...conditions)).orderBy(notes.updatedAt);
  }

  async findById(userId: string, id: string) {
    const [note] = await (this.db.db as any)
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.id, id)))
      .limit(1);
    if (!note) throw new NotFoundException("Note not found");
    return note;
  }

  async create(userId: string, data: { workspaceId?: string | null; title?: string; content?: string; syncEnabled?: boolean }) {
    const [note] = await (this.db.db as any)
      .insert(notes)
      .values({
        userId,
        workspaceId: data.workspaceId ?? null,
        title: data.title ?? "Untitled",
        content: data.content ?? "",
        syncEnabled: data.syncEnabled ?? true,
      })
      .returning();
    return note;
  }

  async update(userId: string, id: string, data: { title?: string; content?: string; syncEnabled?: boolean }) {
    const [note] = await (this.db.db as any)
      .update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(notes.userId, userId), eq(notes.id, id)))
      .returning();
    if (!note) throw new NotFoundException("Note not found");
    return note;
  }

  async delete(userId: string, id: string) {
    const [note] = await (this.db.db as any)
      .delete(notes)
      .where(and(eq(notes.userId, userId), eq(notes.id, id)))
      .returning();
    if (!note) throw new NotFoundException("Note not found");
    return { success: true };
  }
}
