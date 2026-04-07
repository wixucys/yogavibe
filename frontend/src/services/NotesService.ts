import ApiService from './ApiService';
import { ApiError } from './ApiService';
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

interface PaginatedResponse<T> {
  items: T[];
}

class NotesService {
  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
      if (error.status === 403) {
        return 'Недостаточно прав для выполнения операции';
      }

      if (error.status === 404) {
        return 'Запись не найдена';
      }

      if (error.status === 409) {
        return 'Запись была изменена. Обновите страницу и повторите действие';
      }

      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  private extractItems<T>(response: T[] | PaginatedResponse<T>): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.items)) {
      return response.items;
    }

    return [];
  }

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
      const response = (await ApiService.request('/notes')) as
        | NoteApiResponse[]
        | PaginatedResponse<NoteApiResponse>;

      const notes: Note[] = this.extractItems(response).map((note) =>
        this.normalizeNote(note)
      );

      return {
        success: true,
        data: notes,
      };
    } catch (error) {
      console.error('Error fetching notes:', error);

      return {
        success: false,
        message: this.getErrorMessage(error, 'Не удалось загрузить заметки'),
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
        message: this.getErrorMessage(error, 'Не удалось создать заметку'),
      };
    }
  }

  async updateNote(
    id: NoteId,
    text: string,
    expectedUpdatedAt?: string | null
  ): Promise<NoteResult> {
    try {
      const payload: NotePayload = {
        text,
        expected_updated_at: expectedUpdatedAt ?? undefined,
      };

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
        message: this.getErrorMessage(error, 'Не удалось обновить заметку'),
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
        message: this.getErrorMessage(error, 'Не удалось удалить заметку'),
      };
    }
  }
}

export default new NotesService();