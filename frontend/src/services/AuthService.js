// src/services/AuthService.js
import ApiService from './ApiService';

class AuthService {
  // Проверка аутентификации
  static async checkAuth() {
    try {
      const token = localStorage.getItem('yogavibe_token');
      const refreshToken = localStorage.getItem('yogavibe_refresh_token');
      
      // Проверяем, не mock ли токены
      if (token && token.includes('mock_')) {
        console.log('Mock access token found, clearing auth');
        this.clearAuth();
        return { isAuthenticated: false };
      }
      
      if (refreshToken && refreshToken.includes('mock_')) {
        console.log('Mock refresh token found, clearing auth');
        this.clearAuth();
        return { isAuthenticated: false };
      }
      
      console.log('AuthService: Checking authentication...');
      
      if (!ApiService.isAuthenticated()) {
        console.log('AuthService: No token found');
        return { isAuthenticated: false };
      }
      
      // Пробуем получить данные пользователя с сервера
      console.log('AuthService: Getting current user from API...');
      const userData = await ApiService.getCurrentUser().catch((error) => {
        console.error('AuthService: Error getting current user:', error);
        return null;
      });
      
      if (userData) {
        console.log('AuthService: User data received:', userData);
        
        // Обновляем данные пользователя в localStorage
        ApiService.setUserData(userData);
        return {
          isAuthenticated: true,
          user: userData
        };
      } else {
        console.log('AuthService: No user data received, clearing auth');
        
        // Если не удалось получить данные, удаляем токены
        ApiService.clearAuth();
        return { isAuthenticated: false };
      }
    } catch (error) {
      console.error('AuthService: Auth check error:', error);
      return { isAuthenticated: false };
    }
  }

  // Вход пользователя через API
  static async login(credentials) {
    try {
      console.log('AuthService: Logging in with:', { 
        login: credentials.login, 
        password: '***' 
      });
      
      // Используем ApiService для отправки запроса на бэкенд
      const response = await ApiService.login(credentials);
      console.log('AuthService: Login response:', response);
      
      // В ответе от бэкенда уже есть access_token, refresh_token и user
      if (response.access_token && response.user) {
        console.log('AuthService: Login successful');
        return {
          success: true,
          user: response.user
        };
      } else {
        console.log('AuthService: Login response missing required data');
        return {
          success: false,
          message: 'Некорректный ответ от сервера'
        };
      }
      
    } catch (error) {
      console.error('AuthService: Login error:', error);
      
      // Обрабатываем ошибки API
      let message = 'Ошибка при входе';
      
      if (error.status === 401) {
        message = 'Неверный логин или пароль';
      } else if (error.status === 403) {
        message = 'Пользователь деактивирован';
      } else if (error.status === 0 || error.message?.includes('Failed to fetch')) {
        message = 'Сервер недоступен. Проверьте подключение к интернету.';
      } else if (error.body && error.body.detail) {
        message = error.body.detail;
      } else if (error.message) {
        message = error.message;
      }
      
      return {
        success: false,
        message: message
      };
    }
  }

  // Регистрация через API
  static async register(userData) {
    try {
      console.log('AuthService: Registering user:', { 
        username: userData.username,
        email: userData.email,
        password: '***'
      });
      
      // Формируем данные для регистрации (совместимые с UserCreate схемой)
      const registrationData = {
        username: userData.username,
        email: userData.email,
        password: userData.password
      };
      
      const response = await ApiService.register(registrationData);
      console.log('AuthService: Registration response:', response);
      
      if (response.access_token && response.user) {
        console.log('AuthService: Registration successful');
        return {
          success: true,
          user: response.user
        };
      } else {
        console.log('AuthService: Registration response missing required data');
        return {
          success: false,
          message: 'Некорректный ответ от сервера'
        };
      }
      
    } catch (error) {
      console.error('AuthService: Registration error:', error);
      
      let message = 'Ошибка при регистрации';
      
      if (error.status === 400) {
        if (error.body && error.body.detail) {
          message = error.body.detail;
        } else {
          message = 'Пользователь с таким email или именем уже существует';
        }
      } else if (error.status === 0 || error.message?.includes('Failed to fetch')) {
        message = 'Сервер недоступен. Проверьте подключение к интернету.';
      } else if (error.body && error.body.detail) {
        message = error.body.detail;
      } else if (error.message) {
        message = error.message;
      }
      
      return {
        success: false,
        message: message
      };
    }
  }

  // Выход через API
  static async logout() {
    try {
      console.log('AuthService: Logging out...');
      
      // Используем ApiService для выхода
      await ApiService.logout();
      console.log('AuthService: Logout successful');
      
      return { success: true };
    } catch (error) {
      console.error('AuthService: Logout error:', error);
      // Все равно очищаем локальные данные
      ApiService.clearAuth();
      return { success: true };
    }
  }

  // Получение текущего пользователя
  static getCurrentUser() {
    const user = ApiService.getUserData();
    console.log('AuthService: Getting current user from localStorage:', user);
    return user;
  }

  // Проверка, авторизован ли пользователь
  static isAuthenticated() {
    const isAuth = ApiService.isAuthenticated();
    console.log('AuthService: Is authenticated?', isAuth);
    return isAuth;
  }

  // Обновление профиля пользователя
  static async updateProfile(profileData) {
    try {
      console.log('AuthService: Updating profile:', profileData);
      
      const updatedUser = await ApiService.updateUserProfile(profileData);
      ApiService.setUserData(updatedUser);
      
      console.log('AuthService: Profile updated successfully');
      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      console.error('AuthService: Update profile error:', error);
      return {
        success: false,
        message: error.body?.detail || 'Ошибка при обновлении профиля'
      };
    }
  }
}

export default AuthService;