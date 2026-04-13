import ApiService, { ApiError } from './ApiService';
import type { User } from '../types/user';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  AuthCheckResult,
  AuthActionResult,
  UpdateProfileResult,
} from '../types/auth';

export type { User, LoginCredentials, RegisterData };

class AuthService {
  static async checkAuth(): Promise<AuthCheckResult> {
    try {
      const token = localStorage.getItem('yogavibe_token');
      const refreshToken = localStorage.getItem('yogavibe_refresh_token');

      if (token && token.includes('mock_')) {
        this.clearAuth();
        return { isAuthenticated: false };
      }

      if (refreshToken && refreshToken.includes('mock_')) {
        this.clearAuth();
        return { isAuthenticated: false };
      }

      if (!ApiService.isAuthenticated()) {
        return { isAuthenticated: false };
      }

      let userData: User | null = null;

      try {
        userData = await ApiService.getCurrentUser();
      } catch (error: unknown) {
        console.error('AuthService: Error getting current user:', error);
      }

      if (userData) {
        ApiService.setUserData(userData);

        return {
          isAuthenticated: true,
          user: userData,
        };
      }

      ApiService.clearAuth();
      return { isAuthenticated: false };
    } catch (error) {
      console.error('AuthService: Auth check error:', error);
      return { isAuthenticated: false };
    }
  }

  static async login(credentials: LoginCredentials): Promise<AuthActionResult> {
    try {
      const response: AuthResponse = await ApiService.login(credentials);

      if (response.access_token && response.refresh_token && response.user) {
        return {
          success: true,
          user: response.user,
        };
      }

      return {
        success: false,
        message: 'Некорректный ответ от сервера',
      };
    } catch (error: unknown) {
      console.error('AuthService: Login error:', error);

      const message = this.getErrorMessage(error, 'Ошибка при входе');

      if (error instanceof ApiError) {
        if (error.status === 401) {
          return {
            success: false,
            message: 'Неверный логин или пароль',
          };
        }

        if (error.status === 403) {
          return {
            success: false,
            message: 'Пользователь деактивирован',
          };
        }
      }

      return {
        success: false,
        message,
      };
    }
  }

  static async register(userData: RegisterData): Promise<AuthActionResult> {
    try {
      const registrationData: RegisterData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
      };

      const response: AuthResponse = await ApiService.register(registrationData);

      if (response.access_token && response.refresh_token && response.user) {
        return {
          success: true,
          user: response.user,
        };
      }

      return {
        success: false,
        message: 'Некорректный ответ от сервера',
      };
    } catch (error: unknown) {
      console.error('AuthService: Registration error:', error);

      if (error instanceof ApiError && error.status === 400) {
        const detailMessage = this.getApiErrorDetail(error);

        return {
          success: false,
          message:
            detailMessage ||
            'Пользователь с таким email или именем уже существует',
        };
      }

      return {
        success: false,
        message: this.getErrorMessage(error, 'Ошибка при регистрации'),
      };
    }
  }

  static async logout(): Promise<{ success: true }> {
    try {
      await ApiService.logout();
      return { success: true };
    } catch (error) {
      console.error('AuthService: Logout error:', error);
      ApiService.clearAuth();
      return { success: true };
    }
  }

  static getCurrentUser(): User | null {
    return ApiService.getUserData();
  }

  static isAuthenticated(): boolean {
    return ApiService.isAuthenticated();
  }

  static async updateProfile(
    profileData: Partial<User>
  ): Promise<UpdateProfileResult> {
    try {
      const updatedUser = await ApiService.updateUserProfile(profileData);
      ApiService.setUserData(updatedUser);
      return {
        success: true,
        user: updatedUser,
      };
    } catch (error: unknown) {
      console.error('AuthService: Update profile error:', error);

      return {
        success: false,
        message: this.getErrorMessage(error, 'Ошибка при обновлении профиля'),
      };
    }
  }

  static clearAuth(): void {
    ApiService.clearAuth();
  }

  static isAdmin(user: User | null): boolean {
    return user?.role === 'admin';
  }

  static isMentor(user: User | null): boolean {
    return user?.role === 'mentor';
  }

  static isRegularUser(user: User | null): boolean {
    return user?.role === 'user';
  }

  private static getErrorMessage(
    error: unknown,
    fallbackMessage: string
  ): string {
    if (error instanceof ApiError) {
      if (error.status === 0 || error.message.includes('Failed to fetch')) {
        return 'Сервер недоступен. Проверьте подключение к интернету.';
      }

      const detailMessage = this.getApiErrorDetail(error);
      if (detailMessage) {
        return detailMessage;
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

  private static getApiErrorDetail(error: ApiError): string | null {
    if (
      error.body &&
      typeof error.body === 'object' &&
      'detail' in error.body &&
      typeof (error.body as { detail?: unknown }).detail === 'string'
    ) {
      return (error.body as { detail: string }).detail;
    }

    return null;
  }
}

export default AuthService;