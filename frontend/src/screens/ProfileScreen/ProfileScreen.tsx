import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import UserService from '../../services/UserService';
import AuthService from '../../services/AuthService';
import type { User } from '../../services/AuthService';
import './ProfileScreen.css';

// Константы для полей профиля
const BACKEND_FIELDS = ['city', 'yoga_style', 'experience', 'goals'] as const;
const READONLY_FIELDS = ['username'] as const;

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
  additionalInfo: { label: 'Дополнительная информация', type: 'local', section: 'ДОПОЛНИТЕЛЬНО', textarea: true },
} as const;

// Максимальный размер файла фото (5MB)
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

type BackendField = (typeof BACKEND_FIELDS)[number];
type ReadonlyField = (typeof READONLY_FIELDS)[number];
type FieldName = keyof typeof FIELD_CONFIGS;
type FieldType = 'readonly' | 'local' | 'backend';

interface ProfileState {
  city: string;
  yoga_style: string;
  experience: string;
  goals: string;
  username: string;
  age: string;
  contactInfo: string;
  knownStyles: string;
  healthInfo: string;
  preferredFormat: string;
  meetingFrequency: string;
  mentorshipDuration: string;
  communicationStyle: string;
  mentorPreferences: string;
  additionalInfo: string;
  photo: string | null;
}

interface ProfileScreenProps {
  user?: User | null;
  onUpdateProfile?: (userId: string | number, data: Partial<ProfileState>) => void;
}

interface FieldConfigItem {
  label: string;
  type: FieldType;
  section: string;
  textarea?: boolean;
}

interface GroupedField {
  name: FieldName;
  label: string;
  type: FieldType;
  isTextArea: boolean;
}

type GroupedFields = Record<string, GroupedField[]>;

type ServerProfile = Partial<User>;

type LocalProfile = Partial<ProfileState>;

interface FileReaderError extends Error {
  [key: string]: unknown;
}

