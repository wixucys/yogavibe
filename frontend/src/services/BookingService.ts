import ApiService, { ApiError } from './ApiService';

type BookingId = string | number;
type UserId = string | number;
type MentorId = string | number;
type BookingStatus = 'active' | 'completed' | 'cancelled';
type SessionType = 'individual' | 'group';

interface MentorResponse {
  id: MentorId;
  name?: string;
  city?: string;
  yoga_style?: string;
  [key: string]: unknown;
}

interface BookingResponse {
  id: BookingId;
  mentor_id: MentorId;
  user_id?: UserId;
  mentor?: MentorResponse;
  session_date: string;
  duration_minutes: number;
  price: number;
  status?: BookingStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  session_type?: SessionType;
  [key: string]: unknown;
}

export interface Booking {
  id: BookingId;
  mentorId: MentorId;
  userId?: UserId;
  mentorName: string;
  mentorCity?: string;
  mentorYogaStyle?: string;
  sessionDate: string;
  durationMinutes: number;
  price: number;
  status: BookingStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  sessionType?: SessionType;
}

export interface CreateBookingInput {
  mentor_id: MentorId;
  session_date: string;
  duration_minutes: number;
  price?: number;
  notes?: string;
  session_type?: SessionType;
  mentorName?: string;
  [key: string]: unknown;
}

interface StoredBooking extends Booking {
  userId?: UserId;
}

interface StoredUser {
  id?: UserId;
  [key: string]: unknown;
}

class BookingService {
  static async getBookings(): Promise<Booking[]> {
    try {
      console.log('BookingService: Getting bookings...');

      const response = await ApiService.request<BookingResponse[]>('/bookings', {
        method: 'GET',
      });
      console.log('BookingService: Bookings received:', response);

      const mentorsResponse = await ApiService.request<MentorResponse[]>('/mentors', {
        method: 'GET',
      });

      const mentorsMap: Record<string, MentorResponse> = {};
      mentorsResponse.forEach((mentor) => {
        mentorsMap[String(mentor.id)] = mentor;
      });

      return response.map((booking) => {
        const mentor =
          mentorsMap[String(booking.mentor_id)] || {
            id: booking.mentor_id,
            name: 'Неизвестный ментор',
          };

        return {
          id: booking.id,
          mentorId: booking.mentor_id,
          userId: booking.user_id,
          mentorName: mentor.name || 'Неизвестный ментор',
          mentorCity: mentor.city,
          mentorYogaStyle: mentor.yoga_style,
          sessionDate: booking.session_date,
          durationMinutes: booking.duration_minutes,
          price: booking.price,
          status: booking.status || 'active',
          notes: booking.notes,
          createdAt: booking.created_at,
          updatedAt: booking.updated_at,
          sessionType: booking.session_type || 'individual',
        };
      });
    } catch (error) {
      console.error('BookingService: Error fetching bookings:', error);
      throw error;
    }
  }

  static async createBooking(bookingData: CreateBookingInput): Promise<Booking> {
    try {
      console.log('BookingService: Creating booking:', bookingData);

      if (!bookingData.mentor_id) {
        throw new Error('Не указан ID ментора');
      }

      if (!bookingData.session_date) {
        throw new Error('Не указана дата сессии');
      }

      if (!bookingData.duration_minutes || bookingData.duration_minutes <= 0) {
        throw new Error('Длительность должна быть больше 0 минут');
      }

      const sessionDate = new Date(bookingData.session_date);
      if (Number.isNaN(sessionDate.getTime())) {
        throw new Error('Некорректный формат даты');
      }

      const now = new Date();
      if (sessionDate <= now) {
        throw new Error('Дата сессии должна быть в будущем');
      }

      console.log('BookingService: Sending to backend:', bookingData);

      const response = await ApiService.request<BookingResponse>('/bookings', {
        method: 'POST',
        body: bookingData,
      });

      console.log('BookingService: Booking created successfully:', response);

      const formattedResponse: Booking = {
        id: response.id,
        mentorId: response.mentor_id,
        userId: response.user_id,
        mentorName: response.mentor?.name || bookingData.mentorName || 'Неизвестный ментор',
        mentorCity: response.mentor?.city,
        mentorYogaStyle: response.mentor?.yoga_style,
        sessionDate: response.session_date,
        durationMinutes: response.duration_minutes,
        price: response.price,
        status: response.status || 'active',
        notes: response.notes,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        sessionType: response.session_type || 'individual',
      };

      try {
        const allBookings = JSON.parse(
          localStorage.getItem('yogavibe_bookings') || '[]'
        ) as StoredBooking[];
        const user = JSON.parse(
          localStorage.getItem('yogavibe_user') || '{}'
        ) as StoredUser;

        const bookingForStorage: StoredBooking = {
          ...formattedResponse,
          userId: user.id,
          mentorName: bookingData.mentorName || formattedResponse.mentorName,
        };

        allBookings.push(bookingForStorage);
        localStorage.setItem('yogavibe_bookings', JSON.stringify(allBookings));
      } catch (storageError) {
        console.warn('BookingService: Could not save to localStorage:', storageError);
      }

      return formattedResponse;
    } catch (error: unknown) {
      console.error('BookingService: Error creating booking:', error);

      const apiError = error as ApiError;
      const errorMessage =
        (typeof apiError.body === 'object' &&
          apiError.body !== null &&
          'detail' in apiError.body &&
          typeof (apiError.body as { detail?: unknown }).detail === 'string' &&
          (apiError.body as { detail: string }).detail) ||
        apiError.message ||
        'Не удалось создать запись';

      const enhancedError = new Error(errorMessage) as Error & {
        originalError?: unknown;
        userMessage?: string;
      };

      enhancedError.originalError = error;
      enhancedError.userMessage = errorMessage;

      throw enhancedError;
    }
  }

  static async cancelBooking(bookingId: BookingId): Promise<BookingResponse> {
    try {
      console.log('BookingService: Cancelling booking:', bookingId);

      const response = await ApiService.request<BookingResponse>(
        `/bookings/${bookingId}/cancel`,
        {
          method: 'PUT',
        }
      );

      console.log('BookingService: Booking cancelled successfully:', response);

      try {
        const allBookings = JSON.parse(
          localStorage.getItem('yogavibe_bookings') || '[]'
        ) as StoredBooking[];

        const updatedBookings = allBookings.map((booking) => {
          if (booking.id === bookingId) {
            return { ...booking, status: 'cancelled' as BookingStatus };
          }
          return booking;
        });

        localStorage.setItem('yogavibe_bookings', JSON.stringify(updatedBookings));
      } catch (storageError) {
        console.warn('BookingService: Could not update localStorage:', storageError);
      }

      return response;
    } catch (error: unknown) {
      console.error('BookingService: Error cancelling booking:', error);

      const apiError = error as ApiError;
      const message =
        (typeof apiError.body === 'object' &&
          apiError.body !== null &&
          'detail' in apiError.body &&
          typeof (apiError.body as { detail?: unknown }).detail === 'string' &&
          (apiError.body as { detail: string }).detail) ||
        apiError.message ||
        'Не удалось отменить запись';

      const enhancedError = new Error(message) as Error & {
        originalError?: unknown;
      };

      enhancedError.originalError = error;

      throw enhancedError;
    }
  }

  // Добавлен, потому что используется в MyBookingsScreen
  static async completeBooking(bookingId: BookingId): Promise<BookingResponse | null> {
    try {
      console.log('BookingService: Completing booking:', bookingId);

      // Если на бэкенде такого эндпоинта нет, можно позже заменить на реальный.
      // Пока используем предполагаемый маршрут.
      const response = await ApiService.request<BookingResponse>(
        `/bookings/${bookingId}/complete`,
        {
          method: 'PUT',
        }
      );

      try {
        const allBookings = JSON.parse(
          localStorage.getItem('yogavibe_bookings') || '[]'
        ) as StoredBooking[];

        const updatedBookings = allBookings.map((booking) => {
          if (booking.id === bookingId) {
            return { ...booking, status: 'completed' as BookingStatus };
          }
          return booking;
        });

        localStorage.setItem('yogavibe_bookings', JSON.stringify(updatedBookings));
      } catch (storageError) {
        console.warn('BookingService: Could not update localStorage:', storageError);
      }

      return response;
    } catch (error) {
      console.error('BookingService: Error completing booking:', error);
      throw error;
    }
  }

  static getLocalBookings(userId: UserId): StoredBooking[] {
    try {
      const allBookings = JSON.parse(
        localStorage.getItem('yogavibe_bookings') || '[]'
      ) as StoredBooking[];

      return allBookings.filter((booking) => booking.userId === userId);
    } catch (error) {
      console.error('BookingService: Error getting local bookings:', error);
      return [];
    }
  }
}

export default BookingService;