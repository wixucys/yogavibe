import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingService from '../../services/BookingService';
import './MyBookingScreen.css';

type BookingId = string | number;
type MentorId = string | number;
type BookingStatus = 'active' | 'completed' | 'cancelled';
type SessionType = 'individual' | 'group';
type ActiveTab = 'active' | 'completed' | 'cancelled';

interface Booking {
  id: BookingId;
  mentorId: MentorId;
  userId?: string | number;
  mentorName: string;
  mentorCity?: string;
  mentorYogaStyle?: string;
  sessionDate: Date;
  durationMinutes: number;
  price: number;
  status: BookingStatus;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  sessionType: SessionType;
}

interface BookingServiceItem {
  id: BookingId;
  mentorId?: MentorId;
  mentor_id?: MentorId;
  userId?: string | number;
  mentorName?: string;
  mentorCity?: string;
  mentorYogaStyle?: string;
  sessionDate?: string;
  session_date?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  price?: number;
  status?: BookingStatus;
  notes?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  sessionType?: SessionType;
  session_type?: SessionType;
  mentor?: {
    name?: string;
    city?: string;
    yoga_style?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface LocalBookingItem {
  id: BookingId;
  userId?: string | number;
  mentorId?: MentorId;
  mentor_id?: MentorId;
  mentorName?: string;
  mentorCity?: string;
  mentorYogaStyle?: string;
  sessionDate?: string;
  session_date?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  price?: number;
  status?: BookingStatus;
  notes?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  sessionType?: SessionType;
  session_type?: SessionType;
  [key: string]: unknown;
}

interface UserData {
  id?: string | number;
  [key: string]: unknown;
}

interface BookingCardProps {
  booking: Booking;
  now: Date;
  onCancel: (bookingId: BookingId) => Promise<void>;
  onViewMentor: (mentorId: MentorId) => void;
}

interface StatsCardProps {
  value: number;
  label: string;
}

interface BookingError {
  body?: {
    detail?: string;
    [key: string]: unknown;
  };
  message?: string;
  [key: string]: unknown;
}

const BookingCard = ({
  booking,
  now,
  onCancel,
  onViewMentor,
}: BookingCardProps): JSX.Element => {
  const statusLabels: Record<BookingStatus, { text: string; className: string }> = {
    active: { text: 'Активная', className: 'status-active' },
    completed: { text: 'Завершена', className: 'status-completed' },
    cancelled: { text: 'Отменена', className: 'status-cancelled' },
  };

  let displayStatus: BookingStatus = booking.status;
  if (booking.status === 'active' && booking.sessionDate <= now) {
    displayStatus = 'completed';
  }

  const statusInfo = statusLabels[displayStatus];
  const canCancel = booking.status === 'active' && booking.sessionDate > now;

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="booking-card">
      <div className="booking-header">
        <div className="booking-mentor-info">
          <h3>{booking.mentorName}</h3>
          <span className={`status-badge ${statusInfo.className}`}>
            {statusInfo.text}
          </span>
        </div>
        <div className="booking-id">Запись #{booking.id}</div>
      </div>

      <div className="booking-details">
        <div className="detail-row">
          <span className="detail-label">Дата:</span>
          <span className="detail-value">
            {booking.sessionDate.toLocaleDateString('ru-RU', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Время:</span>
          <span className="detail-value">{formatTime(booking.sessionDate)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Длительность:</span>
          <span className="detail-value">{booking.durationMinutes} минут</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Тип сессии:</span>
          <span className="detail-value">
            {booking.sessionType === 'individual' ? 'Индивидуальная' : 'Групповая'}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Стоимость:</span>
          <span className="detail-value price">{booking.price} ₽</span>
        </div>
        {booking.notes && (
          <div className="detail-row">
            <span className="detail-label">Заметки:</span>
            <span className="detail-value notes">{booking.notes}</span>
          </div>
        )}
      </div>

      <div className="booking-actions">
        <button
          onClick={() => onViewMentor(booking.mentorId)}
          className="action-btn view-mentor-btn"
          type="button"
        >
          Профиль ментора
        </button>

        {canCancel && (
          <button
            onClick={() => {
              void onCancel(booking.id);
            }}
            className="action-btn cancel-btn"
            type="button"
          >
            Отменить запись
          </button>
        )}
      </div>
    </div>
  );
};

const StatsCard = ({ value, label }: StatsCardProps): JSX.Element => (
  <div className="stat-card">
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const normalizeBooking = (booking: BookingServiceItem | LocalBookingItem): Booking => {
  const sessionDateRaw = booking.sessionDate || booking.session_date || new Date().toISOString();
  const createdAtRaw = booking.createdAt || booking.created_at || new Date().toISOString();
  const updatedAtRaw = booking.updatedAt || booking.updated_at;

  return {
    id: booking.id,
    mentorId: booking.mentorId ?? booking.mentor_id ?? 0,
    userId: booking.userId,
    mentorName: booking.mentorName || booking.mentor?.name || 'Неизвестный ментор',
    mentorCity: booking.mentorCity || booking.mentor?.city,
    mentorYogaStyle: booking.mentorYogaStyle || booking.mentor?.yoga_style,
    sessionDate: new Date(sessionDateRaw),
    durationMinutes: booking.durationMinutes ?? booking.duration_minutes ?? 0,
    price: booking.price ?? 0,
    status: booking.status || 'active',
    notes: booking.notes,
    createdAt: new Date(createdAtRaw),
    updatedAt: updatedAtRaw ? new Date(updatedAtRaw) : undefined,
    sessionType: booking.sessionType || booking.session_type || 'individual',
  };
};

const MyBookingsScreen = (): JSX.Element => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadBookings();
  }, []);

  // Локально переводим прошедшие активные записи в completed
  useEffect(() => {
    if (bookings.length === 0) return;

    const now = new Date();
    const hasPastActive = bookings.some(
      (booking) => booking.status === 'active' && booking.sessionDate <= now
    );

    if (!hasPastActive) return;

    setBookings((prev) =>
      prev.map((booking) =>
        booking.status === 'active' && booking.sessionDate <= now
          ? { ...booking, status: 'completed' }
          : booking
      )
    );

    try {
      const allBookings = JSON.parse(
        localStorage.getItem('yogavibe_bookings') || '[]'
      ) as LocalBookingItem[];

      const updatedBookings = allBookings.map((booking) => {
        const sessionDateRaw =
          booking.sessionDate || booking.session_date || new Date().toISOString();
        const sessionDate = new Date(sessionDateRaw);

        if (booking.status === 'active' && sessionDate <= now) {
          return { ...booking, status: 'completed' as BookingStatus };
        }

        return booking;
      });

      localStorage.setItem('yogavibe_bookings', JSON.stringify(updatedBookings));
    } catch (storageError) {
      console.error('Error auto-updating local bookings:', storageError);
    }
  }, [bookings]);

  const loadBookings = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const serverBookings = (await BookingService.getBookings()) as BookingServiceItem[];
      const formattedBookings = serverBookings.map(normalizeBooking);
      setBookings(formattedBookings);
    } catch (error: unknown) {
      console.error('Error loading bookings:', error);

      const bookingError = error as BookingError;
      setError(bookingError.message || 'Ошибка загрузки записей');

      try {
        const allBookings = JSON.parse(
          localStorage.getItem('yogavibe_bookings') || '[]'
        ) as LocalBookingItem[];
        const user = JSON.parse(
          localStorage.getItem('yogavibe_user') || '{}'
        ) as UserData;

        if (user.id) {
          const userBookings = allBookings.filter((b) => b.userId === user.id);
          const formattedUserBookings = userBookings.map(normalizeBooking);
          setBookings(formattedUserBookings);
        }
      } catch (localError) {
        console.error('Error loading local bookings:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const { filteredBookings, counts, now } = useMemo(() => {
    const now = new Date();

    const active = bookings.filter(
      (booking) => booking.status === 'active' && booking.sessionDate > now
    );

    const completed = bookings.filter(
      (booking) =>
        booking.status === 'completed' ||
        (booking.status === 'active' && booking.sessionDate <= now)
    );

    const cancelled = bookings.filter((booking) => booking.status === 'cancelled');

    let filtered: Booking[];
    switch (activeTab) {
      case 'active':
        filtered = active;
        break;
      case 'completed':
        filtered = completed;
        break;
      case 'cancelled':
        filtered = cancelled;
        break;
      default:
        filtered = bookings;
    }

    return {
      filteredBookings: filtered,
      counts: {
        active: active.length,
        completed: completed.length,
        cancelled: cancelled.length,
        total: bookings.length,
      },
      now,
    };
  }, [bookings, activeTab]);

  const handleCancelBooking = useCallback(async (bookingId: BookingId): Promise<void> => {
    if (!window.confirm('Вы уверены, что хотите отменить эту запись?')) return;

    try {
      setError(null);

      await BookingService.cancelBooking(bookingId);

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
        )
      );

      try {
        const allBookings = JSON.parse(
          localStorage.getItem('yogavibe_bookings') || '[]'
        ) as LocalBookingItem[];

        const updatedBookings = allBookings.map((booking) => {
          if (booking.id === bookingId) {
            return { ...booking, status: 'cancelled' as BookingStatus };
          }
          return booking;
        });

        localStorage.setItem('yogavibe_bookings', JSON.stringify(updatedBookings));
      } catch (localError) {
        console.error('Error updating local storage:', localError);
      }
    } catch (error: unknown) {
      console.error('Error cancelling booking:', error);

      const bookingError = error as BookingError;
      setError(
        bookingError.body?.detail ||
          bookingError.message ||
          'Ошибка отмены записи'
      );
      window.alert('Не удалось отменить запись');
    }
  }, []);

