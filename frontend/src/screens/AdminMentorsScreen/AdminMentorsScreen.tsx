import React, { JSX, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../../services/ApiService';
import type {
  MentorApi,
  MentorCreatePayload,
  MentorAdminUpdatePayload,
} from '../../types/mentor';
import type { User } from '../../types/user';
import './AdminMentorsScreen.css';

const defaultCreateForm: MentorCreatePayload = {
  user_id: 0,
  name: '',
  description: '',
  gender: 'female',
  city: '',
  price: 0,
  yoga_style: '',
  rating: 0,
  experience_years: 0,
  photo_url: '',
  is_available: true,
};

const defaultEditForm: MentorAdminUpdatePayload = {
  name: '',
  description: '',
  gender: '',
  city: '',
  price: undefined,
  yoga_style: '',
  rating: undefined,
  experience_years: undefined,
  photo_url: '',
  is_available: undefined,
};

const AdminMentorsScreen = (): JSX.Element => {
  const [mentors, setMentors] = useState<MentorApi[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [createForm, setCreateForm] = useState<MentorCreatePayload>(defaultCreateForm);
  const [editForm, setEditForm] = useState<MentorAdminUpdatePayload>(defaultEditForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const [mentorData, userData] = await Promise.all([
          ApiService.getAdminMentors(),
          ApiService.getAdminUsers(),
        ]);

        setMentors(mentorData);
        setUsers(userData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleCreateChange = (
    field: keyof MentorCreatePayload,
    value: string | number | boolean
  ) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditChange = (
    field: keyof MentorAdminUpdatePayload,
    value: string | number | boolean
  ) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStartEdit = (mentor: MentorApi): void => {
    setEditingId(mentor.id as number);
    setEditForm({
      name: mentor.name,
      description: mentor.description,
      gender: mentor.gender,
      city: mentor.city,
      price: mentor.price,
      yoga_style: mentor.yoga_style,
      rating: mentor.rating,
      experience_years: mentor.experience_years,
      photo_url: mentor.photo_url ?? '',
      is_available: mentor.is_available,
    });
  };

  const clearMessages = (): void => {
    setError(null);
    setSuccess(null);
  };

  const refreshMentors = async (): Promise<void> => {
    const mentorData = await ApiService.getAdminMentors();
    setMentors(mentorData);
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();

    try {
      const createdMentor = await ApiService.createAdminMentor(createForm);
      setMentors((prev) => [createdMentor, ...prev]);
      setSuccess('Ментор создан');
      setCreateForm(defaultCreateForm);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка создания ментора');
    }
  };

  const handleSaveEdit = async (mentorId: number) => {
    clearMessages();
    try {
      const updatedMentor = await ApiService.updateAdminMentor(mentorId, editForm);
      setMentors((prev) =>
        prev.map((mentor) =>
          mentor.id === mentorId ? updatedMentor : mentor
        )
      );
      setSuccess('Профиль ментора обновлён');
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления ментора');
    }
  };

  const handleDelete = async (mentorId: number) => {
    if (!window.confirm('Удалить ментора?')) return;
    clearMessages();
    try {
      await ApiService.deleteAdminMentor(mentorId);
      setMentors((prev) => prev.filter((mentor) => mentor.id !== mentorId));
      setSuccess('Ментор удалён');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления ментора');
    }
  };

  const availableUsers = useMemo(
    () => users.filter((user) => user.role !== 'admin'),
    [users]
  );

  if (loading) {
    return <div className="admin-mentors-loading">Загрузка...</div>;
  }

  return (
    <div className="admin-mentors-page">
      <div className="admin-mentors-header">
        <h1>Управление менторами</h1>
        <Link to="/admin/dashboard" className="back-link">
          Назад в админку
        </Link>
      </div>

      {error && <div className="admin-mentors-error">⚠ {error}</div>}
      {success && <div className="admin-mentors-success">✅ {success}</div>}

      <section className="admin-mentor-create">
        <h2>Создать нового ментора</h2>
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <label>
              Пользователь
              <select
                value={createForm.user_id}
                onChange={(e) => handleCreateChange('user_id', Number(e.target.value))}
                required
              >
                <option value={0}>Выберите пользователя</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} ({user.username})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Имя ментора
              <input
                value={createForm.name}
                onChange={(e) => handleCreateChange('name', e.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Город
              <input
                value={createForm.city}
                onChange={(e) => handleCreateChange('city', e.target.value)}
                required
              />
            </label>
            <label>
              Стиль йоги
              <input
                value={createForm.yoga_style}
                onChange={(e) => handleCreateChange('yoga_style', e.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Цена
              <input
                type="number"
                min="0"
                value={createForm.price}
                onChange={(e) => handleCreateChange('price', Number(e.target.value))}
                required
              />
            </label>
            <label>
              Пол
              <select
                value={createForm.gender}
                onChange={(e) => handleCreateChange('gender', e.target.value)}
              >
                <option value="female">Женский</option>
                <option value="male">Мужской</option>
              </select>
            </label>
          </div>

          <label>
            Описание
            <textarea
              value={createForm.description}
              onChange={(e) => handleCreateChange('description', e.target.value)}
              required
            />
          </label>

          <button type="submit">Создать ментора</button>
        </form>
      </section>

      <section className="admin-mentors-list">
        <h2>Список менторов</h2>
        {mentors.length === 0 ? (
          <div className="empty-state">Менторы не найдены</div>
        ) : (
          <div className="mentors-table">
            <div className="table-header">
              <div>Имя</div>
              <div>Город</div>
              <div>Стиль</div>
              <div>Цена</div>
              <div>Статус</div>
              <div>Действия</div>
            </div>
            {mentors.map((mentor) => (
              <div key={mentor.id} className="mentor-row">
                {editingId === mentor.id ? (
                  <>
                    <input
                      value={editForm.name ?? ''}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                    />
                    <input
                      value={editForm.city ?? ''}
                      onChange={(e) => handleEditChange('city', e.target.value)}
                    />
                    <input
                      value={editForm.yoga_style ?? ''}
                      onChange={(e) => handleEditChange('yoga_style', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      value={editForm.price ?? 0}
                      onChange={(e) => handleEditChange('price', Number(e.target.value))}
                    />
                    <select
                      value={editForm.is_available ? 'true' : 'false'}
                      onChange={(e) => handleEditChange('is_available', e.target.value === 'true')}
                    >
                      <option value="true">Доступен</option>
                      <option value="false">Не доступен</option>
                    </select>
                    <div className="actions-cell">
                      <button onClick={() => void handleSaveEdit(mentor.id as number)}>
                        Сохранить
                      </button>
                      <button onClick={() => setEditingId(null)}>
                        Отмена
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>{mentor.name}</div>
                    <div>{mentor.city}</div>
                    <div>{mentor.yoga_style}</div>
                    <div>{mentor.price} ₽</div>
                    <div>{mentor.is_available ? 'Активен' : 'Неактивен'}</div>
                    <div className="actions-cell">
                      <button onClick={() => handleStartEdit(mentor)}>Изменить</button>
                      <button onClick={() => void handleDelete(mentor.id as number)}>
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminMentorsScreen;
