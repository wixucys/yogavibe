import React, { useEffect, useMemo, useState } from 'react';
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

const AdminMentorsScreen = () => {
  const [mentors, setMentors] = useState<MentorApi[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [createForm, setCreateForm] = useState<MentorCreatePayload>(defaultCreateForm);
  const [editForm, setEditForm] = useState<MentorAdminUpdatePayload>(defaultEditForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const [mentorsResult, usersResult] = await Promise.allSettled([
          ApiService.getAdminMentors(),
          ApiService.getAdminUsers(),
        ]);

        let hasAnySuccess = false;

        if (mentorsResult.status === 'fulfilled') {
          setMentors(mentorsResult.value);
          hasAnySuccess = true;
        }

        if (usersResult.status === 'fulfilled') {
          setUsers(usersResult.value);
          hasAnySuccess = true;
        }

        if (!hasAnySuccess) {
          const mentorsMessage =
            mentorsResult.status === 'rejected'
              ? mentorsResult.reason instanceof Error
                ? mentorsResult.reason.message
                : 'Ошибка загрузки менторов'
              : '';

          const usersMessage =
            usersResult.status === 'rejected'
              ? usersResult.reason instanceof Error
                ? usersResult.reason.message
                : 'Ошибка загрузки пользователей'
              : '';

          setError([mentorsMessage, usersMessage].filter(Boolean).join('. '));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const clearMessages = (): void => {
    setError(null);
    setSuccess(null);
  };

  const handleCreateChange = (
    field: keyof MentorCreatePayload,
    value: string | number | boolean
  ): void => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditChange = (
    field: keyof MentorAdminUpdatePayload,
    value: string | number | boolean
  ): void => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStartEdit = (mentor: MentorApi): void => {
    setEditingId(Number(mentor.id));
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

  const handleCancelEdit = (): void => {
    setEditingId(null);
    setEditForm(defaultEditForm);
  };

  const refreshMentors = async (): Promise<void> => {
    const mentorData = await ApiService.getAdminMentors();
    setMentors(mentorData);
  };

  const handleCreate = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    clearMessages();

    if (!createForm.user_id) {
      setError('Выберите пользователя для профиля ментора');
      return;
    }

    try {
      const createdMentor = await ApiService.createAdminMentor(createForm);
      setMentors((prev) => [createdMentor, ...prev]);
      setSuccess('Ментор создан');
      setCreateForm(defaultCreateForm);
      await refreshMentors();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка создания ментора');
    }
  };

  const handleSaveEdit = async (mentorId: number): Promise<void> => {
    clearMessages();

    try {
      const updatedMentor = await ApiService.updateAdminMentor(mentorId, editForm);

      setMentors((prev) =>
        prev.map((mentor) => (mentor.id === mentorId ? updatedMentor : mentor))
      );

      setSuccess('Профиль ментора обновлён');
      setEditingId(null);
      setEditForm(defaultEditForm);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления ментора');
    }
  };

  const handleDelete = async (mentorId: number): Promise<void> => {
    if (!window.confirm('Удалить ментора?')) {
      return;
    }

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
    () =>
      users.filter(
        (user) =>
          user.role === 'mentor' &&
          !mentors.some((mentor) => mentor.user_id === user.id)
      ),
    [users, mentors]
  );

  if (loading) {
    return <div className="admin-mentors-loading">Загрузка...</div>;
  }

  if (error && mentors.length === 0 && users.length === 0) {
    return <div className="admin-mentors-error">⚠ {error}</div>;
  }

  return (
    <div className="admin-mentors-page">
      <div className="admin-mentors-header">
        <h1>Управление менторами</h1>
        <Link to="/admin/dashboard" className="back-link">
          Назад в админку
        </Link>
      </div>

      {error ? <div className="admin-mentors-error">⚠ {error}</div> : null}
      {success ? <div className="admin-mentors-success">✅ {success}</div> : null}

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
                type="text"
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
                type="text"
                value={createForm.city}
                onChange={(e) => handleCreateChange('city', e.target.value)}
                required
              />
            </label>

            <label>
              Стиль йоги
              <input
                type="text"
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
                      type="text"
                      value={editForm.name ?? ''}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                    />

                    <input
                      type="text"
                      value={editForm.city ?? ''}
                      onChange={(e) => handleEditChange('city', e.target.value)}
                    />

                    <input
                      type="text"
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
                      value={editForm.is_available === false ? 'false' : 'true'}
                      onChange={(e) =>
                        handleEditChange('is_available', e.target.value === 'true')
                      }
                    >
                      <option value="true">Доступен</option>
                      <option value="false">Не доступен</option>
                    </select>

                    <div className="actions-cell">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(Number(mentor.id))}
                      >
                        Сохранить
                      </button>
                      <button type="button" onClick={handleCancelEdit}>
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
                      <button type="button" onClick={() => handleStartEdit(mentor)}>
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(Number(mentor.id))}
                      >
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