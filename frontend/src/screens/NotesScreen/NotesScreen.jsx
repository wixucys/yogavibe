import React, { useState, useRef, useEffect } from 'react';
import './NotesScreen.css';
import NotesService from '../../services/NotesService';

const NotesScreen = () => {
  // Состояние для списка заметок
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Состояние для новой заметки
  const [newNote, setNewNote] = useState('');
  
  // Состояние для редактирования заметок
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState('');
  
  // Реф для отслеживания кликов вне области редактирования
  const editModeRef = useRef(null);

  // Загрузка заметок при монтировании компонента
  useEffect(() => {
    loadNotes();
  }, []);

  // Загрузка заметок с сервера
  const loadNotes = async () => {
    setLoading(true);
    try {
      const result = await NotesService.getNotes();
      console.log('Notes loaded:', result); // Для отладки
      if (result.success) {
        // Нормализуем данные: гарантируем наличие всех полей
        const normalizedNotes = (result.data || []).map(note => ({
          id: note.id,
          text: note.text || note.content || '',
          createdAt: note.createdAt || note.created_at || note.date || new Date().toISOString(),
          updatedAt: note.updatedAt || note.updated_at || note.modified || note.createdAt || note.created_at || note.date || new Date().toISOString()
        }));
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

  // Добавление новой заметки
  const addNote = async (text) => {
    if (!text.trim()) return;
    
    try {
      const result = await NotesService.createNote(text);
      console.log('Note created:', result); // Для отладки
      if (result.success) {
        // Нормализуем новую заметку
        const newNote = {
          id: result.data.id,
          text: result.data.text || result.data.content || text,
          createdAt: result.data.createdAt || result.data.created_at || new Date().toISOString(),
          updatedAt: result.data.updatedAt || result.data.updated_at || result.data.createdAt || result.data.created_at || new Date().toISOString()
        };
        setNotes(prevNotes => [newNote, ...prevNotes]);
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  // Обновление существующей заметки
  const updateNote = async (id, text) => {
    if (!text.trim()) return;
    
    try {
      const result = await NotesService.updateNote(id, text);
      console.log('Note updated:', result); // Для отладки
      if (result.success) {
        // Нормализуем обновленную заметку
        const updatedNote = {
          id: result.data.id,
          text: result.data.text || result.data.content || text,
          createdAt: result.data.createdAt || result.data.created_at || notes.find(n => n.id === id)?.createdAt || new Date().toISOString(),
          updatedAt: result.data.updatedAt || result.data.updated_at || new Date().toISOString()
        };
        
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === id ? updatedNote : note
          )
        );
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  // Удаление заметки
  const deleteNote = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту заметку?')) return;
    
    try {
      const result = await NotesService.deleteNote(id);
      if (result.success) {
        setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
        
        // Если удаляем редактируемую заметку, сбрасываем режим редактирования
        if (editingNoteId === id) {
          setEditingNoteId(null);
          setEditingText('');
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Начало редактирования заметки
  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  // Сохранение отредактированной заметки
  const saveEditing = async (id) => {
    await updateNote(id, editingText);
    setEditingNoteId(null);
    setEditingText('');
  };

  // Отмена редактирования
  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  // Добавление новой заметки из UI
  const handleAddNote = () => {
    const trimmedText = newNote.trim();
    if (trimmedText === '') return;
    
    addNote(trimmedText);
    setNewNote('');
  };

  // Обработка нажатия Enter для добавления заметки
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  // Обработчик клика вне поля редактирования
  const handleClickOutside = (e) => {
    if (editingNoteId && editModeRef.current && !editModeRef.current.contains(e.target)) {
      if (editingText.trim() !== '') {
        saveEditing(editingNoteId);
      } else {
        cancelEditing();
      }
    }
  };

  // Добавляем обработчик кликов при редактировании
  useEffect(() => {
    if (editingNoteId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingNoteId, editingText]);

  // Фокус на поле ввода при редактировании
  useEffect(() => {
    if (editingNoteId && editModeRef.current) {
      const textarea = editModeRef.current.querySelector('.note-edit-textarea');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }
  }, [editingNoteId]);

  // Форматирование даты (улучшенная версия)
  const formatDate = (dateString) => {
    if (!dateString) return 'Дата не указана';
    
    try {
      // Пробуем разные форматы дат
      let date;
      
      // Если это ISO строка (например, "2024-01-15T10:30:00Z")
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } 
      // Если это строка в формате "15.01.2024, 10:30"
      else if (dateString.includes(',')) {
        const [datePart, timePart] = dateString.split(', ');
        const [day, month, year] = datePart.split('.');
        const [hours, minutes] = timePart.split(':');
        date = new Date(year, month - 1, day, hours, minutes);
      }
      // Пытаемся просто создать Date объект
      else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString; // Возвращаем исходную строку если не удалось распарсить
      }
      
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return dateString; // Возвращаем исходную строку в случае ошибки
    }
  };

  // Проверяем, отличаются ли даты создания и обновления
  const isDateDifferent = (createdAt, updatedAt) => {
    if (!createdAt || !updatedAt) return false;
    
    try {
      const createdDate = new Date(createdAt);
      const updatedDate = new Date(updatedAt);
      return createdDate.getTime() !== updatedDate.getTime();
    } catch {
      return createdAt !== updatedAt;
    }
  };

  // Рендеринг экрана загрузки
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
        {/* Заголовок раздела заметок */}
        <div className="notes-header">
          <h2>Мои заметки</h2>
          <p>Записывайте свои мысли, идеи и наблюдения о практике йоги</p>
        </div>

        {/* Форма для добавления новой заметки */}
        <div className="add-note-section">
          <div className="note-input-container">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишите свою заметку..."
              className="note-textarea"
              rows="4"
              maxLength="1000"
              aria-label="Поле для ввода новой заметки"
            />
            <div className="note-input-actions">
              <button 
                onClick={handleAddNote}
                disabled={newNote.trim() === ''}
                className="add-note-btn"
                aria-label="Добавить заметку"
              >
                Добавить заметку
              </button>
              <span className="char-count">{newNote.length}/1000</span>
            </div>
          </div>
        </div>

        {/* Контейнер со списком заметок */}
        <div className="notes-content">
          <div className="notes-list-container">
            <div className="notes-list">
              {notes.length === 0 ? (
                // Сообщение при отсутствии заметок
                <div className="no-notes">
                  <p>У вас пока нет заметок</p>
                  <span>Начните добавлять свои мысли и наблюдения!</span>
                </div>
              ) : (
                // Список заметок
                notes.map((note) => (
                  <div key={note.id} className="note-card">
                    {editingNoteId === note.id ? (
                      // Режим редактирования заметки
                      <div className="note-edit-mode" ref={editModeRef}>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="note-edit-textarea"
                          rows="4"
                          maxLength="1000"
                          aria-label="Редактирование заметки"
                        />
                        <div className="note-edit-info">
                          <span className="edit-char-count">{editingText.length}/1000</span>
                        </div>
                        <div className="note-edit-actions">
                          <button 
                            onClick={() => saveEditing(note.id)}
                            disabled={editingText.trim() === ''}
                            className="save-btn"
                            aria-label="Сохранить изменения"
                          >
                            Сохранить
                          </button>
                          <button 
                            onClick={cancelEditing}
                            className="cancel-btn"
                            aria-label="Отменить редактирование"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Режим просмотра заметки
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
                            >
                              Редактировать
                            </button>
                            <button 
                              onClick={() => deleteNote(note.id)}
                              className="delete-btn"
                              aria-label="Удалить заметку"
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