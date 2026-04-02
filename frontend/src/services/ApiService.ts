import type { AdminDashboard, User } from '../types/user';
import type {
  AuthTokens,
  AuthResponse,
  LoginCredentials,
  RegisterData,
} from '../types/auth';
import type {
  MentorFilters,
  Mentor,
  MentorApi,
  MentorCreatePayload,
  MentorAdminUpdatePayload,
} from '../types/mentor';
import type { NoteData, Note } from '../types/note';
import type { BookingData, Booking } from '../types/booking';

class ApiError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type JsonBody = object | unknown[];
type RequestBody = BodyInit | JsonBody | null | undefined;

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
  body?: RequestBody;
}

class ApiService {
  static BASE_URL = 'http://localhost:8000/api/v1';
  static REFRESH_ENDPOINT = '/auth/refresh';

  static async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const token = localStorage.getItem('yogavibe_token');
    const { body, headers: customHeaders = {}, ...restOptions } = options;

    const isNativeBody =
      typeof body === 'string' ||
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob ||
      body instanceof ArrayBuffer;

    const headers: Record<string, string> = {
      ...customHeaders,
    };

    if (body !== undefined && body !== null && !isNativeBody) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...restOptions,
      headers,
    };

    if (body !== undefined && body !== null) {
      config.body = isNativeBody ? body : JSON.stringify(body);
    }

    const url = endpoint.startsWith('/')
      ? `${this.BASE_URL}${endpoint}`
      : `${this.BASE_URL}/${endpoint}`;

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && endpoint !== this.REFRESH_ENDPOINT) {
        const refreshSuccess = await this.refreshAccessToken();

        if (refreshSuccess) {
          const newToken = localStorage.getItem('yogavibe_token');
          const retryHeaders: Record<string, string> = { ...headers };

          if (newToken) {
            retryHeaders.Authorization = `Bearer ${newToken}`;
          }

          const retryConfig: RequestInit = {
            ...restOptions,
            headers: retryHeaders,
          };

          if (body !== undefined && body !== null) {
            retryConfig.body = isNativeBody ? body : JSON.stringify(body);
          }

          const retryResponse = await fetch(url, retryConfig);
          return this.handleResponse<T>(retryResponse);
        }

        this.clearAuth();
        window.location.href = '/login';
        throw new ApiError('Session expired. Please login again.', 401);
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`API request error (${endpoint}):`, error);
      throw error;
    }
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorBody: unknown;

      try {
        errorBody = isJson ? await response.json() : await response.text();
      } catch {
        errorBody = {
          detail: `HTTP ${response.status}: Failed to parse error response`,
        };
      }

      const message =
        typeof errorBody === 'object' &&
        errorBody !== null &&
        'detail' in errorBody &&
        typeof (errorBody as { detail?: unknown }).detail === 'string'
          ? (errorBody as { detail: string }).detail
          : `HTTP ${response.status}`;

      throw new ApiError(message, response.status, errorBody);
    }

    try {
      if (isJson) {
        return (await response.json()) as T;
      }

      return (await response.text()) as T;
    } catch {
      throw new ApiError('Failed to parse response', response.status);
    }
  }

  static async refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('yogavibe_refresh_token');

    if (!refreshToken || refreshToken.includes('mock_')) {
      this.clearAuth();
      return false;
    }

    try {
      const response = await fetch(`${this.BASE_URL}${this.REFRESH_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as AuthTokens;

      localStorage.setItem('yogavibe_token', data.access_token);
      localStorage.setItem('yogavibe_refresh_token', data.refresh_token);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  static clearAuth(): void {
    localStorage.removeItem('yogavibe_token');
    localStorage.removeItem('yogavibe_refresh_token');
    localStorage.removeItem('yogavibe_user');
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: credentials,
    });

    if (data.access_token && data.refresh_token) {
      localStorage.setItem('yogavibe_token', data.access_token);
      localStorage.setItem('yogavibe_refresh_token', data.refresh_token);

      if (data.user) {
        localStorage.setItem('yogavibe_user', JSON.stringify(data.user));
      }
    }

    return data;
  }

  static async register(userData: RegisterData): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: userData,
    });

    if (data.access_token && data.refresh_token) {
      localStorage.setItem('yogavibe_token', data.access_token);
      localStorage.setItem('yogavibe_refresh_token', data.refresh_token);

      if (data.user) {
        localStorage.setItem('yogavibe_user', JSON.stringify(data.user));
      }
    }

    return data;
  }

  static async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('yogavibe_refresh_token');

    if (refreshToken) {
      try {
        await this.request<void>('/auth/logout', {
          method: 'POST',
          body: { refresh_token: refreshToken },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.clearAuth();
  }

  static async getCurrentUser(): Promise<User> {
    return this.request<User>('/users/me');
  }

  static async updateUserProfile(userData: Partial<User>): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PUT',
      body: userData,
    });
  }

  static async getMentors(filters: MentorFilters = {}): Promise<Mentor[]> {
    const queryParams = new URLSearchParams();

    if (filters.city) queryParams.append('city', filters.city);
    if (filters.yoga_style) queryParams.append('yoga_style', filters.yoga_style);
    if (filters.skip !== undefined) queryParams.append('skip', String(filters.skip));
    if (filters.limit !== undefined) queryParams.append('limit', String(filters.limit));

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/mentors?${queryString}` : '/mentors';

    return this.request<Mentor[]>(endpoint);
  }

  static async getMentorById(mentorId: string | number): Promise<Mentor> {
    return this.request<Mentor>(`/mentors/${mentorId}`);
  }

  static async getMyMentorProfile(): Promise<MentorApi> {
    return this.request<MentorApi>('/mentor/me');
  }

  static async updateMyMentorProfile(
    profileData: Partial<MentorAdminUpdatePayload>
  ): Promise<MentorApi> {
    return this.request<MentorApi>('/mentor/me', {
      method: 'PUT',
      body: profileData,
    });
  }

  static async getAdminMentors(
    skip = 0,
    limit = 100
  ): Promise<MentorApi[]> {
    return this.request<MentorApi[]>(`/admin/mentors?skip=${skip}&limit=${limit}`);
  }

  static async createAdminMentor(
    mentorData: MentorCreatePayload
  ): Promise<MentorApi> {
    return this.request<MentorApi>('/admin/mentors', {
      method: 'POST',
      body: mentorData,
    });
  }

  static async updateAdminMentor(
    mentorId: string | number,
    mentorData: MentorAdminUpdatePayload
  ): Promise<MentorApi> {
    return this.request<MentorApi>(`/admin/mentors/${mentorId}`, {
      method: 'PUT',
      body: mentorData,
    });
  }

  static async deleteAdminMentor(
    mentorId: string | number
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/mentors/${mentorId}`, {
      method: 'DELETE',
    });
  }

  static async getNotes(skip = 0, limit = 100): Promise<Note[]> {
    return this.request<Note[]>(`/notes?skip=${skip}&limit=${limit}`);
  }

  static async createNote(noteData: NoteData): Promise<Note> {
    return this.request<Note>('/notes', {
      method: 'POST',
      body: noteData,
    });
  }

  static async updateNote(noteId: string | number, noteData: NoteData): Promise<Note> {
    return this.request<Note>(`/notes/${noteId}`, {
      method: 'PUT',
      body: noteData,
    });
  }

  static async deleteNote(noteId: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  static async getBookings(skip = 0, limit = 100): Promise<Booking[]> {
    return this.request<Booking[]>(`/bookings?skip=${skip}&limit=${limit}`);
  }

  static async getMentorBookings(skip = 0, limit = 100): Promise<Booking[]> {
    return this.request<Booking[]>(`/mentor/bookings?skip=${skip}&limit=${limit}`);
  }

  static async createBooking(bookingData: BookingData): Promise<Booking> {
    return this.request<Booking>('/bookings', {
      method: 'POST',
      body: bookingData,
    });
  }

  static async cancelBooking(
    bookingId: string | number
  ): Promise<Booking> {
    return this.request<Booking>(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
    });
  }

  static async getAdminUsers(skip = 0, limit = 100): Promise<User[]> {
    return this.request<User[]>(`/admin/users?skip=${skip}&limit=${limit}`);
  }

  static async getAdminDashboard(): Promise<AdminDashboard> {
    return this.request<AdminDashboard>('/admin/dashboard');
  }

  static async updateAdminUser(
    userId: number | string,
    userData: Partial<User>
  ): Promise<User> {
    return this.request<User>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: userData,
    });
  }

  static async deleteAdminUser(
    userId: number | string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  static isAuthenticated(): boolean {
    return Boolean(localStorage.getItem('yogavibe_token'));
  }

  static getUserData(): User | null {
    const userStr = localStorage.getItem('yogavibe_user');

    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Failed to parse user data from localStorage:', error);
      return null;
    }
  }

  static setUserData(user: User): void {
    localStorage.setItem('yogavibe_user', JSON.stringify(user));
  }

  static getAccessToken(): string | null {
    return localStorage.getItem('yogavibe_token');
  }
}

export default ApiService;
export { ApiError };