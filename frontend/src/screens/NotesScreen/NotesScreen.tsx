import React, { JSX, useEffect, useRef, useState } from 'react';
import './NotesScreen.css';
import NotesService from '../../services/NotesService';

type NoteId = string | number;

interface Note {
  id: NoteId;
  text: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteApiItem {
  id: NoteId;
  text?: string;
  content?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  modified?: string;
  date?: string;
  [key: string]: unknown;
}

interface NotesServiceResult {
  success: boolean;
  data?: NoteApiItem[] | NoteApiItem;
  message?: string;
}

const NotesScreen = (): JSX.Element => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [newNote, setNewNote] = useState<string>('');

  const [editingNoteId, setEditingNoteId] = useState<NoteId | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const editModeRef = useRef<HTMLDivElement | null>(null);

  const normalizeNote = (note: NoteApiItem, fallbackText = ''): Note => ({
    id: note.id,
    text: note.text || note.content || fallbackText,
    createdAt:
      note.createdAt ||
      note.created_at ||
      note.date ||
      new Date().toISOString(),
    updatedAt:
      note.updatedAt ||
      note.updated_at ||
      note.modified ||
      note.createdAt ||
      note.created_at ||
      note.date ||
      new Date().toISOString(),
  });

  const loadNotes = async (): Promise<void> => {
    setLoading(true);

    try {
      const result = (await NotesService.getNotes()) as NotesServiceResult;
      console.log('Notes loaded:', result);

      if (result.success) {
        const normalizedNotes = ((result.data as NoteApiItem[] | undefined) || []).map((note) =>
          normalizeNote(note)
        );
        setNotes(normalizedNotes);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
  }, []);

  const addNote = async (text: string): Promise<void> => {
    if (!text.trim()) return;

    try {
      const result = (await NotesService.createNote(text)) as NotesServiceResult;
      console.log('Note created:', result);

      if (result.success && result.data && !Array.isArray(result.data)) {
        const createdNote = normalizeNote(result.data, text);
        setNotes((prevNotes) => [createdNote, ...prevNotes]);
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const updateNote = async (id: NoteId, text: string): Promise<void> => {
    if (!text.trim()) return;

    try {
      const result = (await NotesService.updateNote(id, text)) as NotesServiceResult;
      console.log('Note updated:', result);

      if (result.success && result.data && !Array.isArray(result.data)) {
        const existingNote = notes.find((n) => n.id === id);

        const updatedNote: Note = {
          id: result.data.id,
          text: result.data.text || result.data.content || text,
          createdAt:
            result.data.createdAt ||
            result.data.created_at ||
            existingNote?.createdAt ||
            new Date().toISOString(),
          updatedAt:
            result.data.updatedAt ||
            result.data.updated_at ||
            new Date().toISOString(),
        };

        setNotes((prevNotes) =>
          prevNotes.map((note) => (note.id === id ? updatedNote : note))
        );
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const deleteNote = async (id: NoteId): Promise<void> => {
    if (!window.confirm('Вы уверены, что хотите удалить эту заметку?')) return;

    try {
      const result = (await NotesService.deleteNote(id)) as NotesServiceResult;

      if (result.success) {
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));

        if (editingNoteId === id) {
          setEditingNoteId(null);
          setEditingText('');
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const startEditing = (note: Note): void => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const saveEditing = async (id: NoteId): Promise<void> => {
    await updateNote(id, editingText);
    setEditingNoteId(null);
    setEditingText('');
  };

  const cancelEditing = (): void => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const handleAddNote = (): void => {
    const trimmedText = newNote.trim();
    if (trimmedText === '') return;

    void addNote(trimmedText);
    setNewNote('');
  };

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const handleClickOutside = (e: MouseEvent): void => {
    const targetNode = e.target as Node | null;

    if (
      editingNoteId !== null &&
      editModeRef.current &&
      targetNode &&
      !editModeRef.current.contains(targetNode)
    ) {
      if (editingText.trim() !== '') {
        void saveEditing(editingNoteId);
      } else {
        cancelEditing();
      }
    }
  };

  useEffect(() => {
    if (editingNoteId !== null) {
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }

    return;
  }, [editingNoteId, editingText]);

  useEffect(() => {
    if (editingNoteId !== null && editModeRef.current) {
      const textarea = editModeRef.current.querySelector(
        '.note-edit-textarea'
      ) as HTMLTextAreaElement | null;

      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }
  }, [editingNoteId]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Дата не указана';

    try {
      let date: Date;

      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else if (dateString.includes(',')) {
        const [datePart, timePart] = dateString.split(', ');
        const [day, month, year] = datePart.split('.');
        const [hours, minutes] = timePart.split(':');
        date = new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hours),
          Number(minutes)
        );
      } else {
        date = new Date(dateString);
      }

      if (Number.isNaN(date.getTime())) {
        return dateString;
      }

      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return dateString;
    }
  };

  const isDateDifferent = (createdAt: string, updatedAt: string): boolean => {
    if (!createdAt || !updatedAt) return false;

    try {
      const createdDate = new Date(createdAt);
      const updatedDate = new Date(updatedAt);
      return createdDate.getTime() !== updatedDate.getTime();
    } catch {
      return createdAt !== updatedAt;
    }
  };

  if (loading) {
    return (
      <div className="notes-page">
        <div className="notes-container">
          <div className="notes-header">
            <h2>Мои заметки</h2>
            <p>Загружаем ваши заметки...</p>
          </div>
          <div className="loading-notes">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-page">
      <div className="notes-container">
        <div className="notes-header">
          <h2>Мои заметки</h2>
          <p>Записывайте свои мысли, идеи и наблюдения о практике йоги</p>
        </div>

        <div className="add-note-section">
          <div className="note-input-container">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Напишите свою заметку..."
              className="note-textarea"
              rows={4}
              maxLength={1000}
              aria-label="Поле для ввода новой заметки"
            />
            <div className="note-input-actions">
              <button
                onClick={handleAddNote}
                disabled={newNote.trim() === ''}
                className="add-note-btn"
                aria-label="Добавить заметку"
                type="button"
              >
                Добавить заметку
              </button>
              <span className="char-count">{newNote.length}/1000</span>
            </div>
          </div>
        </div>

        <div className="notes-content">
          <div className="notes-list-container">
            <div className="notes-list">
              {notes.length === 0 ? (
                <div className="no-notes">
                  <p>У вас пока нет заметок</p>
                  <span>Начните добавлять свои мысли и наблюдения!</span>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="note-card">
                    {editingNoteId === note.id ? (
                      <div className="note-edit-mode" ref={editModeRef}>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="note-edit-textarea"
                          rows={4}
                          maxLength={1000}
                          aria-label="Редактирование заметки"
                        />
                        <div className="note-edit-info">
                          <span className="edit-char-count">{editingText.length}/1000</span>
                        </div>
                        <div className="note-edit-actions">
                          <button
                            onClick={() => {
                              void saveEditing(note.id);
                            }}
                            disabled={editingText.trim() === ''}
                            className="save-btn"
                            aria-label="Сохранить изменения"
                            type="button"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="cancel-btn"
                            aria-label="Отменить редактирование"
                            type="button"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="note-content">
                          <p>{note.text}</p>
                        </div>
                        <div className="note-footer">
                          <div className="note-dates">
                            <span className="note-date">
                              Создано: {formatDate(note.createdAt)}
                            </span>
                            {isDateDifferent(note.createdAt, note.updatedAt) && (
                              <span className="note-updated">
                                Изменено: {formatDate(note.updatedAt)}
                              </span>
                            )}
                          </div>
                          <div className="note-actions">
                            <button
                              onClick={() => startEditing(note)}
                              className="edit-btn"
                              aria-label="Редактировать заметку"
                              type="button"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => {
                                void deleteNote(note.id);
                              }}
                              className="delete-btn"
                              aria-label="Удалить заметку"
                              type="button"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesScreen;