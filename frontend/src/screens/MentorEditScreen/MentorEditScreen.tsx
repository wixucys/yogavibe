import React, { JSX, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../../services/ApiService';
import type {
  MentorApi,
  MentorSelfUpdatePayload,
} from '../../types/mentor';
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

const MentorEditScreen = (): JSX.Element => {
  const [mentor, setMentor] = useState<MentorApi | null>(null);
  const [formData, setFormData] = useState<MentorSelfUpdatePayload>(defaultFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  if (loading) {
    return <div className="mentor-edit-loading">Загрузка профиля...</div>;
  }

  return (
    <div className="mentor-edit-page">
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

        <button type="submit" disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
};

export default MentorEditScreen;
