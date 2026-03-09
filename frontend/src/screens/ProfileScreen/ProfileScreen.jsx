import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import UserService from '../../services/UserService';
import AuthService from '../../services/AuthService';
import './ProfileScreen.css';

// Константы для полей профиля
const BACKEND_FIELDS = ['city', 'yoga_style', 'experience', 'goals'];
const READONLY_FIELDS = ['username'];
const TEXTAREA_FIELDS = ['goals', 'healthInfo', 'contactInfo', 'knownStyles', 'communicationStyle', 'mentorPreferences', 'additionalInfo'];

// Метаданные полей для лучшей организации
const FIELD_CONFIGS = {
  username: { label: 'Имя пользователя', type: 'readonly', section: 'ОБО МНЕ' },
  age: { label: 'Возраст', type: 'local', section: 'ОБО МНЕ' },
  city: { label: 'Город', type: 'backend', section: 'ОБО МНЕ' },
  contactInfo: { label: 'Контактные данные', type: 'local', section: 'ОБО МНЕ', textarea: true },
  experience: { label: 'Стаж практики', type: 'backend', section: 'ОПЫТ В ЙОГЕ' },
  knownStyles: { label: 'Знакомые стили', type: 'local', section: 'ОПЫТ В ЙОГЕ', textarea: true },
  yoga_style: { label: 'Предпочитаемый стиль', type: 'backend', section: 'ОПЫТ В ЙОГЕ' },
  goals: { label: 'Основные цели', type: 'backend', section: 'ЦЕЛИ И ЗАПРОСЫ', textarea: true },
  healthInfo: { label: 'Состояние здоровья', type: 'local', section: 'ЦЕЛИ И ЗАПРОСЫ', textarea: true },
  preferredFormat: { label: 'Формат занятий', type: 'local', section: 'ФОРМАТ РАБОТЫ' },
  meetingFrequency: { label: 'Частота встреч', type: 'local', section: 'ФОРМАТ РАБОТЫ' },
  mentorshipDuration: { label: 'Срок работы', type: 'local', section: 'ФОРМАТ РАБОТЫ' },
  communicationStyle: { label: 'Стиль общения', type: 'local', section: 'ПРЕДПОЧТЕНИЯ', textarea: true },
  mentorPreferences: { label: 'Требования к ментору', type: 'local', section: 'ПРЕДПОЧТЕНИЯ', textarea: true },
  additionalInfo: { label: 'Дополнительная информация', type: 'local', section: 'ДОПОЛНИТЕЛЬНО', textarea: true }
};

