import ApiService from './ApiService';

class NotesService {
  // Получить все заметки пользователя
  static async getNotes(skip = 0, limit = 100) {
    try {
      const notes = await ApiService.getNotes(skip, limit);
      return {
        success: true,
        data: notes.map(note => this.formatNote(note))
      };
    } catch (error) {
      console.error('Get notes error:', error);
      return {
        success: false,
        message: error.body?.detail || 'Ошибка при получении заметок'
      };
    }
  }

  // Создать новую заметку
  static async createNote(text) {
    try {
      const noteData = { text };
      const note = await ApiService.createNote(noteData);
      return {
        success: true,
        data: this.formatNote(note)
      };
    } catch (error) {
      console.error('Create note error:', error);
      return {
        success: false,
        message: error.body?.detail || 'Ошибка при создании заметки'
      };
    }
  }

  // Обновить заметку
  static async updateNote(noteId, text) {
    try {
      const noteData = { text };
      const note = await ApiService.updateNote(noteId, noteData);
      return {
        success: true,
        data: this.formatNote(note)
      };
    } catch (error) {
      console.error('Update note error:', error);
      return {
        success: false,
        message: error.body?.detail || 'Ошибка при обновлении заметки'
      };
    }
  }

  // Удалить заметку
  static async deleteNote(noteId) {
    try {
      await ApiService.deleteNote(noteId);
      return {
        success: true,
        data: { id: noteId }
      };
    } catch (error) {
      console.error('Delete note error:', error);
      return {
        success: false,
        message: error.body?.detail || 'Ошибка при удалении заметки'
      };
    }
  }

  // Форматирование даты для отображения
  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Форматирование заметки для фронтенда
  static formatNote(note) {
    return {
      id: note.id,
      text: note.text,
      userId: note.user_id,
      createdAt: this.formatDate(note.created_at),
      updatedAt: note.updated_at ? this.formatDate(note.updated_at) : null
    };
  }
}

export default NotesService;