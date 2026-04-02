export type NoteId = number;

export interface Note {
  id: NoteId;
  text: string;
  userId?: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface NoteApiResponse {
  id: NoteId;
  text?: string;
  content?: string;
  user_id?: number;
  created_at?: string | null;
  updated_at?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  date?: string;
}

export interface NotePayload {
  text: string;
}

export type NoteData = NotePayload;

export interface NotesErrorResult {
  success: false;
  message: string;
}

export interface NotesListSuccessResult {
  success: true;
  data: Note[];
}

export interface NoteSuccessResult {
  success: true;
  data: Note;
}

export type NotesListResult = NotesListSuccessResult | NotesErrorResult;
export type NoteResult = NoteSuccessResult | NotesErrorResult;