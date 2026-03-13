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

      console.log('AuthService: Getting current user from API...');

      let userData: User | null = null;

      try {
        userData = await ApiService.getCurrentUser();
      } catch (error: unknown) {
        console.error('AuthService: Error getting current user:', error);
      }

      if (userData) {
        console.log('AuthService: User data received:', userData);
        ApiService.setUserData(userData);

        return {
          isAuthenticated: true,
          user: userData,
        };
      }

      console.log('AuthService: No user data received, clearing auth');
      ApiService.clearAuth();
      return { isAuthenticated: false };
    } catch (error) {
      console.error('AuthService: Auth check error:', error);
      return { isAuthenticated: false };
    }
  }

  static async login(credentials: LoginCredentials): Promise<AuthActionResult> {
    try {
      console.log('AuthService: Logging in with:', {
        login: credentials.login,
        password: '***',
      });

      const response: AuthResponse = await ApiService.login(credentials);
      console.log('AuthService: Login response:', response);

      if (response.access_token && response.refresh_token && response.user) {
        console.log('AuthService: Login successful');
        return {
          success: true,
          user: response.user,
        };
      }

      console.log('AuthService: Login response missing required data');
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
      console.log('AuthService: Registering user:', {
        username: userData.username,
        email: userData.email,
        password: '***',
      });

      const registrationData: RegisterData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
      };

      const response: AuthResponse = await ApiService.register(registrationData);
      console.log('AuthService: Registration response:', response);

      if (response.access_token && response.refresh_token && response.user) {
        console.log('AuthService: Registration successful');
        return {
          success: true,
          user: response.user,
        };
      }

      console.log('AuthService: Registration response missing required data');
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
      console.log('AuthService: Logging out...');
      await ApiService.logout();
      console.log('AuthService: Logout successful');
      return { success: true };
    } catch (error) {
      console.error('AuthService: Logout error:', error);
      ApiService.clearAuth();
      return { success: true };
    }
  }

  static getCurrentUser(): User | null {
    const user = ApiService.getUserData();
    console.log('AuthService: Getting current user from localStorage:', user);
    return user;
  }

  static isAuthenticated(): boolean {
    const isAuth = ApiService.isAuthenticated();
    console.log('AuthService: Is authenticated?', isAuth);
    return isAuth;
  }

  static async updateProfile(
    profileData: Partial<User>
  ): Promise<UpdateProfileResult> {
    try {
      console.log('AuthService: Updating profile:', profileData);

      const updatedUser = await ApiService.updateUserProfile(profileData);
      ApiService.setUserData(updatedUser);

      console.log('AuthService: Profile updated successfully');
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