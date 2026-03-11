import React, { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import BookingService from '../../services/BookingService';
import ApiService from '../../services/ApiService';
import './BookingScreen.css';

type SessionType = 'individual' | 'group';

interface MentorApiResponse {
  id: number | string;
  name: string;
  description?: string;
  gender: string;
  city: string;
  price: number;
  yoga_style: string;
  rating?: number;
  experience_years?: number;
  photo_url?: string | null;
  is_available?: boolean;
  [key: string]: unknown;
}

interface BookingMentor {
  id: number | string;
  name: string;
  description?: string;
  gender: string;
  city: string;
  price: number;
  yogaStyle: string;
  rating?: number;
  experienceYears?: number;
  photoUrl?: string | null;
  isAvailable?: boolean;
  availability?: string[];
}

interface BookingFormData {
  sessionDate: string;
  time: string;
  durationMinutes: string;
  notes: string;
  sessionType: SessionType;
}

interface CreateBookingError extends Error {
  userMessage?: string;
  body?: {
    detail?: string;
    [key: string]: unknown;
  };
}

interface BookingLocationState {
  mentor?: BookingMentor;
}

const BookingScreen = (): JSX.Element => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as BookingLocationState | null;

  const [mentor, setMentor] = useState<BookingMentor | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [bookingData, setBookingData] = useState<BookingFormData>({
    sessionDate: '',
    time: '',
    durationMinutes: '60',
    notes: '',
    sessionType: 'individual',
  });

  const timeSlots = useMemo<string[]>(() => {
    const slots: string[] = [];

    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')}`;
        slots.push(time);
      }
    }

    return slots;
  }, []);

  useEffect(() => {
    const fetchMentor = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        if (locationState?.mentor) {
          setMentor(locationState.mentor);
        } else {
          await loadMentorData();
        }
      } catch (error: unknown) {
        console.error('Error loading mentor:', error);
        setError('Не удалось загрузить данные ментора');
      } finally {
        setLoading(false);
      }
    };

    void fetchMentor();
  }, [mentorId, locationState?.mentor]);

  const loadMentorData = async (): Promise<void> => {
    try {
      console.log(`Loading mentor ${mentorId} from API...`);

      const response = await ApiService.request<MentorApiResponse>(`/mentors/${mentorId}`, {
        method: 'GET',
      });

      const formattedMentor: BookingMentor = {
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
        availability: ['Пн-Пт: 9:00-18:00', 'Сб: 10:00-15:00'],
      };

      setMentor(formattedMentor);
    } catch (error) {
      console.error('Error loading mentor from API:', error);
      throw error;
    }
  };

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ): void => {
      const { name, value } = e.target;
      const fieldName = name as keyof BookingFormData;

      setBookingData((prev) => ({
        ...prev,
        [fieldName]: value,
      }));
    },
    []
  );

  const isTimeAvailable = useCallback(
    (selectedTime: string): boolean => {
      if (!mentor?.availability) return true;

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const selectedHour = hours + minutes / 60;

      return selectedHour >= 9 && selectedHour <= 18;
    },
    [mentor]
  );

  const calculateTotalPrice = useCallback((): number => {
    if (!mentor) return 0;

    const basePrice = mentor.price || 0;
    const durationMultiplier = parseInt(bookingData.durationMinutes, 10) / 60;
    const typeMultiplier = bookingData.sessionType === 'group' ? 0.7 : 1;

    return Math.round(basePrice * durationMultiplier * typeMultiplier);
  }, [mentor, bookingData.durationMinutes, bookingData.sessionType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!bookingData.sessionDate || !bookingData.time) {
      window.alert('Пожалуйста, выберите дату и время для записи');
      return;
    }

    const selectedDate = new Date(bookingData.sessionDate);
    const now = new Date();

    selectedDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (selectedDate < now) {
      window.alert('Дата не может быть в прошлом');
      return;
    }

    if (!isTimeAvailable(bookingData.time)) {
      window.alert(
        'Выбранное время недоступно. Пожалуйста, выберите время с 9:00 до 18:00'
      );
      return;
    }

    setIsBooking(true);
    setError(null);

    try {
      const [hours, minutes] = bookingData.time.split(':').map(Number);
      const sessionDateTime = new Date(bookingData.sessionDate);
      sessionDateTime.setHours(hours, minutes, 0, 0);

      if (sessionDateTime <= new Date()) {
        window.alert('Выбранное время уже прошло');
        setIsBooking(false);
        return;
      }

      const parsedMentorId = mentorId ? parseInt(mentorId, 10) : NaN;

      const bookingToCreate = {
        mentor_id: parsedMentorId,
        session_date: sessionDateTime.toISOString(),
        duration_minutes: parseInt(bookingData.durationMinutes, 10),
        notes: bookingData.notes,
        session_type: bookingData.sessionType,
      };

      console.log('Creating booking with data:', bookingToCreate);

      const createdBooking = await BookingService.createBooking(bookingToCreate);

      navigate('/booking-confirmation', {
        state: {
          bookingData: createdBooking,
          mentor,
        },
      });
    } catch (error: unknown) {
      console.error('Error creating booking:', error);

      const bookingError = error as CreateBookingError;
      const errorMessage =
        bookingError.userMessage ||
        bookingError.message ||
        'Ошибка при создании записи';

      setError(errorMessage);
      window.alert(`Не удалось создать запись: ${errorMessage}`);
    } finally {
      setIsBooking(false);
    }
  };

  const handleBackClick = useCallback((): void => {
    navigate(`/mentor/${mentorId}`);
  }, [navigate, mentorId]);

  const minDate = useMemo<string>(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  if (loading) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-loading">
            <div className="loading-spinner"></div>
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-not-found">
            <h2>Ментор не найден</h2>
            <button onClick={() => navigate('/main')} className="back-btn" type="button">
              Вернуться к списку менторов
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <button
            onClick={handleBackClick}
            className="back-btn"
            aria-label="Вернуться к профилю ментора"
            disabled={isBooking}
            type="button"
          >
            ← Назад
          </button>
          <h1>Запись на сессию</h1>
        </div>

        {error && (
          <div className="error-message" role="alert">
            ⚠️ {error}
          </div>
        )}

        <div className="mentor-summary">
          <h2>С ментором: {mentor.name}</h2>
          <div className="mentor-details">
            <div className="detail-item">
              <span className="detail-label">Стиль:</span>
              <span className="detail-value">{mentor.yogaStyle}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Город:</span>
              <span className="detail-value">{mentor.city}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Стоимость (60 мин):</span>
              <span className="detail-value price">{mentor.price} ₽</span>
            </div>
          </div>
        </div>

        <form className="booking-form" onSubmit={handleSubmit} noValidate>
          <div className="form-section">
            <h3>Выберите дату и время</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sessionDate">Дата*</label>
                <input
                  type="date"
                  id="sessionDate"
                  name="sessionDate"
                  value={bookingData.sessionDate}
                  onChange={handleInputChange}
                  min={minDate}
                  required
                  disabled={isBooking}
                />
              </div>

              <div className="form-group">
                <label htmlFor="time">Время*</label>
                <select
                  id="time"
                  name="time"
                  value={bookingData.time}
                  onChange={handleInputChange}
                  required
                  disabled={isBooking}
                >
                  <option value="">Выберите время</option>
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
                <label htmlFor="durationMinutes">Длительность сессии</label>
                <select
                  id="durationMinutes"
                  name="durationMinutes"
                  value={bookingData.durationMinutes}
                  onChange={handleInputChange}
                  disabled={isBooking}
                >
                  <option value="30">30 минут</option>
                  <option value="60">60 минут</option>
                  <option value="90">90 минут</option>
                  <option value="120">120 минут</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="sessionType">Тип сессии</label>
                <select
                  id="sessionType"
                  name="sessionType"
                  value={bookingData.sessionType}
                  onChange={handleInputChange}
                  disabled={isBooking}
                >
                  <option value="individual">Индивидуальная</option>
                  <option value="group">Групповая</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Дополнительная информация</h3>
            <div className="form-group">
              <label htmlFor="notes">Ваши цели и пожелания</label>
              <textarea
                id="notes"
                name="notes"
                value={bookingData.notes}
                onChange={handleInputChange}
                placeholder="Опишите, что вы хотели бы проработать, есть ли особенности здоровья или другие пожелания..."
                rows={4}
                disabled={isBooking}
              />
            </div>
          </div>

          <div className="price-summary">
            <div className="price-details">
              <div className="price-row">
                <span>Базовая стоимость:</span>
                <span>{mentor.price} ₽</span>
              </div>
              <div className="price-row">
                <span>Длительность:</span>
                <span>{bookingData.durationMinutes} мин</span>
              </div>
              <div className="price-row">
                <span>Тип сессии:</span>
                <span>
                  {bookingData.sessionType === 'individual'
                    ? 'Индивидуальная'
                    : 'Групповая'}
                </span>
              </div>
              <div className="price-total">
                <span>Итого к оплате:</span>
                <span className="total-amount">{calculateTotalPrice()} ₽</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleBackClick}
              className="cancel-btn"
              disabled={isBooking}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isBooking || !bookingData.sessionDate || !bookingData.time}
              aria-busy={isBooking}
            >
              {isBooking ? 'ОФОРМЛЕНИЕ...' : 'ПОДТВЕРДИТЬ ЗАПИСЬ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingScreen;