import React, { JSX, useEffect, useState } from 'react';import { Link } from 'react-router-dom';import ApiService from '../../services/ApiService';
import type { MentorApi } from '../../types/mentor';
import type { Booking, BookingResponse } from '../../types/booking';
import './MentorDashboardScreen.css';

const MentorDashboardScreen = (): JSX.Element => {
  const [mentor, setMentor] = useState<MentorApi | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeBooking = (booking: BookingResponse): Booking => ({
    id: booking.id,
    mentorId: booking.mentor_id,
    userId: booking.user_id,
    mentorName: booking.mentor?.name || 'Неизвестный ментор',
    mentorCity: booking.mentor?.city,
    mentorYogaStyle: booking.mentor?.yoga_style,
    sessionDate: booking.session_date,
    durationMinutes: booking.duration_minutes,
    price: booking.price,
    status: booking.status || 'active',
    notes: booking.notes,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    sessionType: booking.session_type || 'individual',
  });

  useEffect(() => {
    const loadMentorDashboard = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const [mentorData, mentorBookings] = await Promise.all([
          ApiService.request<MentorApi>('/mentor/me'),
          ApiService.request<BookingResponse[]>('/mentor/bookings'),
        ]);

        setMentor(mentorData);
        setBookings(mentorBookings.map(normalizeBooking));
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Не удалось загрузить данные ментора'
        );
      } finally {
        setLoading(false);
      }
    };

    void loadMentorDashboard();
  }, []);

  const formatDate = (value: string | undefined): string => {
    if (!value) return 'Не указано';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Не указано';

    return date.toLocaleString('ru-RU');
  };

  if (loading) {
    return <div className="mentor-dashboard-loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="mentor-dashboard-error">⚠ {error}</div>;
  }

  return (
    <div className="mentor-dashboard-page">
      <div className="mentor-dashboard-header">
        <h1>Панель ментора</h1>
        <Link to="/main" className="dashboard-back-button">
          На главную
        </Link>
      </div>

      {mentor ? (
        <section className="mentor-dashboard-card">
          <div className="mentor-info-header">
            <div>
              <h2>{mentor.name}</h2>
              <Link to="/mentor/profile/edit" className="mentor-edit-link">
                Редактировать профиль
              </Link>
            </div>
            <span className={mentor.is_available ? 'status-available' : 'status-unavailable'}>
              {mentor.is_available ? 'Доступен' : 'Не доступен'}
            </span>
          </div>

          <div className="mentor-info-grid">
            <div>
              <strong>Город:</strong>
              <p>{mentor.city || 'Не указано'}</p>
            </div>
            <div>
              <strong>Стиль йоги:</strong>
              <p>{mentor.yoga_style || 'Не указано'}</p>
            </div>
            <div>
              <strong>Цена:</strong>
              <p>{mentor.price ? `${mentor.price} ₽` : 'Не указано'}</p>
            </div>
            <div>
              <strong>Опыт:</strong>
              <p>{mentor.experience_years ? `${mentor.experience_years} лет` : 'Не указано'}</p>
            </div>
            <div className="mentor-info-fullwidth">
              <strong>Описание:</strong>
              <p>{mentor.description || 'Описание отсутствует'}</p>
            </div>
          </div>
        </section>
      ) : (
        <div className="mentor-dashboard-empty">Профиль ментора не найден</div>
      )}

      <section className="mentor-bookings-section">
        <div className="section-header">
          <h2>Записи</h2>
          <span>{bookings.length} {bookings.length === 1 ? 'запись' : 'записей'}</span>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-state">Пока нет назначенных занятий</div>
        ) : (
          <div className="mentor-bookings-list">
            {bookings.map((booking) => (
              <div key={booking.id} className="mentor-booking-card">
                <div>
                  <strong>Дата:</strong>
                  <p>{formatDate(booking.sessionDate)}</p>
                </div>
                <div>
                  <strong>Статус:</strong>
                  <p>{booking.status || 'active'}</p>
                </div>
                <div>
                  <strong>Тип:</strong>
                  <p>{booking.sessionType === 'group' ? 'Групповая' : 'Индивидуальная'}</p>
                </div>
                <div>
                  <strong>Цена:</strong>
                  <p>{booking.price} ₽</p>
                </div>
                {booking.notes && (
                  <div className="booking-notes">
                    <strong>Комментарий:</strong>
                    <p>{booking.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MentorDashboardScreen;
