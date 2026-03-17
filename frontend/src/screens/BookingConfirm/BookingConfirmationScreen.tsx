import React, { JSX, useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './BookingConfirmationScreen.css';

type SessionType = 'individual' | 'group';
type BookingStatus = 'active' | 'completed' | 'cancelled' | 'confirmed' | string;

interface BookingConfirmationMentor {
  id?: string | number;
  name?: string;
  city?: string;
  yogaStyle?: string;
}

interface BookingConfirmationData {
  id: string | number;
  mentorName?: string;
  sessionDate: string;
  durationMinutes?: number;
  sessionType?: SessionType;
  price?: number;
  totalPrice?: number;
  status?: BookingStatus;
  notes?: string;
}

interface BookingConfirmationLocationState {
  bookingData?: BookingConfirmationData;
  mentor?: BookingConfirmationMentor;
}

const BookingConfirmationScreen = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as BookingConfirmationLocationState | null;

  const [bookingData, setBookingData] = useState<BookingConfirmationData | null>(null);
  const [mentor, setMentor] = useState<BookingConfirmationMentor | null>(null);
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
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
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

  const extractTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `${new Intl.NumberFormat('ru-RU').format(price)} ₽`;
  };

  if (loading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (error || !bookingData) {
    return (
      <div className="confirmation-not-found">
        <h2>Информация о записи не найдена</h2>
        <p>{error}</p>
        <Link to="/main">На главную</Link>
      </div>
    );
  }

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">

        <h1>Запись подтверждена!</h1>

        <div className="booking-summary">

          <div>
            Ментор: {mentor?.name || bookingData.mentorName || 'Не указан'}
          </div>

          <div>Дата: {formatDate(bookingData.sessionDate)}</div>
          <div>Время: {extractTime(bookingData.sessionDate)}</div>

          <div>
            Длительность: {bookingData.durationMinutes || 60} мин
          </div>

          <div>
            Тип:
            {bookingData.sessionType === 'group'
              ? ' Групповая'
              : ' Индивидуальная'}
          </div>

          <div>
            Стоимость:
            {formatPrice(bookingData.price || bookingData.totalPrice || 0)}
          </div>

          <div>
            Номер: #{String(bookingData.id).padStart(6, '0')}
          </div>

          {bookingData.notes && (
            <div>Комментарий: {bookingData.notes}</div>
          )}
        </div>

        {mentor && (
          <div>
            {mentor.city}, {mentor.yogaStyle}
          </div>
        )}

        <button onClick={handleGoToMain}>
          На главную
        </button>

        <button onClick={handleGoToMyBookings}>
          Мои записи
        </button>

      </div>
    </div>
  );
};

export default BookingConfirmationScreen;