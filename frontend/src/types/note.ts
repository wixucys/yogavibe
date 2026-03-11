export type NoteId = string | number;

export interface NoteApiResponse {
  id: NoteId;
  text?: string;
  content?: string;
  user_id?: NoteId;
  created_at?: string;
  updated_at?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  date?: string;
  [key: string]: unknown;
}

export interface Note {
  id: NoteId;
  text: string;
  userId?: NoteId;
  createdAt: string;
  updatedAt: string | null;
}

export interface NotePayload {
  text: string;
  [key: string]: unknown;
}

export type NoteData = NotePayload;

export interface NotesSuccessResult<T> {
  success: true;
  data: T;
}

export interface NotesErrorResult {
  success: false;
  message: string;
}

export type NotesListResult = NotesSuccessResult<Note[]>;
export type NoteResult = NotesSuccessResult<Note>;
export type DeleteNoteResult = NotesSuccessResult<{ id: NoteId }>;