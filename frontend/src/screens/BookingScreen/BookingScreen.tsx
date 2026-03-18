import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import BookingService from '../../services/BookingService';
import ApiService from '../../services/ApiService';
import './BookingScreen.css';
import type { MentorApi, BookingMentor } from '../../types/mentor';
import { mapMentorToBooking } from '../../types/mentor';

type SessionType = 'individual' | 'group';

interface BookingLocationState {
  mentor?: BookingMentor;
}

interface BookingFormData {
  sessionDate: string;
  time: string;
  durationMinutes: string;
  notes: string;
  sessionType: SessionType;
}

const BookingScreen = (): JSX.Element => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as BookingLocationState | null;

  const [mentor, setMentor] = useState<BookingMentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookingData, setBookingData] = useState<BookingFormData>({
    sessionDate: '',
    time: '',
    durationMinutes: '60',
    notes: '',
    sessionType: 'individual',
  });

  const timeSlots = useMemo(() => {
    const slots: string[] = [];

    for (let hour = 9; hour <= 20; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(
          `${hour.toString().padStart(2, '0')}:${minute
            .toString()
            .padStart(2, '0')}`
        );
      }
    }

    return slots;
  }, []);

  useEffect(() => {
    if (!mentorId) {
      setError('Некорректный ID ментора');
      setLoading(false);
      return;
    }

    const loadMentor = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        if (locationState?.mentor) {
          setMentor(locationState.mentor);
          return;
        }

        const response = await ApiService.request<MentorApi>(`/mentors/${mentorId}`, {
          method: 'GET',
        });

        if (!response) {
          setError('Ментор не найден');
          return;
        }

        setMentor(mapMentorToBooking(response));
      } catch (err) {
        console.error(err);
        setError('Ошибка загрузки ментора');
      } finally {
        setLoading(false);
      }
    };

    void loadMentor();
  }, [mentorId, locationState]);

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target;

      setBookingData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );

  const calculateTotalPrice = useCallback((): number => {
    if (!mentor) return 0;

    const basePrice = mentor.price;
    const durationMultiplier = parseInt(bookingData.durationMinutes, 10) / 60;
    const sessionTypeMultiplier = bookingData.sessionType === 'group' ? 0.7 : 1;

    return Math.round(basePrice * durationMultiplier * sessionTypeMultiplier);
  }, [mentor, bookingData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!mentor || mentor.isAvailable === false) {
      setError('Ментор недоступен');
      return;
    }

    if (!bookingData.sessionDate || !bookingData.time) {
      setError('Выберите дату и время');
      return;
    }

    try {
      setIsBooking(true);
      setError(null);

      const [hours, minutes] = bookingData.time.split(':').map(Number);
      const sessionDate = new Date(bookingData.sessionDate);
      sessionDate.setHours(hours, minutes, 0, 0);

      if (sessionDate <= new Date()) {
        setError('Нельзя выбрать прошедшее время');
        return;
      }

      const booking = await BookingService.createBooking({
        mentor_id: Number(mentor.id),
        session_date: sessionDate.toISOString(),
        duration_minutes: parseInt(bookingData.durationMinutes, 10),
        notes: bookingData.notes,
        session_type: bookingData.sessionType,
        mentorName: mentor.name,
      });

      navigate('/booking-confirmation', {
        state: { bookingData: booking, mentor },
      });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ошибка создания записи');
    } finally {
      setIsBooking(false);
    }
  };

  const handleBack = (): void => {
    navigate(`/mentor/${mentorId}`);
  };

  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  if (loading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (error && !mentor) {
    return (
      <div className="booking-page">
        <h2>{error}</h2>
        <button onClick={() => navigate('/main')}>Назад</button>
      </div>
    );
  }

  if (!mentor) {
    return <div className="booking-page">Ментор не найден</div>;
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        <button onClick={handleBack}>← Назад</button>

        <h1>Запись к {mentor.name}</h1>

        {error && <div className="error-message">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="date"
            name="sessionDate"
            value={bookingData.sessionDate}
            onChange={handleInputChange}
            min={minDate}
            required
          />

          <select name="time" value={bookingData.time} onChange={handleInputChange} required>
            <option value="">Время</option>
            {timeSlots.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>

          <select
            name="durationMinutes"
            value={bookingData.durationMinutes}
            onChange={handleInputChange}
          >
            <option value="30">30 мин</option>
            <option value="60">60 мин</option>
            <option value="90">90 мин</option>
          </select>

          <textarea
            name="notes"
            value={bookingData.notes}
            onChange={handleInputChange}
            placeholder="Пожелания"
          />

          <div>Итого: {calculateTotalPrice()} ₽</div>

          <button type="submit" disabled={isBooking}>
            {isBooking ? 'Создание...' : 'Записаться'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingScreen;
