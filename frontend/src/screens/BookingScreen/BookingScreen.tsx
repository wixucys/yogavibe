import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import BookingService from '../../services/BookingService';
import ApiService from '../../services/ApiService';
import './BookingScreen.css';
import type { MentorApi, BookingMentor } from '../../types/mentor';

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

  // time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];

    for (let h = 9; h <= 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        slots.push(`${h.toString().padStart(2, '0')}:${m
          .toString()
          .padStart(2, '0')}`);
      }
    }

    return slots;
  }, []);

  // load mentor
  useEffect(() => {
    if (!mentorId) {
      setError('Некорректный ID ментора');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        if (locationState?.mentor) {
          setMentor(locationState.mentor);
          return;
        }

        const response = await ApiService.request<MentorApi>(
          `/mentors/${mentorId}`,
          { method: 'GET' }
        );

        if (!response) {
          setError('Ментор не найден');
          return;
        }

        setMentor({
          id: response.id,
          name: response.name,
          description: response.description,
          gender: response.gender,
          city: response.city,
          price: response.price,
          yogaStyle: response.yoga_style,
          rating: response.rating,
          experienceYears: response.experience_years,
          photoUrl: response.photo_url,
          isAvailable: response.is_available,
        });
      } catch (err) {
        console.error(err);
        setError('Ошибка загрузки ментора');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mentorId, locationState]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;

      setBookingData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );

  const calculateTotalPrice = useCallback(() => {
    if (!mentor) return 0;

    const base = mentor.price;
    const duration = parseInt(bookingData.durationMinutes, 10) / 60;
    const type = bookingData.sessionType === 'group' ? 0.7 : 1;

    return Math.round(base * duration * type);
  }, [mentor, bookingData]);

  const handleSubmit = async (e: React.FormEvent) => {
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

      const [h, m] = bookingData.time.split(':').map(Number);
      const date = new Date(bookingData.sessionDate);
      date.setHours(h, m, 0, 0);

      if (date <= new Date()) {
        setError('Нельзя выбрать прошедшее время');
        return;
      }

      const booking = await BookingService.createBooking({
        mentor_id: Number(mentor.id),
        session_date: date.toISOString(),
        duration_minutes: parseInt(bookingData.durationMinutes, 10),
        notes: bookingData.notes,
        session_type: bookingData.sessionType,
      });

      navigate('/booking-confirmation', {
        state: { bookingData: booking, mentor },
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Ошибка создания записи');
    } finally {
      setIsBooking(false);
    }
  };

  const handleBack = () => {
    navigate(`/mentor/${mentorId}`);
  };

  const minDate = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

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
            {timeSlots.map((t) => (
              <option key={t}>{t}</option>
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