  const handleViewMentor = useCallback(
    (mentorId: MentorId): void => {
      navigate(`/mentor/${mentorId}`);
    },
    [navigate]
  );

  if (loading) {
    return (
      <div className="bookings-page">
        <div className="bookings-container">
          <div className="bookings-loading">
            <div className="loading-spinner"></div>
            <p>Загрузка записей...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bookings-page">
      <div className="bookings-container">
        <div className="bookings-header">
          <h1>Мои записи</h1>
          <p className="bookings-subtitle">
            Управляйте своими сессиями и просматривайте историю
          </p>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}

        <div className="bookings-tabs">
          <button
            className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
            type="button"
          >
            Активные
            <span className="tab-count">{counts.active}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
            type="button"
          >
            Завершенные
            <span className="tab-count">{counts.completed}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
            type="button"
          >
            Отмененные
            <span className="tab-count">{counts.cancelled}</span>
          </button>
        </div>

        <div className="bookings-list">
          {filteredBookings.length === 0 ? (
            <div className="no-bookings">
              <div className="no-bookings-icon">📅</div>
              <h3>Записей не найдено</h3>
              <p>
                {activeTab === 'active'
                  ? 'У вас нет активных сессий. Запишитесь к ментору!'
                  : activeTab === 'completed'
                    ? 'У вас пока нет завершенных сессий'
                    : 'У вас нет отмененных записей'}
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                now={now}
                onCancel={handleCancelBooking}
                onViewMentor={handleViewMentor}
              />
            ))
          )}
        </div>

        <div className="bookings-stats">
          <StatsCard value={counts.total} label="Всего записей" />
          <StatsCard value={counts.completed} label="Завершено" />
          <StatsCard value={counts.active} label="Активные" />
        </div>
      </div>
    </div>
  );
};

export default MyBookingsScreen;