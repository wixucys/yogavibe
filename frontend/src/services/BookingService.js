import ApiService from './ApiService';

class BookingService {
  // Получение всех бронирований пользователя
  static async getBookings() {
    try {
      console.log('BookingService: Getting bookings...');
      const response = await ApiService.request('/bookings', {
        method: 'GET'
      });
      console.log('BookingService: Bookings received:', response);
      
      // Сначала получаем всех менторов
      const mentorsResponse = await ApiService.request('/mentors', {
        method: 'GET'
      });
      
      // Создаем карту менторов по ID
      const mentorsMap = {};
      mentorsResponse.forEach(mentor => {
        mentorsMap[mentor.id] = mentor;
      });
      
      // Конвертируем snake_case в camelCase и добавляем данные ментора
      return response.map(booking => {
        const mentor = mentorsMap[booking.mentor_id] || { name: 'Неизвестный ментор' };
        
        return {
          id: booking.id,
          mentorId: booking.mentor_id,
          userId: booking.user_id,
          mentorName: mentor.name,
          mentorCity: mentor.city,
          mentorYogaStyle: mentor.yoga_style,
          sessionDate: booking.session_date,
          durationMinutes: booking.duration_minutes,
          price: booking.price,
          status: booking.status,
          notes: booking.notes,
          createdAt: booking.created_at,
          updatedAt: booking.updated_at
        };
      });
      
    } catch (error) {
      console.error('BookingService: Error fetching bookings:', error);
      throw error;
    }
  }

  // Создание нового бронирования
  static async createBooking(bookingData) {
    try {
      console.log('BookingService: Creating booking:', bookingData);
      
      // Валидация входных данных
      if (!bookingData.mentor_id) {
        throw new Error('Не указан ID ментора');
      }
      
      if (!bookingData.session_date) {
        throw new Error('Не указана дата сессии');
      }
      
      if (!bookingData.duration_minutes || bookingData.duration_minutes <= 0) {
        throw new Error('Длительность должна быть больше 0 минут');
      }
      
      // Проверяем формат даты
      const sessionDate = new Date(bookingData.session_date);
      if (isNaN(sessionDate.getTime())) {
        throw new Error('Некорректный формат даты');
      }
      
      // Проверяем, что дата в будущем
      const now = new Date();
      if (sessionDate <= now) {
        throw new Error('Дата сессии должна быть в будущем');
      }
      
      console.log('BookingService: Sending to backend:', bookingData);
      
      const response = await ApiService.request('/bookings', {
        method: 'POST',
        body: bookingData
      });
      
      console.log('BookingService: Booking created successfully:', response);
      
      // Конвертируем ответ в camelCase
      const formattedResponse = {
        id: response.id,
        mentorId: response.mentor_id,
        userId: response.user_id,
        mentorName: response.mentor?.name || 'Неизвестный ментор',
        sessionDate: response.session_date,
        durationMinutes: response.duration_minutes,
        price: response.price,
        status: response.status,
        notes: response.notes,
        createdAt: response.created_at,
        updatedAt: response.updated_at
      };
      
      // Сохраняем в localStorage как fallback
      try {
        const allBookings = JSON.parse(localStorage.getItem('yogavibe_bookings') || '[]');
        const user = JSON.parse(localStorage.getItem('yogavibe_user') || '{}');
        
        const bookingForStorage = {
          ...formattedResponse,
          userId: user.id,
          mentorName: bookingData.mentorName || 'Неизвестный ментор'
        };
        
        allBookings.push(bookingForStorage);
        localStorage.setItem('yogavibe_bookings', JSON.stringify(allBookings));
      } catch (storageError) {
        console.warn('BookingService: Could not save to localStorage:', storageError);
      }
      
      return formattedResponse;
      
    } catch (error) {
      console.error('BookingService: Error creating booking:', error);
      
      // Улучшаем сообщение об ошибке
      let errorMessage = 'Не удалось создать запись';
      
      if (error.body?.detail) {
        errorMessage = error.body.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      enhancedError.userMessage = errorMessage;
      
      throw enhancedError;
    }
  }

  // Отмена бронирования
  static async cancelBooking(bookingId) {
    try {
      console.log('BookingService: Cancelling booking:', bookingId);
      
      const response = await ApiService.request(`/bookings/${bookingId}/cancel`, {
        method: 'PUT'
      });
      
      console.log('BookingService: Booking cancelled successfully:', response);
      
      // Обновляем localStorage
      try {
        const allBookings = JSON.parse(localStorage.getItem('yogavibe_bookings') || '[]');
        const updatedBookings = allBookings.map(booking => {
          if (booking.id === bookingId) {
            return { ...booking, status: 'cancelled' };
          }
          return booking;
        });
        
        localStorage.setItem('yogavibe_bookings', JSON.stringify(updatedBookings));
      } catch (storageError) {
        console.warn('BookingService: Could not update localStorage:', storageError);
      }
      
      return response;
    } catch (error) {
      console.error('BookingService: Error cancelling booking:', error);
      
      const enhancedError = new Error(
        error.body?.detail || error.message || 'Не удалось отменить запись'
      );
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  }

  // Получение бронирований из localStorage
  static getLocalBookings(userId) {
    try {
      const allBookings = JSON.parse(localStorage.getItem('yogavibe_bookings') || '[]');
      return allBookings.filter(booking => booking.userId === userId);
    } catch (error) {
      console.error('BookingService: Error getting local bookings:', error);
      return [];
    }
  }
}

export default BookingService;