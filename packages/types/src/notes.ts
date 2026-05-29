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

export interface CreateNoteRequest {
  workspaceId?: string | null;
  title?: string;
  content?: string;
  syncEnabled?: boolean;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  syncEnabled?: boolean;
}
