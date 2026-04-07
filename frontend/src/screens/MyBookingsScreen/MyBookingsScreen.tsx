import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const MyBookingsScreen = () => {
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

  const handleEditBooking = useCallback(async (booking: BookingView) => {
    const nextNotesRaw = window.prompt(
      'Измените комментарий к записи (до 1000 символов):',
      booking.notes || ''
    );

    if (nextNotesRaw === null) return;

    const nextNotes = nextNotesRaw.trim();

    if (nextNotes.length > 1000) {
      setError('Комментарий к записи слишком длинный');
      return;
    }

    try {
      const updated = await BookingService.updateBooking(booking.id, {
        notes: nextNotes === '' ? undefined : nextNotes,
        expected_updated_at: (booking.updatedAt || booking.createdAt.toISOString()),
      });

      setBookings((prev) =>
        prev.map((item) =>
          item.id === booking.id
            ? normalizeBooking(updated)
            : item
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления записи');
    }
  }, []);

  const handleDeleteBooking = useCallback(async (id: string | number) => {
    if (!window.confirm('Удалить запись окончательно?')) return;

    try {
      await BookingService.deleteBooking(id);
      setBookings((prev) => prev.filter((booking) => booking.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления записи');
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
      <div className="bookings-container">
        <div className="bookings-header">
          <h1>Мои записи</h1>
          {error && <div className="error-message">⚠ {error}</div>}
        </div>

        <div className="bookings-tabs">
          {(['active', 'completed', 'cancelled'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            >
              {tab} ({counts[tab]})
            </button>
          ))}
        </div>

        {filteredBookings.length === 0 ? (
          <div>Нет записей</div>
        ) : (
          <div className="bookings-list">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-header">
                  <div className="booking-mentor-info">
                    <h3>{booking.mentorName}</h3>
                  </div>
                  <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <div className="detail-label">Дата:</div>
                    <div className="detail-value">{booking.sessionDate.toLocaleString('ru-RU')}</div>
                  </div>
                  {booking.mentorCity && (
                    <div className="detail-row">
                      <div className="detail-label">Город:</div>
                      <div className="detail-value">{booking.mentorCity}</div>
                    </div>
                  )}
                  {booking.mentorYogaStyle && (
                    <div className="detail-row">
                      <div className="detail-label">Стиль:</div>
                      <div className="detail-value">{booking.mentorYogaStyle}</div>
                    </div>
                  )}
                  <div className="detail-row">
                    <div className="detail-label">Тип:</div>
                    <div className="detail-value">{getSessionTypeLabel(booking.sessionType)}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Цена:</div>
                    <div className="detail-value price">{booking.price} ₽</div>
                  </div>
                </div>

                <div className="booking-actions">
                  <button className="action-btn view-mentor-btn" onClick={() => handleViewMentor(booking.mentorId)}>
                    Ментор
                  </button>
                  {booking.status === 'active' && booking.sessionDate > new Date() && (
                    <button className="action-btn cancel-btn" onClick={() => handleCancelBooking(booking.id)}>
                      Отменить
                    </button>
                  )}
                  {booking.status === 'active' && booking.sessionDate > new Date() && (
                    <button className="action-btn view-mentor-btn" onClick={() => handleEditBooking(booking)}>
                      Изменить
                    </button>
                  )}
                  {booking.status !== 'active' && (
                    <button className="action-btn cancel-btn" onClick={() => handleDeleteBooking(booking.id)}>
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookingsScreen;
