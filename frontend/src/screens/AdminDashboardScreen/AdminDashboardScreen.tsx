import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../../services/ApiService';
import type { AdminDashboard, User, UserRole } from '../../types/user';
import './AdminDashboardScreen.css';
import { ROUTES } from '../../constants/routes';

const AdminDashboardScreen = () => {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAdminData = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardResult, usersResult] = await Promise.allSettled([
          ApiService.getAdminDashboard(),
          ApiService.getAdminUsers(),
        ]);

        let hasAnySuccess = false;

        if (dashboardResult.status === 'fulfilled') {
          setDashboard(dashboardResult.value);
          hasAnySuccess = true;
        }

        if (usersResult.status === 'fulfilled') {
          setUsers(usersResult.value);
          hasAnySuccess = true;
        }

        if (!hasAnySuccess) {
          const dashboardMessage =
            dashboardResult.status === 'rejected'
              ? dashboardResult.reason instanceof Error
                ? dashboardResult.reason.message
                : 'Ошибка загрузки статистики'
              : '';

          const usersMessage =
            usersResult.status === 'rejected'
              ? usersResult.reason instanceof Error
                ? usersResult.reason.message
                : 'Ошибка загрузки пользователей'
              : '';

          setError([dashboardMessage, usersMessage].filter(Boolean).join('. '));
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Не удалось загрузить данные администратора'
        );
      } finally {
        setLoading(false);
      }
    };

    void loadAdminData();
  }, []);

  const refreshDashboard = async (): Promise<void> => {
    try {
      const dashboardData = await ApiService.getAdminDashboard();
      setDashboard(dashboardData);
    } catch (err: unknown) {
      console.warn('Не удалось обновить статистику администратора', err);
    }
  };

  const updateUser = async (
    userId: number,
    changes: Partial<User>
  ): Promise<void> => {
    try {
      setError(null);

      const updatedUser = await ApiService.updateAdminUser(userId, changes);

      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );

      await refreshDashboard();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось обновить данные пользователя'
      );
    }
  };

  const handleToggleActive = async (user: User): Promise<void> => {
    if (user.role === 'admin') {
      return;
    }

    await updateUser(user.id, { is_active: !user.is_active });
  };

  const handleToggleRole = async (user: User): Promise<void> => {
    if (user.role === 'admin') {
      return;
    }

    const nextRole: UserRole = user.role === 'mentor' ? 'user' : 'mentor';
    await updateUser(user.id, { role: nextRole });
  };

  const handleDeleteUser = async (user: User): Promise<void> => {
    if (user.role === 'admin') {
      return;
    }

    if (!window.confirm('Удалить пользователя без возможности восстановления?')) {
      return;
    }

    try {
      setError(null);

      await ApiService.deleteAdminUser(user.id);
      setUsers((prevUsers) => prevUsers.filter((item) => item.id !== user.id));
      await refreshDashboard();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Не удалось удалить пользователя'
      );
    }
  };

  const formatDate = (value?: string): string => {
    if (!value) {
      return 'Не указано';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 'Не указано'
      : date.toLocaleDateString('ru-RU');
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await ApiService.logout();
    } finally {
      window.location.href = ROUTES.auth.login;
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        Загрузка данных администратора...
      </div>
    );
  }

  if (error && !dashboard && users.length === 0) {
    return <div className="admin-dashboard-error">⚠ {error}</div>;
  }

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-header">
        <h1>Административная панель</h1>
        <button
          type="button"
          className="dashboard-logout-button"
          onClick={handleLogout}
        >
          Выйти
        </button>
      </div>

      {error ? <div className="admin-dashboard-error">⚠ {error}</div> : null}

      {dashboard ? (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <h3>Пользователей всего</h3>
              <p>{dashboard.total_users}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Активных</h3>
              <p>{dashboard.active_users}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Админов</h3>
              <p>{dashboard.admins_count}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Менторов</h3>
              <p>{dashboard.mentors_count}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Профилей менторов</h3>
              <p>{dashboard.mentor_profiles_count}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Записей</h3>
              <p>{dashboard.bookings_count}</p>
            </div>
          </div>

          <div className="admin-dashboard-actions">
            <Link to="/admin/mentors" className="admin-action-btn">
              Управление менторами
            </Link>
          </div>
        </>
      ) : null}

      <section className="admin-users-section">
        <div className="section-header">
          <h2>Список пользователей</h2>
          <span>
            {users.length}{' '}
            {users.length === 1 ? 'пользователь' : 'пользователей'}
          </span>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">Пользователи не найдены</div>
        ) : (
          <div className="admin-users-table">
            <div className="table-row table-header">
              <div>Email</div>
              <div>Роль</div>
              <div>Активен</div>
              <div>Город</div>
              <div>Дата регистрации</div>
              <div>Действия</div>
            </div>

            {users.map((user) => (
              <div key={user.id} className="table-row">
                <div>{user.email}</div>
                <div>{user.role}</div>
                <div>{user.is_active ? 'Да' : 'Нет'}</div>
                <div>{user.city || '—'}</div>
                <div>{formatDate(user.created_at)}</div>
                <div className="table-actions">
                  <button
                    type="button"
                    disabled={user.role === 'admin'}
                    onClick={() => void handleToggleRole(user)}
                  >
                    {user.role === 'mentor' ? 'Сделать user' : 'Сделать mentor'}
                  </button>

                  <button
                    type="button"
                    disabled={user.role === 'admin'}
                    onClick={() => void handleToggleActive(user)}
                  >
                    {user.is_active ? 'Деактивировать' : 'Активировать'}
                  </button>

                  <button
                    type="button"
                    disabled={user.role === 'admin'}
                    onClick={() => void handleDeleteUser(user)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboardScreen;