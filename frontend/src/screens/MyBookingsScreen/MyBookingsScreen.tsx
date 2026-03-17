import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingService from '../../services/BookingService';
import './MyBookingScreen.css';

type BookingStatus = 'active' | 'completed' | 'cancelled';
type SessionType = 'individual' | 'group';
type ActiveTab = 'active' | 'completed' | 'cancelled';

interface Booking {
  id: string | number;
  mentorId: string | number;
  mentorName: string;
  mentorCity?: string;
  mentorYogaStyle?: string;
  sessionDate: Date;
  durationMinutes: number;
  price: number;
  status: BookingStatus;
  notes?: string;
  createdAt: Date;
  sessionType: SessionType;
}

interface BookingRaw {
  id: string | number;
  mentor_id?: string | number;
  mentor?: {
    name?: string;
    city?: string;
    yoga_style?: string;
  };
  session_date?: string;
  duration_minutes?: number;
  price?: number;
  status?: BookingStatus;
  notes?: string;
  created_at?: string;
  session_type?: SessionType;
}

const normalizeBooking = (b: BookingRaw): Booking => ({
  id: b.id,
  mentorId: b.mentor_id ?? 0,
  mentorName: b.mentor?.name || 'Неизвестный ментор',
  mentorCity: b.mentor?.city,
  mentorYogaStyle: b.mentor?.yoga_style,
  sessionDate: new Date(b.session_date || new Date()),
  durationMinutes: b.duration_minutes || 60,
  price: b.price || 0,
  status: b.status || 'active',
  notes: b.notes,
  createdAt: new Date(b.created_at || new Date()),
  sessionType: b.session_type || 'individual',
});

const MyBookingsScreen = (): JSX.Element => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = (await BookingService.getBookings()) as BookingRaw[];
      setBookings(data.map(normalizeBooking));
    } catch (err: any) {
      setError(err?.message || 'Ошибка загрузки записей');
    } finally {
      setLoading(false);
    }
  };

  const { filteredBookings, counts, now } = useMemo(() => {
    const now = new Date();

    const active = bookings.filter(
      (b) => b.status === 'active' && b.sessionDate > now
    );

    const completed = bookings.filter(
      (b) =>
        b.status === 'completed' ||
        (b.status === 'active' && b.sessionDate <= now)
    );

    const cancelled = bookings.filter((b) => b.status === 'cancelled');

    const map = { active, completed, cancelled };

    return {
      filteredBookings: map[activeTab],
      counts: {
        active: active.length,
        completed: completed.length,
        cancelled: cancelled.length,
        total: bookings.length,
      },
      now,
    };
  }, [bookings, activeTab]);

  const handleCancelBooking = useCallback(async (id: string | number) => {
    if (!window.confirm('Отменить запись?')) return;

    try {
      await BookingService.cancelBooking(id);

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: 'cancelled' } : b
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Ошибка отмены');
    }
  }, []);

  const handleViewMentor = useCallback(
    (mentorId: string | number) => {
      if (!mentorId) return;
      navigate(`/mentor/${mentorId}`);
    },
    [navigate]
  );

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
        filteredBookings.map((b) => (
          <div key={b.id} className="booking-card">
            <h3>{b.mentorName}</h3>
            <div>{b.sessionDate.toLocaleString()}</div>
            <div>{b.price} ₽</div>

            <button onClick={() => handleViewMentor(b.mentorId)}>
              Ментор
            </button>

            {b.status === 'active' && (
              <button onClick={() => handleCancelBooking(b.id)}>
                Отменить
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default MyBookingsScreen;