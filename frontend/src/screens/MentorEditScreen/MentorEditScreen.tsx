import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../../services/ApiService';
import FileService from '../../services/FileService';
import type {
  MentorApi,
  MentorSelfUpdatePayload,
} from '../../types/mentor';
import type { FileAttachment } from '../../types/file';
import './MentorEditScreen.css';

const defaultFormData: MentorSelfUpdatePayload = {
  name: '',
  description: '',
  gender: '',
  city: '',
  yoga_style: '',
  price: undefined,
  experience_years: undefined,
  photo_url: '',
  is_available: true,
};

const MentorEditScreen = () => {
  const certificateInputRef = useRef<HTMLInputElement | null>(null);

  const [mentor, setMentor] = useState<MentorApi | null>(null);
  const [formData, setFormData] = useState<MentorSelfUpdatePayload>(defaultFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [certificateFiles, setCertificateFiles] = useState<FileAttachment[]>([]);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadMentor = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const data = await ApiService.getMyMentorProfile();
        setMentor(data);
        setFormData({
          name: data.name,
          description: data.description,
          gender: data.gender,
          city: data.city,
          yoga_style: data.yoga_style,
          price: data.price,
          experience_years: data.experience_years,
          photo_url: data.photo_url || '',
          is_available: data.is_available,
        });

        try {
          const files = await FileService.listFiles('mentor', 'certificate');
          setCertificateFiles(files);
        } catch (fileError) {
          console.warn('Не удалось загрузить сертификаты ментора:', fileError);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    };

    void loadMentor();
  }, []);

  const handleChange = (
    field: keyof MentorSelfUpdatePayload,
    value: string | number | boolean
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await ApiService.updateMyMentorProfile(formData);
      setSuccess('Профиль успешно обновлён');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleCertificateUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploadingCertificate(true);

    try {
      const uploadedFile = await FileService.uploadFile(
        'mentor',
        file,
        'certificate'
      );
      setCertificateFiles((prev) => [uploadedFile, ...prev]);
      setSuccess('Файл сертификата загружен');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл');
    } finally {
      setUploadingCertificate(false);

      if (certificateInputRef.current) {
        certificateInputRef.current.value = '';
      }
    }
  };

  const handleDeleteCertificate = async (fileId: number): Promise<void> => {
    if (!window.confirm('Удалить файл сертификата?')) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await FileService.deleteFile('mentor', fileId);
      setCertificateFiles((prev) => prev.filter((file) => file.id !== fileId));
      setSuccess('Файл удалён');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить файл');
    }
  };

  if (loading) {
    return <div className="mentor-edit-loading">Загрузка профиля...</div>;
  }

  return (
    <div className="mentor-edit-page">
      <div className="page-inner">
        <div className="mentor-edit-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            Назад
          </button>
          <h1>Редактирование профиля ментора</h1>
        </div>

        {error && <div className="mentor-edit-error">⚠ {error}</div>}
        {success && <div className="mentor-edit-success">✅ {success}</div>}

        <form className="mentor-edit-form" onSubmit={handleSubmit}>
        <label>
          Имя
          <input
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </label>

        <label>
          Описание
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            required
          />
        </label>

        <label>
          Пол
          <select
            value={formData.gender || ''}
            onChange={(e) => handleChange('gender', e.target.value)}
            required
          >
            <option value="">Выберите</option>
            <option value="female">Женский</option>
            <option value="male">Мужской</option>
          </select>
        </label>

        <label>
          Город
          <input
            value={formData.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            required
          />
        </label>

        <label>
          Стиль йоги
          <input
            value={formData.yoga_style || ''}
            onChange={(e) => handleChange('yoga_style', e.target.value)}
            required
          />
        </label>

        <label>
          Цена в рублях
          <input
            type="number"
            min="0"
            value={formData.price ?? ''}
            onChange={(e) => handleChange('price', Number(e.target.value))}
            required
          />
        </label>

        <label>
          Опыт в годах
          <input
            type="number"
            min="0"
            value={formData.experience_years ?? ''}
            onChange={(e) => handleChange('experience_years', Number(e.target.value))}
          />
        </label>

        <label>
          Ссылка на фото
          <input
            value={formData.photo_url || ''}
            onChange={(e) => handleChange('photo_url', e.target.value)}
          />
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formData.is_available ?? false}
            onChange={(e) => handleChange('is_available', e.target.checked)}
          />
          Доступен для бронирований
        </label>

        <div className="mentor-files-section">
          <div className="mentor-files-header">
            <h2>Сертификаты и документы</h2>
            <p>Можно загрузить PDF или изображение сертификата до 10 МБ</p>
          </div>

          <input
            ref={certificateInputRef}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
            className="mentor-hidden-file-input"
            onChange={handleCertificateUpload}
            disabled={uploadingCertificate}
          />

          <button
            type="button"
            className="mentor-upload-file-btn"
            onClick={() => certificateInputRef.current?.click()}
            disabled={uploadingCertificate}
          >
            {uploadingCertificate ? 'Загрузка...' : 'Добавить сертификат'}
          </button>

          {certificateFiles.length === 0 ? (
            <div className="mentor-files-empty">Сертификаты пока не загружены</div>
          ) : (
            <div className="mentor-files-list">
              {certificateFiles.map((file) => (
                <div key={file.id} className="mentor-file-item">
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mentor-file-link"
                  >
                    {file.originalFilename}
                  </a>
                  <div className="mentor-file-meta">
                    <span>{FileService.formatFileSize(file.sizeBytes)}</span>
                    <span>{new Date(file.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <button
                    type="button"
                    className="mentor-delete-file-btn"
                    onClick={() => {
                      void handleDeleteCertificate(file.id);
                    }}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
      </div>
    </div>
  );
};

export default MentorEditScreen;
