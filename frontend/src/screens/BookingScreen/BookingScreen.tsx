import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import BookingService from '../../services/BookingService';
import ApiService from '../../services/ApiService';
import WeatherWidget from '../../components/WeatherWidget/WeatherWidget';
import './BookingScreen.css';
import type { MentorApi, BookingMentor } from '../../types/mentor';
import { mapMentorToBooking } from '../../types/mentor';
import { ROUTES } from '../../constants/routes';
import { useSeo } from '../../hooks/useSeo';

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

const BookingScreen = () => {
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

  useSeo({
    title: mentor ? `Запись к ${mentor.name}` : 'Запись к ментору',
    description: 'Оформление записи на индивидуальную или групповую сессию с ментором YogaVibe.',
    canonicalPath: mentorId ? ROUTES.booking.create(mentorId) : ROUTES.user.main,
    noindex: true,
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
      const [year, month, day] = bookingData.sessionDate.split('-').map(Number);
      const sessionDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

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

      navigate(ROUTES.booking.confirmation, {
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
    if (!mentorId) {
      navigate(ROUTES.user.main);
      return;
    }

    navigate(ROUTES.mentor.profile(mentorId));
  };

  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const sessionIso = useMemo(() => {
    if (!bookingData.sessionDate || !bookingData.time) return undefined;
    return `${bookingData.sessionDate}T${bookingData.time}:00`;
  }, [bookingData.sessionDate, bookingData.time]);

  if (loading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (error && !mentor) {
    return (
      <div className="booking-page">
        <h2>{error}</h2>
        <button onClick={() => navigate(ROUTES.user.main)}>Назад</button>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="booking-page">
        <div className="booking-container booking-not-found">
          <h2>Ментор не найден</h2>
          <button className="back-btn" onClick={handleBack}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <button className="back-btn" onClick={handleBack}>
            ← Назад
          </button>
          <h1>Запись к {mentor.name}</h1>
        </div>

        {error && <div className="error-message">⚠ {error}</div>}

        <div className="mentor-summary">
          <h2>Профиль ментора</h2>
          <div className="mentor-details">
            <div className="detail-item">
              <span className="detail-label">Город</span>
              <span className="detail-value">{mentor.city}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Стиль йоги</span>
              <span className="detail-value">{mentor.yogaStyle}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Цена</span>
              <span className="detail-value price">{mentor.price} ₽</span>
            </div>
          </div>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Детали сеанса</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sessionDate">Дата</label>
                <input
                  id="sessionDate"
                  type="date"
                  name="sessionDate"
                  value={bookingData.sessionDate}
                  onChange={handleInputChange}
                  min={minDate}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="time">Время</label>
                <select
                  id="time"
                  name="time"
                  value={bookingData.time}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Время</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="durationMinutes">Длительность</label>
                <select
                  id="durationMinutes"
                  name="durationMinutes"
                  value={bookingData.durationMinutes}
                  onChange={handleInputChange}
                >
                  <option value="30">30 мин</option>
                  <option value="60">60 мин</option>
                  <option value="90">90 мин</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="sessionType">Формат</label>
                <select
                  id="sessionType"
                  name="sessionType"
                  value={bookingData.sessionType}
                  onChange={handleInputChange}
                >
                  <option value="individual">Индивидуально</option>
                  <option value="group">Групповое</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Пожелания</label>
              <textarea
                id="notes"
                name="notes"
                value={bookingData.notes}
                onChange={handleInputChange}
                placeholder="Например, хочу работу с растяжкой"
              />
            </div>
          </div>

          
          {mentor.city && (
            <WeatherWidget city={mentor.city} date={sessionIso} />
          )}

          <div className="price-summary">
            <div className="price-details">
              <div className="price-row">
                <span>Итого</span>
                <span className="total-amount">{calculateTotalPrice()} ₽</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleBack}>
              Отмена
            </button>
            <button type="submit" className="submit-btn" disabled={isBooking}>
              {isBooking ? 'Создание...' : 'Записаться'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingScreen;
