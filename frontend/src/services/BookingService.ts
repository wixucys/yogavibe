import ApiService, { ApiError } from './ApiService';
import type {
  Booking,
  BookingId,
  BookingResponse,
  BookingStatus,
  CreateBookingInput,
  MentorResponse,
  StoredBooking,
  StoredUser,
  UpdateBookingInput,
  UserId,
} from '../types/booking';

interface PaginatedResponse<T> {
  items: T[];
}

class BookingService {
  private static extractItems<T>(response: T[] | PaginatedResponse<T>): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.items)) {
      return response.items;
    }

    return [];
  }

  static async getBookings(): Promise<Booking[]> {
    try {
      const response = await ApiService.request<BookingResponse[] | PaginatedResponse<BookingResponse>>('/bookings', {
        method: 'GET',
      });

      const bookingItems = this.extractItems(response);

      const mentorsResponse = await ApiService.request<MentorResponse[] | PaginatedResponse<MentorResponse>>('/mentors', {
        method: 'GET',
      });

      const mentorItems = this.extractItems(mentorsResponse);

      const mentorsMap: Record<string, MentorResponse> = {};
      mentorItems.forEach((mentor) => {
        mentorsMap[String(mentor.id)] = mentor;
      });

      return bookingItems.map((booking) =>
        this.mapBookingResponseToBooking(booking, mentorsMap[String(booking.mentor_id)])
      );
    } catch (error) {
      console.error('BookingService: Error fetching bookings:', error);
      throw error;
    }
  }

  static async createBooking(bookingData: CreateBookingInput): Promise<Booking> {
    try {
      this.validateBookingData(bookingData);

      const response = await ApiService.request<BookingResponse>('/bookings', {
        method: 'POST',
        body: bookingData,
      });

      const formattedResponse = this.mapBookingResponseToBooking(
        response,
        response.mentor,
        bookingData.mentorName
      );

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
      throw this.createEnhancedError(error, 'Не удалось создать запись');
    }
  }

  static async getBookingById(bookingId: BookingId): Promise<Booking> {
    try {
      const response = await ApiService.request<BookingResponse>(`/bookings/${bookingId}`, {
        method: 'GET',
      });

      return this.mapBookingResponseToBooking(response, response.mentor);
    } catch (error: unknown) {
      console.error('BookingService: Error getting booking:', error);
      throw this.createEnhancedError(error, 'Не удалось получить запись');
    }
  }

  static async updateBooking(
    bookingId: BookingId,
    updateData: UpdateBookingInput
  ): Promise<Booking> {
    try {
      this.validateUpdateData(updateData);

      const response = await ApiService.request<BookingResponse>(`/bookings/${bookingId}`, {
        method: 'PUT',
        body: updateData,
      });

      const updatedBooking = this.mapBookingResponseToBooking(response, response.mentor);
      this.upsertLocalBooking(updatedBooking);

      return updatedBooking;
    } catch (error: unknown) {
      console.error('BookingService: Error updating booking:', error);
      throw this.createEnhancedError(error, 'Не удалось обновить запись');
    }
  }

  static async cancelBooking(bookingId: BookingId): Promise<BookingResponse> {
    try {
      const response = await ApiService.request<BookingResponse>(
        `/bookings/${bookingId}/cancel`,
        {
          method: 'PUT',
        }
      );

      this.updateLocalBookingStatus(bookingId, 'cancelled');

      return response;
    } catch (error: unknown) {
      console.error('BookingService: Error cancelling booking:', error);
      throw this.createEnhancedError(error, 'Не удалось отменить запись');
    }
  }

  static async completeBooking(bookingId: BookingId): Promise<BookingResponse | null> {
    try {
      const response = await ApiService.request<BookingResponse>(
        `/mentor/bookings/${bookingId}/complete`,
        {
          method: 'PUT',
        }
      );

      this.updateLocalBookingStatus(bookingId, 'completed');

      return response;
    } catch (error) {
      console.error('BookingService: Error completing booking:', error);
      throw error;
    }
  }

  static async deleteBooking(bookingId: BookingId): Promise<void> {
    try {
      await ApiService.request<{ message: string }>(`/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      this.removeLocalBooking(bookingId);
    } catch (error: unknown) {
      console.error('BookingService: Error deleting booking:', error);
      throw this.createEnhancedError(error, 'Не удалось удалить запись');
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

  private static mapBookingResponseToBooking(
    booking: BookingResponse,
    mentor?: MentorResponse,
    fallbackMentorName?: string
  ): Booking {
    const resolvedMentor: MentorResponse = mentor || {
      id: booking.mentor_id,
      name: fallbackMentorName || 'Неизвестный ментор',
    };

    return {
      id: booking.id,
      mentorId: booking.mentor_id,
      userId: booking.user_id,
      mentorName:
        resolvedMentor.name || fallbackMentorName || 'Неизвестный ментор',
      mentorCity: resolvedMentor.city,
      mentorYogaStyle: resolvedMentor.yoga_style,
      sessionDate: booking.session_date,
      durationMinutes: booking.duration_minutes,
      price: booking.price,
      status: booking.status || 'active',
      notes: booking.notes,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      sessionType: booking.session_type || 'individual',
    };
  }

  private static validateBookingData(bookingData: CreateBookingInput): void {
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
  }

  private static validateUpdateData(updateData: UpdateBookingInput): void {
    if (updateData.duration_minutes !== undefined && updateData.duration_minutes <= 0) {
      throw new Error('Длительность должна быть больше 0 минут');
    }

    if (updateData.session_date) {
      const sessionDate = new Date(updateData.session_date);
      if (Number.isNaN(sessionDate.getTime())) {
        throw new Error('Некорректный формат даты');
      }

      if (sessionDate <= new Date()) {
        throw new Error('Дата сессии должна быть в будущем');
      }
    }

    if (updateData.notes !== undefined && updateData.notes.trim().length > 1000) {
      throw new Error('Комментарий к записи слишком длинный');
    }
  }

  private static upsertLocalBooking(bookingData: Booking): void {
    try {
      const allBookings = JSON.parse(
        localStorage.getItem('yogavibe_bookings') || '[]'
      ) as StoredBooking[];

      const bookingExists = allBookings.some((booking) => booking.id === bookingData.id);

      const updated = bookingExists
        ? allBookings.map((booking) =>
            booking.id === bookingData.id ? { ...booking, ...bookingData } : booking
          )
        : [...allBookings, bookingData as StoredBooking];

      localStorage.setItem('yogavibe_bookings', JSON.stringify(updated));
    } catch (storageError) {
      console.warn('BookingService: Could not upsert local booking:', storageError);
    }
  }

  private static removeLocalBooking(bookingId: BookingId): void {
    try {
      const allBookings = JSON.parse(
        localStorage.getItem('yogavibe_bookings') || '[]'
      ) as StoredBooking[];

      const filtered = allBookings.filter((booking) => booking.id !== bookingId);
      localStorage.setItem('yogavibe_bookings', JSON.stringify(filtered));
    } catch (storageError) {
      console.warn('BookingService: Could not remove local booking:', storageError);
    }
  }

  private static updateLocalBookingStatus(
    bookingId: BookingId,
    status: BookingStatus
  ): void {
    try {
      const allBookings = JSON.parse(
        localStorage.getItem('yogavibe_bookings') || '[]'
      ) as StoredBooking[];

      const updatedBookings = allBookings.map((booking) => {
        if (booking.id === bookingId) {
          return { ...booking, status };
        }

        return booking;
      });

      localStorage.setItem('yogavibe_bookings', JSON.stringify(updatedBookings));
    } catch (storageError) {
      console.warn('BookingService: Could not update localStorage:', storageError);
    }
  }

  private static createEnhancedError(
    error: unknown,
    fallbackMessage: string
  ): Error & { originalError?: unknown; userMessage?: string } {
    const message = this.getErrorMessage(error, fallbackMessage);

    const enhancedError = new Error(message) as Error & {
      originalError?: unknown;
      userMessage?: string;
    };

    enhancedError.originalError = error;
    enhancedError.userMessage = message;

    return enhancedError;
  }

  private static getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof ApiError) {
      if (error.status === 409) {
        return 'Запись была изменена. Обновите данные и повторите действие';
      }

      if (
        error.body &&
        typeof error.body === 'object' &&
        'detail' in error.body &&
        typeof (error.body as { detail?: unknown }).detail === 'string'
      ) {
        return (error.body as { detail: string }).detail;
      }

      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallbackMessage;
  }
}

export default BookingService;