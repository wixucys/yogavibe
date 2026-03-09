import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './BookingConfirmationScreen.css';

const BookingConfirmationScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mentor, setMentor] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBookingData = () => {
      try {
        if (location.state?.bookingData && location.state?.mentor) {
          const data = location.state.bookingData;
          const mentorInfo = location.state.mentor;
          
          // Валидация данных
          if (!data.id || !data.sessionDate) {
            throw new Error('Неполные данные бронирования');
          }
          
          setBookingData(data);
          setMentor(mentorInfo);
          setError(null);
        } else {
          setError('Данные бронирования не найдены');
        }
      } catch (err) {
        setError(`Ошибка загрузки: ${err.message}`);
        console.error('Error loading booking data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadBookingData();
  }, [location]);

  const handleGoToMain = () => {
    navigate('/main');
  };

  const handleGoToMyBookings = () => {
    navigate('/main', { state: { activeNav: 'МОИ ЗАПИСИ' } });
  };

  const extractTimeFromDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error parsing date:', error);
      return '--:--';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'Дата не указана';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  if (loading) {
    return (
      <div className="confirmation-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка информации о записи...</p>
      </div>
    );
  }

  if (error || !bookingData) {
    return (
      <div className="confirmation-not-found">
        <h2>Информация о записи не найдена</h2>
        <p>{error || 'Не удалось загрузить данные о бронировании'}</p>
        <Link to="/main" className="action-btn primary">
          На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">
        <div className="confirmation-header">
          <h1>Запись подтверждена!</h1>
          <p className="confirmation-subtitle">
            Ваша сессия успешно забронирована
          </p>
        </div>

        <div className="success-icon-large">
          ✓
        </div>

        <div className="booking-summary">
          <h2>Детали вашей записи</h2>
          
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Ментор:</span>
              <span className="summary-value">
                {mentor?.name || bookingData.mentorName || 'Не указан'}
              </span>
            </div>
            
            <div className="summary-item">
              <span className="summary-label">Дата:</span>
              <span className="summary-value">{formatDate(bookingData.sessionDate)}</span>
            </div>
            
            <div className="summary-item">
              <span className="summary-label">Время:</span>
              <span className="summary-value">
                {extractTimeFromDate(bookingData.sessionDate)}
              </span>
            </div>
            
            <div className="summary-item">
              <span className="summary-label">Длительность:</span>
              <span className="summary-value">{bookingData.durationMinutes || 60} минут</span>
            </div>
            
            <div className="summary-item">
              <span className="summary-label">Тип сессии:</span>
              <span className="summary-value">
                {bookingData.sessionType === 'group' ? 'Групповая' : 'Индивидуальная'}
              </span>
            </div>
            
            <div className="summary-item">
              <span className="summary-label">Стоимость:</span>
              <span className="summary-value price">
                {formatPrice(bookingData.price || bookingData.totalPrice || 0)}
              </span>
            </div>
            
            <div className="summary-item full-width">
              <span className="summary-label">Номер записи:</span>
              <span className="summary-value booking-id">
                #{bookingData.id.toString().padStart(6, '0')}
              </span>
            </div>
            
            <div className="summary-item full-width">
              <span className="summary-label">Статус:</span>
              <span className="summary-value status-confirmed">
                {bookingData.status === 'confirmed' ? '✅ Активная' : '⏳ Ожидает подтверждения'}
              </span>
            </div>
            
            {bookingData.notes && (
              <div className="summary-item full-width">
                <span className="summary-label">Ваши пожелания:</span>
                <span className="summary-value">
                  {bookingData.notes}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="contact-info">
          <h3>Контактная информация</h3>
          <p>
            Если у вас возникли вопросы, напишите нам на support@yogavibe.ru 
            или позвоните по номеру 8-800-XXX-XX-XX
          </p>
          {mentor && (
            <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
              Ментор: {mentor.city}, {mentor.yogaStyle || 'Инструктор по йоге'}
            </p>
          )}
        </div>

        <div className="confirmation-actions">
          <button 
            onClick={handleGoToMain} 
            className="action-btn primary"
            aria-label="Перейти на главную страницу"
          >
            На главную
          </button>
          <button 
            onClick={handleGoToMyBookings} 
            className="action-btn secondary"
            aria-label="Посмотреть все мои записи"
          >
            Мои записи
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationScreen;