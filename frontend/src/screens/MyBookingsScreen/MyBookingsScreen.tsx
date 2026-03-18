import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingService from '../../services/BookingService';
import './MyBookingScreen.css';
import type { Booking as BookingDto, BookingStatus, SessionType } from '../../types/booking';

type ActiveTab = 'active' | 'completed' | 'cancelled';

interface BookingView extends Omit<BookingDto, 'sessionDate' | 'createdAt'> {
  sessionDate: Date;
  createdAt: Date;
}

const normalizeBooking = (booking: BookingDto): BookingView => ({
  ...booking,
  sessionDate: new Date(booking.sessionDate),
  createdAt: new Date(booking.createdAt || new Date().toISOString()),
  status: booking.status || 'active',
  sessionType: booking.sessionType || 'individual',
});

const MyBookingsScreen = (): JSX.Element => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBookings = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const data = await BookingService.getBookings();
        setBookings(data.map(normalizeBooking));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки записей');
      } finally {
        setLoading(false);
      }
    };

    void loadBookings();
  }, []);

  const { filteredBookings, counts } = useMemo(() => {
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

    const tabsMap: Record<ActiveTab, BookingView[]> = {
      active,
      completed,
      cancelled,
    };

    return {
      filteredBookings: tabsMap[activeTab],
      counts: {
        active: active.length,
        completed: completed.length,
        cancelled: cancelled.length,
      },
    };
  }, [bookings, activeTab]);

  const handleCancelBooking = useCallback(async (id: string | number) => {
    if (!window.confirm('Отменить запись?')) return;

    try {
      await BookingService.cancelBooking(id);

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id ? { ...booking, status: 'cancelled' as BookingStatus } : booking
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка отмены');
    }
  }, []);

  const handleViewMentor = useCallback(
    (mentorId: string | number) => {
      if (!mentorId) return;
      navigate(`/mentor/${mentorId}`);
    },
    [navigate]
  );

  const getSessionTypeLabel = (sessionType?: SessionType): string => {
    return sessionType === 'group' ? 'Групповая' : 'Индивидуальная';
  };

  if (loading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  return (
    <div className="bookings-page">
      <h1>Мои записи</h1>

      {error && <div className="error-message">⚠ {error}</div>}

      <div className="bookings-tabs">
        {(['active', 'completed', 'cancelled'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'active' : ''}
          >
            {tab} ({counts[tab]})
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div>Нет записей</div>
      ) : (
        filteredBookings.map((booking) => (
          <div key={booking.id} className="booking-card">
            <h3>{booking.mentorName}</h3>
            <div>{booking.sessionDate.toLocaleString('ru-RU')}</div>
            {booking.mentorCity && <div>{booking.mentorCity}</div>}
            {booking.mentorYogaStyle && <div>{booking.mentorYogaStyle}</div>}
            <div>{getSessionTypeLabel(booking.sessionType)}</div>
            <div>{booking.price} ₽</div>

            <button onClick={() => handleViewMentor(booking.mentorId)}>Ментор</button>

            {booking.status === 'active' && booking.sessionDate > new Date() && (
              <button onClick={() => handleCancelBooking(booking.id)}>Отменить</button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default MyBookingsScreen;