// Максимальный размер файла фото (5MB)
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const ProfileScreen = ({ user, onUpdateProfile }) => {
  const fileInputRef = useRef(null);
  
  // Основное состояние профиля
  const [profile, setProfile] = useState({
    // Бэкендные поля
    city: '',
    yoga_style: '',
    experience: '',
    goals: '',
    username: '',
    
    // Локальные поля
    age: '',
    contactInfo: '',
    knownStyles: '',
    healthInfo: '',
    preferredFormat: '',
    meetingFrequency: '',
    mentorshipDuration: '',
    communicationStyle: '',
    mentorPreferences: '',
    additionalInfo: '',
    photo: null
  });

  // UI состояния
  const [currentUser, setCurrentUser] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка профиля
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userId = user?.id || AuthService.getCurrentUser()?.id;
      if (!userId) {
        throw new Error('Пользователь не найден');
      }

      // Загрузка данных
      let serverProfile = {};
      try {
        serverProfile = await UserService.getProfile();
      } catch (serverError) {
        console.warn('Не удалось загрузить профиль с сервера:', serverError);
      }

      // getLocalProfile - СИНХРОННЫЙ метод
      let localProfile = {};
      try {
        localProfile = UserService.getLocalProfile(userId);
      } catch (localError) {
        console.warn('Не удалось загрузить локальный профиль:', localError);
      }

      setCurrentUser(serverProfile || {});

      // Создаем объединенный профиль
      const mergedProfile = {
        city: serverProfile?.city || '',
        yoga_style: serverProfile?.yoga_style || '',
        experience: serverProfile?.experience || '',
        goals: serverProfile?.goals || '',
        username: serverProfile?.username || '',
        
        age: localProfile?.age || '',
        contactInfo: localProfile?.contactInfo || '',
        knownStyles: localProfile?.knownStyles || '',
        healthInfo: localProfile?.healthInfo || '',
        preferredFormat: localProfile?.preferredFormat || '',
        meetingFrequency: localProfile?.meetingFrequency || '',
        mentorshipDuration: localProfile?.mentorshipDuration || '',
        communicationStyle: localProfile?.communicationStyle || '',
        mentorPreferences: localProfile?.mentorPreferences || '',
        additionalInfo: localProfile?.additionalInfo || '',
        photo: localProfile?.photo || null
      };

      setProfile(mergedProfile);
      
      if (localProfile?.photo) {
        setPhotoPreview(localProfile.photo);
      }
      
    } catch (error) {
      console.error('ProfileScreen: Error loading profile:', error);
      setError('Ошибка загрузки профиля. Проверьте подключение к интернету.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Обработка редактирования полей
  const startEditing = (fieldName, currentValue) => {
    if (READONLY_FIELDS.includes(fieldName)) {
      alert('Это поле нельзя изменить');
      return;
    }
    setEditingField(fieldName);
    setTempValue(currentValue || '');
  };

  const saveField = useCallback(async () => {
    if (!editingField) return;

    const fieldName = editingField;
    const newValue = tempValue.trim();

    // Обновляем состояние
    setProfile(prev => ({
      ...prev,
      [fieldName]: newValue
    }));

    setEditingField(null);
    setTempValue('');

    try {
      const userId = user?.id || AuthService.getCurrentUser()?.id;
      
      if (!userId) {
        throw new Error('Пользователь не найден');
      }
      
      if (BACKEND_FIELDS.includes(fieldName)) {
        // Сохраняем в бэкенд
        const backendData = { [fieldName]: newValue || null };
        const updatedUser = await UserService.updateProfile(backendData);
        if (updatedUser) {
          setCurrentUser(prev => ({ ...prev, ...backendData }));
        }
      } else {
        // Сохраняем локально (синхронно)
        UserService.saveLocalProfile(userId, { [fieldName]: newValue });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error(`Error saving field ${fieldName}:`, error);
      setError('Ошибка сохранения. Попробуйте еще раз.');
    }
  }, [editingField, tempValue, user]);

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveField();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  }, [saveField]);

  // Работа с фото
  const validatePhotoFile = (file) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error('Пожалуйста, выберите изображение (JPG, PNG, GIF, WebP)');
    }

    if (file.size > MAX_PHOTO_SIZE) {
      throw new Error(`Файл слишком большой. Максимальный размер ${MAX_PHOTO_SIZE / 1024 / 1024}MB`);
    }

    return true;
  };

  const handlePhotoUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      validatePhotoFile(file);
      setIsUploadingPhoto(true);

      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setPhotoPreview(base64String);
      setProfile(prev => ({ ...prev, photo: base64String }));

      const userId = user?.id || AuthService.getCurrentUser()?.id;
      if (userId) {
        UserService.saveProfilePhoto(userId, base64String); // Синхронно
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsUploadingPhoto(false);
      // Сбрасываем input для возможности повторной загрузки того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [user]);

  const removePhoto = useCallback(() => {
    if (!window.confirm('Удалить фото профиля?')) return;

    setPhotoPreview(null);
    setProfile(prev => ({ ...prev, photo: null }));

    const userId = user?.id || AuthService.getCurrentUser()?.id;
    if (userId) {
      UserService.saveProfilePhoto(userId, null); // Синхронно
    }
  }, [user]);

  // Сохранение всех данных
  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const userId = user?.id || AuthService.getCurrentUser()?.id;
      if (!userId) {
        throw new Error('Пользователь не найден');
      }

      // Разделяем данные для бэкенда и локального хранилища
      const backendData = {};
      const localData = {};

      Object.entries(profile).forEach(([key, value]) => {
        if (BACKEND_FIELDS.includes(key)) {
          backendData[key] = value || null;
        } else if (key !== 'username' && key !== 'photo') {
          localData[key] = value;
        }
      });

      // Сохраняем локальные данные (синхронно)
      try {
        if (Object.keys(localData).length > 0) {
          UserService.saveLocalProfile(userId, localData);
        }
        
        // Сохраняем фото (синхронно)
        if (profile.photo !== null) {
          UserService.saveProfilePhoto(userId, profile.photo);
        }
      } catch (localError) {
        console.warn('Ошибка сохранения локальных данных:', localError);
      }

      // Сохраняем бэкендные данные (асинхронно)
      let updatedUser = null;
      if (Object.keys(backendData).length > 0) {
        try {
          updatedUser = await UserService.updateProfile(backendData);
        } catch (backendError) {
          console.error('Ошибка сохранения на сервере:', backendError);
          throw backendError;
        }
      }

      if (updatedUser) {
        setCurrentUser(prev => ({ ...prev, ...backendData }));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (onUpdateProfile && currentUser?.id) {
        onUpdateProfile(currentUser.id, backendData);
      }
    } catch (error) {
      console.error('ProfileScreen: Error saving all:', error);
      setError('Ошибка сохранения. Проверьте подключение к интернету.');
    } finally {
      setIsSaving(false);
    }
  }, [profile, currentUser, user, onUpdateProfile]);

  // Группировка полей по секциям
  const groupedFields = useMemo(() => {
    const groups = {};
    
    Object.entries(FIELD_CONFIGS).forEach(([fieldName, config]) => {
      if (!groups[config.section]) {
        groups[config.section] = [];
      }
      groups[config.section].push({
        name: fieldName,
        label: config.label,
        type: config.type,
        isTextArea: config.textarea || false
      });
    });
    
    return groups;
  }, []);

  // Рендер поля
  const renderField = useCallback((field) => {
    const { name, label, isTextArea, type } = field;
    const value = profile[name];
    const isEditing = editingField === name;
    const isReadOnly = READONLY_FIELDS.includes(name);
    
    if (isReadOnly) {
      return (
        <div className="profile-field" key={name}>
          <div className="field-header">
            <label className="field-label">
              {label}:
              <span className="read-only-badge" title="Нельзя изменить">🔒</span>
            </label>
          </div>
          <div className="field-value read-only">
            {value || 'Не указано'}
          </div>
        </div>
      );
    }
    
    return (
      <div className="profile-field" key={name}>
        <div className="field-header">
          <label className="field-label">
            {label}:
            {type === 'backend' && (
              <span className="backend-badge" title="Синхронизируется с сервером">🌐</span>
            )}
          </label>
          {!isEditing && value && (
            <button 
              className="profile-edit-btn"
              onClick={() => startEditing(name, value)}
              aria-label={`Редактировать ${label.toLowerCase()}`}
            >
              ✎
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="edit-container">
            {isTextArea ? (
              <textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="profile-textarea"
                rows="3"
                autoFocus
                placeholder={`Введите ${label.toLowerCase()}`}
                maxLength={1000}
              />
            ) : (
              <input
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="profile-input"
                autoFocus
                placeholder={`Введите ${label.toLowerCase()}`}
                maxLength={100}
              />
            )}
            <div className="edit-actions">
              <button 
                className="save-small-btn"
                onClick={saveField}
                disabled={isSaving}
                aria-label="Сохранить"
              >
                ✓
              </button>
              <button 
                className="cancel-small-btn"
                onClick={cancelEditing}
                aria-label="Отмена"
              >
                ✕
              </button>
            </div>
          </div>
        ) : value ? (
          <div className="field-value">
            {value}
          </div>
        ) : (
          <button 
            className="add-btn"
            onClick={() => startEditing(name, '')}
            aria-label={`Добавить ${label.toLowerCase()}`}
          >
            + Добавить
          </button>
        )}
      </div>
    );
  }, [profile, editingField, tempValue, isSaving, saveField, cancelEditing, handleKeyDown]);

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Загрузка профиля...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-content">
        <div className="profile-card">
          {error && (
            <div className="error-message" role="alert">
              ⚠️ {error}
            </div>
          )}
          
          <div className="profile-layout">
            {/* Левая колонка - фото и личная информация */}
            <div className="profile-left">
              <div className="photo-section">
                <button 
                  className={`photo-placeholder ${photoPreview ? 'has-photo' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  disabled={isUploadingPhoto}
                  aria-label="Изменить фото профиля"
                >
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Фото профиля" 
                      className="profile-photo"
                      loading="lazy"
                    />
                  ) : (
                    <div className="photo-text">
                      <div className="camera-icon">📷</div>
                      <div>Добавить фото</div>
                    </div>
                  )}
                  <div className="photo-overlay">
                    <span className="upload-text">
                      {isUploadingPhoto ? 'Загрузка...' : 'Изменить фото'}
                    </span>
                  </div>
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  className="file-input"
                  disabled={isUploadingPhoto}
                  aria-label="Выберите фото профиля"
                />
                
                <div className="photo-actions">
                  {photoPreview && (
                    <button 
                      className="remove-btn"
                      onClick={removePhoto}
                      disabled={isUploadingPhoto}
                      type="button"
                    >
                      {isUploadingPhoto ? 'Загрузка...' : 'Удалить фото'}
                    </button>
                  )}
                </div>
                
                <div className="photo-hint">
                  JPG, PNG, GIF, WebP до 5MB
                </div>
              </div>
            </div>

            {/* Правая колонка - поля анкеты */}
            <div className="profile-right">
              <div className="sections-container">
                {Object.entries(groupedFields).map(([sectionTitle, fields]) => (
                  <div className="profile-section" key={sectionTitle}>
                    <h3>{sectionTitle}</h3>
                    {fields.map(renderField)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="profile-footer">
            <div className="footer-actions">
              <div className="save-section">
                <button 
                  className="save-btn" 
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  type="button"
                  aria-label="Сохранить все изменения"
                >
                  {isSaving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ ВСЁ'}
                </button>
                {saveSuccess && (
                  <div className="save-success" role="status">
                    ✓ Изменения сохранены
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ProfileScreen.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    username: PropTypes.string
  }),
  onUpdateProfile: PropTypes.func
};

ProfileScreen.defaultProps = {
  user: null,
  onUpdateProfile: () => {}
};

export default ProfileScreen;