const ProfileScreen = ({
  user = null,
  onUpdateProfile = () => {},
}: ProfileScreenProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<ProfileState>({
    city: '',
    yoga_style: '',
    experience: '',
    goals: '',
    username: '',
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
    photo: null,
  });

  const [currentUser, setCurrentUser] = useState<ServerProfile | null>(null);
  const [editingField, setEditingField] = useState<FieldName | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = user?.id || AuthService.getCurrentUser()?.id;

      if (!userId) {
        throw new Error('Пользователь не найден');
      }

      let serverProfile: ServerProfile = {};

      try {
        serverProfile = (await UserService.getProfile()) as ServerProfile;
      } catch (serverError) {
        console.warn('Не удалось загрузить профиль с сервера:', serverError);
      }

      let localProfile: LocalProfile = {};

      try {
        localProfile = (UserService.getLocalProfile(userId) as LocalProfile) || {};
      } catch (localError) {
        console.warn('Не удалось загрузить локальный профиль:', localError);
      }

      setCurrentUser(serverProfile || {});

      const mergedProfile: ProfileState = {
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
        photo: localProfile?.photo || null,
      };

      setProfile(mergedProfile);

      if (localProfile?.photo) {
        setPhotoPreview(localProfile.photo);
      }
    } catch (error: unknown) {
      console.error('ProfileScreen: Error loading profile:', error);
      setError('Ошибка загрузки профиля. Проверьте подключение к интернету.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const startEditing = (fieldName: FieldName, currentValue: string | null | undefined): void => {
    if (READONLY_FIELDS.includes(fieldName as ReadonlyField)) {
      window.alert('Это поле нельзя изменить');
      return;
    }

    setEditingField(fieldName);
    setTempValue(currentValue || '');
  };

  const saveField = useCallback(async (): Promise<void> => {
    if (!editingField) return;

    const fieldName = editingField;
    const newValue = tempValue.trim();

    setProfile((prev) => ({
      ...prev,
      [fieldName]: newValue,
    }));

    setEditingField(null);
    setTempValue('');

    try {
      const userId = user?.id || AuthService.getCurrentUser()?.id;

      if (!userId) {
        throw new Error('Пользователь не найден');
      }

      if (BACKEND_FIELDS.includes(fieldName as BackendField)) {
        const backendData = { [fieldName]: newValue || null };
        const updatedUser = await UserService.updateProfile(backendData);

        if (updatedUser) {
          setCurrentUser((prev) => ({
            ...(prev || {}),
            ...backendData,
          }));
        }
      } else {
        UserService.saveLocalProfile(userId, { [fieldName]: newValue });
      }

      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: unknown) {
      console.error(`Error saving field ${fieldName}:`, error);
      setError('Ошибка сохранения. Попробуйте еще раз.');
    }
  }, [editingField, tempValue, user]);

  const cancelEditing = (): void => {
    setEditingField(null);
    setTempValue('');
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void saveField();
      } else if (e.key === 'Escape') {
        cancelEditing();
      }
    },
    [saveField]
  );

  const validatePhotoFile = (file: File): true => {
    if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
      throw new Error('Пожалуйста, выберите изображение (JPG, PNG, GIF, WebP)');
    }

    if (file.size > MAX_PHOTO_SIZE) {
      throw new Error(
        `Файл слишком большой. Максимальный размер ${MAX_PHOTO_SIZE / 1024 / 1024}MB`
      );
    }

    return true;
  };

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        validatePhotoFile(file);
        setIsUploadingPhoto(true);

        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Не удалось прочитать файл'));
            }
          };

          reader.onerror = () => {
            reject(new Error('Ошибка чтения файла'));
          };

          reader.readAsDataURL(file);
        });

        setPhotoPreview(base64String);
        setProfile((prev) => ({ ...prev, photo: base64String }));

        const userId = user?.id || AuthService.getCurrentUser()?.id;
        if (userId) {
          UserService.saveProfilePhoto(userId, base64String);
        }

        setSaveSuccess(true);
        window.setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Ошибка при загрузке изображения';
        window.alert(message);
      } finally {
        setIsUploadingPhoto(false);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [user]
  );

  const removePhoto = useCallback((): void => {
    if (!window.confirm('Удалить фото профиля?')) return;

    setPhotoPreview(null);
    setProfile((prev) => ({ ...prev, photo: null }));

    const userId = user?.id || AuthService.getCurrentUser()?.id;
    if (userId) {
      UserService.saveProfilePhoto(userId, null);
    }
  }, [user]);

  const handleSaveAll = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError(null);

    try {
      const userId = user?.id || AuthService.getCurrentUser()?.id;

      if (!userId) {
        throw new Error('Пользователь не найден');
      }

      const backendData: Partial<ProfileState> = {};
      const localData: Partial<ProfileState> = {};

      Object.entries(profile).forEach(([key, value]) => {
        if (BACKEND_FIELDS.includes(key as BackendField)) {
          (backendData as Record<string, unknown>)[key] = value || null;
        } else if (key !== 'username' && key !== 'photo') {
          (localData as Record<string, unknown>)[key] = value;
        }
      });

      try {
        if (Object.keys(localData).length > 0) {
          UserService.saveLocalProfile(userId, localData);
        }

        if (profile.photo !== null) {
          UserService.saveProfilePhoto(userId, profile.photo);
        }
      } catch (localError) {
        console.warn('Ошибка сохранения локальных данных:', localError);
      }

      let updatedUser: unknown = null;

      if (Object.keys(backendData).length > 0) {
        try {
          updatedUser = await UserService.updateProfile(backendData);
        } catch (backendError) {
          console.error('Ошибка сохранения на сервере:', backendError);
          throw backendError;
        }
      }

      if (updatedUser) {
        setCurrentUser((prev) => ({
          ...(prev || {}),
          ...backendData,
        }));
      }

      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3000);

      if (currentUser?.id) {
        onUpdateProfile(currentUser.id, backendData);
      }
    } catch (error: unknown) {
      console.error('ProfileScreen: Error saving all:', error);
      setError('Ошибка сохранения. Проверьте подключение к интернету.');
    } finally {
      setIsSaving(false);
    }
  }, [profile, currentUser, user, onUpdateProfile]);

  const groupedFields = useMemo<GroupedFields>(() => {
    const groups: GroupedFields = {};

    Object.entries(FIELD_CONFIGS).forEach(([fieldName, config]) => {
      const typedConfig = config as FieldConfigItem;
      const section = typedConfig.section;

      if (!groups[section]) {
        groups[section] = [];
      }

      groups[section].push({
        name: fieldName as FieldName,
        label: typedConfig.label,
        type: typedConfig.type,
        isTextArea: typedConfig.textarea || false,
      });
    });

    return groups;
  }, []);

  const renderField = useCallback(
    (field: GroupedField) => {
      const { name, label, isTextArea, type } = field;
      const value = profile[name];
      const isEditing = editingField === name;
      const isReadOnly = READONLY_FIELDS.includes(name as ReadonlyField);

      if (isReadOnly) {
        return (
          <div className="profile-field" key={name}>
            <div className="field-header">
              <label className="field-label">
                {label}:
                <span className="read-only-badge" title="Нельзя изменить">
                  🔒
                </span>
              </label>
            </div>
            <div className="field-value read-only">{value || 'Не указано'}</div>
          </div>
        );
      }

      return (
        <div className="profile-field" key={name}>
          <div className="field-header">
            <label className="field-label">
              {label}:
              {type === 'backend' && (
                <span
                  className="backend-badge"
                  title="Синхронизируется с сервером"
                >
                  🌐
                </span>
              )}
            </label>

            {!isEditing && value && (
              <button
                className="profile-edit-btn"
                onClick={() => startEditing(name, value)}
                aria-label={`Редактировать ${label.toLowerCase()}`}
                type="button"
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
                  rows={3}
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
                  onClick={() => {
                    void saveField();
                  }}
                  disabled={isSaving}
                  aria-label="Сохранить"
                  type="button"
                >
                  ✓
                </button>
                <button
                  className="cancel-small-btn"
                  onClick={cancelEditing}
                  aria-label="Отмена"
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : value ? (
            <div className="field-value">{value}</div>
          ) : (
            <button
              className="add-btn"
              onClick={() => startEditing(name, '')}
              aria-label={`Добавить ${label.toLowerCase()}`}
              type="button"
            >
              + Добавить
            </button>
          )}
        </div>
      );
    },
    [profile, editingField, tempValue, isSaving, saveField, handleKeyDown]
  );

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

                <div className="photo-hint">JPG, PNG, GIF, WebP до 5MB</div>
              </div>
            </div>

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
                  onClick={() => {
                    void handleSaveAll();
                  }}
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

export default ProfileScreen;