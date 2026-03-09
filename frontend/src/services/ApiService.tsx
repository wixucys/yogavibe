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

export interface User {
  id?: string | number;
  username?: string;
  email?: string;
  city?: string;
  yoga_style?: string;
  [key: string]: unknown;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse extends Partial<AuthTokens> {
  user?: User;
  [key: string]: unknown;
}

export interface LoginCredentials {
  login?: string;
  email?: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface MentorFilters {
  city?: string;
  yoga_style?: string;
  skip?: number | string;
  limit?: number | string;
}

export interface NoteData {
  [key: string]: unknown;
}

export interface BookingData {
  [key: string]: unknown;
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const { body, ...restOptions } = options;

    const config: RequestInit = {
      ...restOptions,
      headers,
    };

    if (body !== undefined && body !== null) {
      const isNativeBody =
        typeof body === 'string' ||
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        body instanceof Blob ||
        body instanceof ArrayBuffer;

      config.body = isNativeBody ? body : JSON.stringify(body);
    }

    try {
      const url = endpoint.startsWith('/')
        ? `${this.BASE_URL}${endpoint}`
        : `${this.BASE_URL}/${endpoint}`;

      const response = await fetch(url, config);

      if (response.status === 401 && endpoint !== this.REFRESH_ENDPOINT) {
        console.log('Token expired, trying to refresh...');
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
            const isNativeBody =
              typeof body === 'string' ||
              body instanceof FormData ||
              body instanceof URLSearchParams ||
              body instanceof Blob ||
              body instanceof ArrayBuffer;

            retryConfig.body = isNativeBody ? body : JSON.stringify(body);
          }

          const retryResponse = await fetch(url, retryConfig);
          return this._handleResponse<T>(retryResponse);
        }

        this.clearAuth();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }

      return this._handleResponse<T>(response);
    } catch (error) {
      console.error(`API request error (${endpoint}):`, error);
      throw error;
    }
  }

  static async _handleResponse<T = unknown>(response: Response): Promise<T> {
    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorBody: unknown;

      try {
        errorBody = isJson
          ? await response.json().catch(() => ({ detail: 'Unknown error' }))
          : await response.text().catch(() => 'Unknown error');
      } catch {
        errorBody = { detail: `HTTP ${response.status}: Failed to parse error response` };
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
      return (isJson ? await response.json() : await response.text()) as T;
    } catch {
      throw new Error('Failed to parse response');
    }
  }

  static async refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('yogavibe_refresh_token');

    if (refreshToken && refreshToken.includes('mock_')) {
      console.log('Mock token detected, clearing auth');
      this.clearAuth();
      return false;
    }

    if (!refreshToken) {
      console.log('No refresh token available');
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

      if (response.ok) {
        const data = (await response.json()) as AuthTokens;

        localStorage.setItem('yogavibe_token', data.access_token);
        localStorage.setItem('yogavibe_refresh_token', data.refresh_token);

        console.log('Token refreshed successfully');
        return true;
      }

      console.log('Refresh token is invalid');
      return false;
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
        await this.request('/auth/logout', {
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

  static async updateUserProfile(userData: Record<string, unknown>): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PUT',
      body: userData,
    });
  }

  static async getMentors<T = unknown>(filters: MentorFilters = {}): Promise<T> {
    const queryParams = new URLSearchParams();

    if (filters.city) queryParams.append('city', String(filters.city));
    if (filters.yoga_style) queryParams.append('yoga_style', String(filters.yoga_style));
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
    return !!localStorage.getItem('yogavibe_token');
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