import type { User } from '../types/user';
import type {
  AuthTokens,
  AuthResponse,
  LoginCredentials,
  RegisterData,
} from '../types/auth';
import type { MentorFilters } from '../types/mentor';
import type { NoteData } from '../types/note';
import type { BookingData } from '../types/booking';

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
        errorBody = isJson
          ? await response.json()
          : await response.text();
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

  static async getMentors<T = unknown>(filters: MentorFilters = {}): Promise<T> {
    const queryParams = new URLSearchParams();

    if (filters.city) queryParams.append('city', filters.city);
    if (filters.yoga_style) queryParams.append('yoga_style', filters.yoga_style);
    if (filters.skip !== undefined) queryParams.append('skip', String(filters.skip));
    if (filters.limit !== undefined) queryParams.append('limit', String(filters.limit));

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/mentors?${queryString}` : '/mentors';

    return this.request<T>(endpoint);
  }

  static async getMentorById<T = unknown>(mentorId: string | number): Promise<T> {
    return this.request<T>(`/mentors/${mentorId}`);
  }

  static async getNotes<T = unknown>(skip = 0, limit = 100): Promise<T> {
    return this.request<T>(`/notes?skip=${skip}&limit=${limit}`);
  }

  static async createNote<T = unknown>(noteData: NoteData): Promise<T> {
    return this.request<T>('/notes', {
      method: 'POST',
      body: noteData,
    });
  }

  static async updateNote<T = unknown>(
    noteId: string | number,
    noteData: NoteData
  ): Promise<T> {
    return this.request<T>(`/notes/${noteId}`, {
      method: 'PUT',
      body: noteData,
    });
  }

  static async deleteNote<T = unknown>(noteId: string | number): Promise<T> {
    return this.request<T>(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  static async getBookings<T = unknown>(skip = 0, limit = 100): Promise<T> {
    return this.request<T>(`/bookings?skip=${skip}&limit=${limit}`);
  }

  static async createBooking<T = unknown>(bookingData: BookingData): Promise<T> {
    return this.request<T>('/bookings', {
      method: 'POST',
      body: bookingData,
    });
  }

  static async cancelBooking<T = unknown>(bookingId: string | number): Promise<T> {
    return this.request<T>(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
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