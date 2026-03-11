import ApiService, { ApiError } from './ApiService';
import type {
  Note,
  NoteApiResponse,
  NoteId,
  NotePayload,
  NotesErrorResult,
  NotesListResult,
  NoteResult,
  DeleteNoteResult,
} from '../types/note';

class NotesService {
  static async getNotes(
    skip = 0,
    limit = 100
  ): Promise<NotesListResult | NotesErrorResult> {
    try {
      const notes = await ApiService.getNotes<NoteApiResponse[]>(skip, limit);

      return {
        success: true,
        data: notes.map((note) => this.formatNote(note)),
      };
    } catch (error: unknown) {
      console.error('Get notes error:', error);

      return {
        success: false,
        message: this.getErrorMessage(error, 'Ошибка при получении заметок'),
      };
    }
  }

  static async createNote(text: string): Promise<NoteResult | NotesErrorResult> {
    try {
      const noteData: NotePayload = { text };
      const note = await ApiService.createNote<NoteApiResponse>(noteData);

      return {
        success: true,
        data: this.formatNote(note),
      };
    } catch (error: unknown) {
      console.error('Create note error:', error);

      return {
        success: false,
        message: this.getErrorMessage(error, 'Ошибка при создании заметки'),
      };
    }
  }

  static async updateNote(
    noteId: NoteId,
    text: string
  ): Promise<NoteResult | NotesErrorResult> {
    try {
      const noteData: NotePayload = { text };
      const note = await ApiService.updateNote<NoteApiResponse>(noteId, noteData);

      return {
        success: true,
        data: this.formatNote(note),
      };
    } catch (error: unknown) {
      console.error('Update note error:', error);

      return {
        success: false,
        message: this.getErrorMessage(error, 'Ошибка при обновлении заметки'),
      };
    }
  }

  static async deleteNote(
    noteId: NoteId
  ): Promise<DeleteNoteResult | NotesErrorResult> {
    try {
      await ApiService.deleteNote(noteId);

      return {
        success: true,
        data: { id: noteId },
      };
    } catch (error: unknown) {
      console.error('Delete note error:', error);

      return {
        success: false,
        message: this.getErrorMessage(error, 'Ошибка при удалении заметки'),
      };
    }
  }

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
      updatedAt: note.updatedAt ?? note.updated_at ?? null,
    };
  }

  private static getErrorMessage(
    error: unknown,
    fallbackMessage: string
  ): string {
    if (error instanceof ApiError) {
      if (
        error.body &&
        typeof error.body === 'object' &&
        'detail' in error.body &&
        typeof (error.body as { detail?: unknown }).detail === 'string'
      ) {
        return (error.body as { detail: string }).detail;
      }

      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallbackMessage;
  }
}

export default NotesService;