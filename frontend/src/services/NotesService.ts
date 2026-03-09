import ApiService, { ApiError } from './ApiService';

type NoteId = string | number;

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

class NotesService {
  // Получить все заметки пользователя
  static async getNotes(skip = 0, limit = 100): Promise<NotesListResult | NotesErrorResult> {
    try {
      const notes = await ApiService.getNotes<NoteApiResponse[]>(skip, limit);

      return {
        success: true,
        data: notes.map((note) => this.formatNote(note)),
      };
    } catch (error: unknown) {
      console.error('Get notes error:', error);

      const apiError = error as ApiError;
      return {
        success: false,
        message:
          (typeof apiError.body === 'object' &&
            apiError.body !== null &&
            'detail' in apiError.body &&
            typeof (apiError.body as { detail?: unknown }).detail === 'string' &&
            (apiError.body as { detail: string }).detail) ||
          'Ошибка при получении заметок',
      };
    }
  }

  // Создать новую заметку
  static async createNote(text: string): Promise<NoteResult | NotesErrorResult> {
    try {
      const noteData = { text };
      const note = await ApiService.createNote<NoteApiResponse>(noteData);

      return {
        success: true,
        data: this.formatNote(note),
      };
    } catch (error: unknown) {
      console.error('Create note error:', error);

      const apiError = error as ApiError;
      return {
        success: false,
        message:
          (typeof apiError.body === 'object' &&
            apiError.body !== null &&
            'detail' in apiError.body &&
            typeof (apiError.body as { detail?: unknown }).detail === 'string' &&
            (apiError.body as { detail: string }).detail) ||
          'Ошибка при создании заметки',
      };
    }
  }

  // Обновить заметку
  static async updateNote(
    noteId: NoteId,
    text: string
  ): Promise<NoteResult | NotesErrorResult> {
    try {
      const noteData = { text };
      const note = await ApiService.updateNote<NoteApiResponse>(noteId, noteData);

      return {
        success: true,
        data: this.formatNote(note),
      };
    } catch (error: unknown) {
      console.error('Update note error:', error);

      const apiError = error as ApiError;
      return {
        success: false,
        message:
          (typeof apiError.body === 'object' &&
            apiError.body !== null &&
            'detail' in apiError.body &&
            typeof (apiError.body as { detail?: unknown }).detail === 'string' &&
            (apiError.body as { detail: string }).detail) ||
          'Ошибка при обновлении заметки',
      };
    }
  }

  // Удалить заметку
  static async deleteNote(noteId: NoteId): Promise<DeleteNoteResult | NotesErrorResult> {
    try {
      await ApiService.deleteNote(noteId);

      return {
        success: true,
        data: { id: noteId },
      };
    } catch (error: unknown) {
      console.error('Delete note error:', error);

      const apiError = error as ApiError;
      return {
        success: false,
        message:
          (typeof apiError.body === 'object' &&
            apiError.body !== null &&
            'detail' in apiError.body &&
            typeof (apiError.body as { detail?: unknown }).detail === 'string' &&
            (apiError.body as { detail: string }).detail) ||
          'Ошибка при удалении заметки',
      };
    }
  }

  // Форматирование даты для отображения
  static formatDate(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Форматирование заметки для фронтенда
  static formatNote(note: NoteApiResponse): Note {
    return {
      id: note.id,
      text: note.text || note.content || '',
      userId: note.user_id,
      createdAt:
        note.createdAt ||
        note.created_at ||
        note.date ||
        new Date().toISOString(),
      updatedAt:
        note.updatedAt ??
        note.updated_at ??
        null,
    };
  }
}

export default NotesService;