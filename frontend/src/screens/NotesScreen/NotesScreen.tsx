import React, { useEffect, useRef, useState } from 'react';
import './NotesScreen.css';
import NotesService from '../../services/NotesService';
import type { Note, NoteId } from '../../types/note';
import { formatMoscowDateTime } from '../../utils/dateTime';

const NotesScreen = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [newNote, setNewNote] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<NoteId | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingOriginalUpdatedAt, setEditingOriginalUpdatedAt] = useState<string | null>(null);

  const editModeRef = useRef<HTMLDivElement | null>(null);

  const validateNoteText = (text: string): string | null => {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return 'Текст заметки не может быть пустым';
    }

    if (trimmed.length > 1000) {
      return 'Текст заметки слишком длинный (максимум 1000 символов)';
    }

    return null;
  };

  const loadNotes = async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const result = await NotesService.getNotes();

      if (!result.success) {
        setNotes([]);
        setError(result.message);
        return;
      }

      setNotes(result.data);
    } catch (loadError) {
      console.error('Error loading notes:', loadError);
      setNotes([]);
      setError('Ошибка при загрузке заметок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
  }, []);

  const addNote = async (text: string): Promise<boolean> => {
    const validationError = validateNoteText(text);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setError('');

    try {
      const result = await NotesService.createNote(text);

      if (!result.success) {
        setError(result.message);
        return false;
      }

      setNotes((prevNotes) => [result.data, ...prevNotes]);
      return true;
    } catch (createError) {
      console.error('Error creating note:', createError);
      setError('Ошибка при создании заметки');
      return false;
    }
  };

  const updateNote = async (id: NoteId, text: string): Promise<boolean> => {
    const validationError = validateNoteText(text);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setError('');

    try {
      const result = await NotesService.updateNote(
        id,
        text,
        editingOriginalUpdatedAt
      );

      if (!result.success) {
        setError(result.message);
        return false;
      }

      setNotes((prevNotes) =>
        prevNotes.map((note) => (note.id === id ? result.data : note))
      );

      return true;
    } catch (updateError) {
      console.error('Error updating note:', updateError);
      setError('Ошибка при сохранении заметки');
      return false;
    }
  };

  const deleteNote = async (id: NoteId): Promise<void> => {
    if (!window.confirm('Вы уверены, что хотите удалить эту заметку?')) return;

    setError('');

    try {
      const result = await NotesService.deleteNote(id);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));

      if (editingNoteId === id) {
        setEditingNoteId(null);
        setEditingText('');
      }
    } catch (deleteError) {
      console.error('Error deleting note:', deleteError);
      setError('Ошибка при удалении заметки');
    }
  };

  const startEditing = (note: Note): void => {
    setError('');
    setEditingNoteId(note.id);
    setEditingText(note.text);
    setEditingOriginalUpdatedAt(note.updatedAt ?? note.createdAt);
  };

  const saveEditing = async (id: NoteId): Promise<void> => {
    const success = await updateNote(id, editingText);

    if (success) {
      setEditingNoteId(null);
      setEditingText('');
      setEditingOriginalUpdatedAt(null);
    }
  };

  const cancelEditing = (): void => {
    setEditingNoteId(null);
    setEditingText('');
    setEditingOriginalUpdatedAt(null);
    setError('');
  };

  const handleAddNote = async (): Promise<void> => {
    const trimmedText = newNote.trim();
    if (trimmedText === '') return;

    const success = await addNote(trimmedText);

    if (success) {
      setNewNote('');
    }
  };

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleAddNote();
    }
  };

  useEffect(() => {
    if (editingNoteId === null) return;

    const handleClickOutside = (e: MouseEvent): void => {
      const targetNode = e.target as Node | null;

      if (
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

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—';

    try {
      return formatMoscowDateTime(dateString, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (formatError) {
      console.warn('Error formatting date:', dateString, formatError);
      return dateString;
    }
  };

  const isDateDifferent = (
    createdAt: string,
    updatedAt: string | null
  ): boolean => {
    if (!updatedAt) return false;

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

        {error !== '' && (
          <div className="notes-error" role="alert">
            {error}
          </div>
        )}

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
                onClick={() => {
                  void handleAddNote();
                }}
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
                          <span className="edit-char-count">
                            {editingText.length}/1000
                          </span>
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