// src/screens/MyBookingsScreen/MyBookingsScreen.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import BookingService from '../../services/BookingService';
import './MyBookingScreen.css';

const BookingCard = ({ 
  booking, 
  now, 
  onCancel, 
  onViewMentor 
}) => {
  const statusLabels = {
    'active': { text: 'Активная', className: 'status-active' },
    'completed': { text: 'Завершена', className: 'status-completed' },
    'cancelled': { text: 'Отменена', className: 'status-cancelled' }
  };
  
  // Определяем фактический статус для отображения
  let displayStatus = booking.status;
  if (booking.status === 'active' && booking.sessionDate <= now) {
    displayStatus = 'completed';
  }
  
  const statusInfo = statusLabels[displayStatus] || 
    { text: booking.status, className: 'status-default' };
  
  // Можно отменять только активные записи в будущем
  const canCancel = booking.status === 'active' && booking.sessionDate > now;
  
  const formatTime = (date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
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
        <div className="booking-id">
          Запись #{booking.id}
        </div>
      </div>
      
      <div className="booking-details">
        <div className="detail-row">
          <span className="detail-label">Дата:</span>
          <span className="detail-value">
            {booking.sessionDate.toLocaleDateString('ru-RU', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
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
        >
          Профиль ментора
        </button>
        
        {canCancel && (
          <button 
            onClick={() => onCancel(booking.id)}
            className="action-btn cancel-btn"
          >
            Отменить запись
          </button>
        )}
      </div>
    </div>
  );
};

BookingCard.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    mentorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    mentorName: PropTypes.string.isRequired,
    sessionDate: PropTypes.instanceOf(Date).isRequired,
    durationMinutes: PropTypes.number.isRequired,
    price: PropTypes.number.isRequired,
    status: PropTypes.oneOf(['active', 'completed', 'cancelled']).isRequired,
    notes: PropTypes.string,
    sessionType: PropTypes.oneOf(['individual', 'group'])
  }).isRequired,
  now: PropTypes.instanceOf(Date).isRequired,
  onCancel: PropTypes.func.isRequired,
  onViewMentor: PropTypes.func.isRequired
};

const StatsCard = ({ value, label }) => (
  <div className="stat-card">
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

StatsCard.propTypes = {
  value: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired
};

const MyBookingsScreen = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  // Эффект для обновления прошедших бронирований
  useEffect(() => {
    const updatePastBookings = async () => {
      if (bookings.length === 0) return;
      
      const now = new Date();
      const pastActive = bookings.filter(booking => 
        booking.status === 'active' && booking.sessionDate <= now
      );
      
      if (pastActive.length === 0) return;
      
      // Обновляем каждый прошедший booking
      for (const booking of pastActive) {
        try {
          await BookingService.completeBooking(booking.id);
          
          // Обновляем состояние без мутации
          setBookings(prev => prev.map(b => 
            b.id === booking.id ? { ...b, status: 'completed' } : b
          ));
        } catch (error) {
          console.error('Error auto-completing booking:', error);
        }
      }
    };
    
    updatePastBookings();
  }, [bookings]);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const serverBookings = await BookingService.getBookings();
      
      const formattedBookings = serverBookings.map(booking => {
      
        const formattedBooking = {
          id: booking.id,
          mentorId: booking.mentor_id,
          mentorName: booking.mentor?.name || 'Неизвестный ментор',
          sessionDate: new Date(booking.session_date),
          durationMinutes: booking.duration_minutes,
          price: booking.price,
          status: booking.status || 'active',
          notes: booking.notes,
          createdAt: booking.created_at ? new Date(booking.created_at) : new Date(),
          sessionType: booking.session_type || 'individual'
        };
        
        if (booking.mentor && typeof booking.mentor === 'object') {
          formattedBooking.mentorCity = booking.mentor.city;
          formattedBooking.mentorYogaStyle = booking.mentor.yoga_style;
        }
      
      return formattedBooking;
    });
      
      setBookings(formattedBookings);
      
    } catch (error) {
      console.error('Error loading bookings:', error);
      setError(error.message || 'Ошибка загрузки записей');
      
      // Fallback на локальные данные
      try {
        const allBookings = JSON.parse(localStorage.getItem('yogavibe_bookings') || '[]');
        const user = JSON.parse(localStorage.getItem('yogavibe_user') || '{}');
        
        if (user.id) {
          const userBookings = allBookings.filter(b => b.userId === user.id);
          // Конвертируем строки дат в Date объекты
          const formattedUserBookings = userBookings.map(booking => ({
            ...booking,
            sessionDate: new Date(booking.sessionDate),
            createdAt: new Date(booking.createdAt || booking.created_at)
          }));
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
    
    // Активные: статус active И дата в будущем
    const active = bookings.filter(booking => 
      booking.status === 'active' && booking.sessionDate > now
    );
    
    // Завершенные: статус completed ИЛИ (статус active И дата в прошлом)
    const completed = bookings.filter(booking => 
      booking.status === 'completed' || 
      (booking.status === 'active' && booking.sessionDate <= now)
    );
    
    // Отмененные: только статус cancelled
    const cancelled = bookings.filter(booking => booking.status === 'cancelled');
    
    // Определяем какие записи показывать на текущей вкладке
    let filtered;
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
        total: bookings.length
      },
      now
    };
  }, [bookings, activeTab]);

  const handleBookNewSession = () => {
    navigate('/main', { state: { activeNav: 'МЕНТОРЫ' } });
  };

  const handleCancelBooking = useCallback(async (bookingId) => {
    if (window.confirm('Вы уверены, что хотите отменить эту запись?')) {
      try {
        setError(null);
        
        await BookingService.cancelBooking(bookingId);
        
        // Обновляем локальное состояние
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'cancelled' } 
            : booking
        ));
        
        // Обновляем локальное хранилище
        try {
          const allBookings = JSON.parse(localStorage.getItem('yogavibe_bookings') || '[]');
          const updatedBookings = allBookings.map(booking => {
            if (booking.id === bookingId) {
              return { ...booking, status: 'cancelled' };
            }
            return booking;
          });
          
          localStorage.setItem('yogavibe_bookings', JSON.stringify(updatedBookings));
        } catch (localError) {
          console.error('Error updating local storage:', localError);
        }
        
      } catch (error) {
        console.error('Error cancelling booking:', error);
        setError(error.body?.detail || error.message || 'Ошибка отмены записи');
        alert('Не удалось отменить запись');
      }
    }
  }, []);

  const handleViewMentor = useCallback((mentorId) => {
    navigate(`/mentor/${mentorId}`);
  }, [navigate]);

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

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Табы фильтрации */}
        <div className="bookings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Активные
            <span className="tab-count">
              {counts.active}
            </span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Завершенные
            <span className="tab-count">
              {counts.completed}
            </span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Отмененные
            <span className="tab-count">
              {counts.cancelled}
            </span>
          </button>
        </div>

        {/* Список записей */}
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
                  : 'У вас нет отмененных записей'
                }
              </p>
            </div>
          ) : (
            filteredBookings.map(booking => (
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

        {/* Статистика */}
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