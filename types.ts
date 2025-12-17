export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  collapsed: boolean;
}

export interface Bookmark {
  id: string;
  folderId: string | null; // null means 'Uncategorized' or root if specific logic applies
  title: string;
  url: string;
  tags: string[];
  description: string;
  imageUrl: string;
  createdAt: number;
}

export interface AppState {
  folders: Folder[];
  bookmarks: Bookmark[];
}

export type ExportFormat = 'html' | 'txt' | 'json'; // PDF/Image handled via DOM capture
