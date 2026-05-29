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
