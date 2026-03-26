import ApiService from './ApiService';
import type {
  Note,
  NoteApiResponse,
  NoteId,
  NotePayload,
  NoteResult,
  NotesErrorResult,
  NotesListResult,
} from '../types/note';

type NotesSuccessResult<T> = {
  success: true;
  data: T;
};

type NotesResult<T> = NotesSuccessResult<T> | NotesErrorResult;

interface DeleteApiResponse {
  message?: string;
  [key: string]: unknown;
}

class NotesService {
  private normalizeNote(note: NoteApiResponse): Note {
    return {
      id: note.id,
      text: note.text ?? note.content ?? '',
      userId: note.user_id,
      createdAt: note.created_at ?? note.createdAt ?? new Date().toISOString(),
      updatedAt: note.updated_at ?? note.updatedAt ?? null,
    };
  }

  async getNotes(): Promise<NotesListResult> {
    try {
      const response = (await ApiService.request('/notes')) as NoteApiResponse[];

      const notes: Note[] = Array.isArray(response)
        ? response.map((note) => this.normalizeNote(note))
        : [];

      return {
        success: true,
        data: notes,
      };
    } catch (error) {
      console.error('Error fetching notes:', error);

      return {
        success: false,
        message: 'Не удалось загрузить заметки',
      };
    }
  }

  async createNote(text: string): Promise<NoteResult> {
    try {
      const payload: NotePayload = { text };

      const response = (await ApiService.request('/notes', {
        method: 'POST',
        body: payload,
      })) as NoteApiResponse;

      return {
        success: true,
        data: this.normalizeNote(response),
      };
    } catch (error) {
      console.error('Error creating note:', error);

      return {
        success: false,
        message: 'Не удалось создать заметку',
      };
    }
  }

  async updateNote(id: NoteId, text: string): Promise<NoteResult> {
    try {
      const payload: NotePayload = { text };

      const response = (await ApiService.request(`/notes/${id}`, {
        method: 'PUT',
        body: payload,
      })) as NoteApiResponse;

      return {
        success: true,
        data: this.normalizeNote(response),
      };
    } catch (error) {
      console.error('Error updating note:', error);

      return {
        success: false,
        message: 'Не удалось обновить заметку',
      };
    }
  }

  async deleteNote(
    id: NoteId
  ): Promise<{ success: true; message: string } | NotesErrorResult> {
    try {
      const response = (await ApiService.request(`/notes/${id}`, {
        method: 'DELETE',
      })) as DeleteApiResponse | undefined;

      return {
        success: true,
        message: response?.message ?? 'Заметка удалена',
      };
    } catch (error) {
      console.error('Error deleting note:', error);

      return {
        success: false,
        message: 'Не удалось удалить заметку',
      };
    }
  }
}

export default new NotesService();