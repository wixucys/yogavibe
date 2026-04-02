import React, { JSX, useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './BookingConfirmationScreen.css';
import type { Booking, SessionType, BookingStatus } from '../../types/booking';
import type { BookingMentor } from '../../types/mentor';

type BookingConfirmationData = Omit<Booking, 'mentorId'>;

interface BookingConfirmationLocationState {
  bookingData?: BookingConfirmationData;
  mentor?: BookingMentor;
}

const BookingConfirmationScreen = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as BookingConfirmationLocationState | null;

  const [bookingData, setBookingData] = useState<BookingConfirmationData | null>(null);
  const [mentor, setMentor] = useState<BookingMentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (locationState?.bookingData) {
        const data = locationState.bookingData;

        if (!data.id || !data.sessionDate) {
          throw new Error('Неполные данные бронирования');
        }

        setBookingData(data);
        setMentor(locationState.mentor || null);
      } else {
        setError('Данные бронирования не найдены');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [locationState]);

  const handleGoToMain = () => {
    navigate('/main');
  };

  const handleGoToMyBookings = () => {
    navigate('/main', { state: { activeNav: 'МОИ ЗАПИСИ' } });
  };

  const extractTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number): string => {
    return `${new Intl.NumberFormat('ru-RU').format(price)} ₽`;
  };

  if (loading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (error || !bookingData) {
    return (
      <div className="confirmation-page">
        <div className="confirmation-container confirmation-not-found">
          <h2>Информация о записи не найдена</h2>
          <p>{error || 'Неполные данные бронирования'}</p>
          <Link className="action-btn secondary" to="/main">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">
        <div className="confirmation-header">
          <div className="success-icon-large">✓</div>
          <h1>Запись подтверждена!</h1>
          <p className="confirmation-subtitle">
            Ваш урок успешно добавлен в расписание.
          </p>
        </div>

        <div className="booking-summary">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Ментор</span>
              <span className="summary-value">
                {mentor?.name || bookingData.mentorName || 'Не указан'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Дата</span>
              <span className="summary-value">
                {formatDate(bookingData.sessionDate)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Время</span>
              <span className="summary-value">
                {extractTime(bookingData.sessionDate)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Длительность</span>
              <span className="summary-value">
                {bookingData.durationMinutes || 60} мин
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Тип</span>
              <span className="summary-value">
                {bookingData.sessionType === 'group'
                  ? 'Групповая'
                  : 'Индивидуальная'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Стоимость</span>
              <span className="summary-value price">
                {formatPrice(bookingData.price || 0)}
              </span>
            </div>
            <div className="summary-item full-width">
              <span className="summary-label">Номер</span>
              <span className="summary-value booking-id">
                #{String(bookingData.id).padStart(6, '0')}
              </span>
            </div>
            {bookingData.notes && (
              <div className="summary-item full-width">
                <span className="summary-label">Комментарий</span>
                <span className="summary-value">
                  {bookingData.notes}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="confirmation-actions">
          <button className="action-btn primary" onClick={handleGoToMain}>
            На главную
          </button>
          <button className="action-btn secondary" onClick={handleGoToMyBookings}>
            Мои записи
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationScreen;
