// src/services/ApiService.js

class ApiService {
  static BASE_URL = 'http://localhost:8000/api/v1';
  static REFRESH_ENDPOINT = '/auth/refresh';

  // Общий метод для запросов с автоматическим обновлением токена при 401
  static async request(endpoint, options = {}) {
    // Извлекаем токен из localStorage
    const token = localStorage.getItem('yogavibe_token');
    
    // Подготавливаем заголовки
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Добавляем токен авторизации, если есть
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      ...options,
      headers
    };
    
    // Если передано тело и это не строка, сериализуем в JSON
    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }
    
    try {
      // Формируем полный URL
      const url = endpoint.startsWith('/') 
        ? `${this.BASE_URL}${endpoint}` 
        : `${this.BASE_URL}/${endpoint}`;
      
      // Выполняем запрос
      const response = await fetch(url, config);
      
      // Если получили 401 (Unauthorized), пробуем обновить токен
      if (response.status === 401 && endpoint !== this.REFRESH_ENDPOINT) {
        console.log('Token expired, trying to refresh...');
        const refreshSuccess = await this.refreshAccessToken();
        
        if (refreshSuccess) {
          // Повторяем запрос с новым токеном
          const newToken = localStorage.getItem('yogavibe_token');
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryConfig = { ...config, headers };
          
          const retryResponse = await fetch(url, retryConfig);
          
          // Обрабатываем повторный ответ
          return this._handleResponse(retryResponse);
        } else {
          // Если refresh не удался, очищаем авторизацию
          this.clearAuth();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }
      
      // Обрабатываем обычный ответ
      return this._handleResponse(response);
      
    } catch (error) {
      console.error(`API request error (${endpoint}):`, error);
      throw error;
    }
  }

  // Обработка ответа сервера
  static async _handleResponse(response) {
    // Для ответа без содержимого (204 No Content)
    if (response.status === 204) {
      return null;
    }
    
    // Определяем тип контента
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    // Если ответ не успешный, выбрасываем ошибку
    if (!response.ok) {
      let errorBody;
      
      try {
        errorBody = isJson 
          ? await response.json().catch(() => ({ detail: 'Unknown error' }))
          : await response.text().catch(() => 'Unknown error');
      } catch (parseError) {
        errorBody = { detail: `HTTP ${response.status}: Failed to parse error response` };
      }
      
      const error = new Error(errorBody.detail || `HTTP ${response.status}`);
      error.status = response.status;
      error.body = errorBody;
      throw error;
    }
    
    // Возвращаем данные в правильном формате
    try {
      return isJson ? await response.json() : await response.text();
    } catch (parseError) {
      throw new Error('Failed to parse response');
    }
  }

  // Обновление access токена с помощью refresh токена
  static async refreshAccessToken() {
    const refreshToken = localStorage.getItem('yogavibe_refresh_token');
  
    // Если токен выглядит как mock токен, не пытаться обновлять
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
        const data = await response.json();
        
        // Сохраняем новые токены
        localStorage.setItem('yogavibe_token', data.access_token);
        localStorage.setItem('yogavibe_refresh_token', data.refresh_token);
        
        console.log('Token refreshed successfully');
        return true;
      } else {
        console.log('Refresh token is invalid');
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  // Очистка авторизационных данных
  static clearAuth() {
    localStorage.removeItem('yogavibe_token');
    localStorage.removeItem('yogavibe_refresh_token');
    localStorage.removeItem('yogavibe_user');
  }

  // === АУТЕНТИФИКАЦИЯ ===
  
  static async login(credentials) {
    try {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: credentials
      });
      
      // Сохраняем токены и данные пользователя
      if (data.access_token && data.refresh_token) {
        localStorage.setItem('yogavibe_token', data.access_token);
        localStorage.setItem('yogavibe_refresh_token', data.refresh_token);
        
        if (data.user) {
          localStorage.setItem('yogavibe_user', JSON.stringify(data.user));
        }
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async register(userData) {
    try {
      const data = await this.request('/auth/register', {
        method: 'POST',
        body: userData
      });
      
      // Сохраняем токены и данные пользователя
      if (data.access_token && data.refresh_token) {
        localStorage.setItem('yogavibe_token', data.access_token);
        localStorage.setItem('yogavibe_refresh_token', data.refresh_token);
        
        if (data.user) {
          localStorage.setItem('yogavibe_user', JSON.stringify(data.user));
        }
      }
      
      return data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  static async logout() {
    const refreshToken = localStorage.getItem('yogavibe_refresh_token');
    
    if (refreshToken) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: { refresh_token: refreshToken }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    this.clearAuth();
  }

  // === ПОЛЬЗОВАТЕЛИ ===
  
  static async getCurrentUser() {
    return await this.request('/users/me');
  }

  static async updateUserProfile(userData) {
    return await this.request('/users/me', {
      method: 'PUT',
      body: userData
    });
  }

  // === МЕНТОРЫ ===
  
  static async getMentors(filters = {}) {
    // Формируем query параметры
    const queryParams = new URLSearchParams();
    
    if (filters.city) queryParams.append('city', filters.city);
    if (filters.yoga_style) queryParams.append('yoga_style', filters.yoga_style);
    if (filters.skip) queryParams.append('skip', filters.skip);
    if (filters.limit) queryParams.append('limit', filters.limit);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/mentors?${queryString}` : '/mentors';
    
    return await this.request(endpoint);
  }

  static async getMentorById(mentorId) {
    return await this.request(`/mentors/${mentorId}`);
  }

  // === ЗАМЕТКИ ===
  
  static async getNotes(skip = 0, limit = 100) {
    return await this.request(`/notes?skip=${skip}&limit=${limit}`);
  }

  static async createNote(noteData) {
    return await this.request('/notes', {
      method: 'POST',
      body: noteData
    });
  }

  static async updateNote(noteId, noteData) {
    return await this.request(`/notes/${noteId}`, {
      method: 'PUT',
      body: noteData
    });
  }

  static async deleteNote(noteId) {
    return await this.request(`/notes/${noteId}`, {
      method: 'DELETE'
    });
  }

  // === БРОНИРОВАНИЯ ===
  
  static async getBookings(skip = 0, limit = 100) {
    return await this.request(`/bookings?skip=${skip}&limit=${limit}`);
  }

  static async createBooking(bookingData) {
    return await this.request('/bookings', {
      method: 'POST',
      body: bookingData
    });
  }

  static async cancelBooking(bookingId) {
    return await this.request(`/bookings/${bookingId}/cancel`, {
      method: 'PUT'
    });
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===
  
  static isAuthenticated() {
    return !!localStorage.getItem('yogavibe_token');
  }

  static getUserData() {
    const userStr = localStorage.getItem('yogavibe_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  static setUserData(user) {
    localStorage.setItem('yogavibe_user', JSON.stringify(user));
  }

  static getAccessToken() {
    return localStorage.getItem('yogavibe_token');
  }
}

export default ApiService;