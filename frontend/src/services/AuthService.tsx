import ApiService, {
  ApiError,
  type User,
  type AuthResponse,
  type LoginCredentials,
  type RegisterData,
} from './ApiService';

export type { User, LoginCredentials, RegisterData };

export interface AuthCheckResult {
  isAuthenticated: boolean;
  user?: User;
}

export interface AuthSuccessResult {
  success: true;
  user?: User;
  message?: string;
}

export interface AuthErrorResult {
  success: false;
  message: string;
}

export type AuthActionResult = AuthSuccessResult | AuthErrorResult;

export interface UpdateProfileResultSuccess {
  success: true;
  user: User;
}

export interface UpdateProfileResultError {
  success: false;
  message: string;
}

export type UpdateProfileResult =
  | UpdateProfileResultSuccess
  | UpdateProfileResultError;

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
      const userData = await ApiService.getCurrentUser().catch((error: unknown) => {
        console.error('AuthService: Error getting current user:', error);
        return null;
      });

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
        login: credentials.login ?? credentials.email,
        password: '***',
      });

      const response: AuthResponse = await ApiService.login(credentials);
      console.log('AuthService: Login response:', response);

      if (response.access_token && response.user) {
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

      const apiError = error as ApiError;
      let message = 'Ошибка при входе';

      if (apiError.status === 401) {
        message = 'Неверный логин или пароль';
      } else if (apiError.status === 403) {
        message = 'Пользователь деактивирован';
      } else if (
        apiError.status === 0 ||
        apiError.message?.includes('Failed to fetch')
      ) {
        message = 'Сервер недоступен. Проверьте подключение к интернету.';
      } else if (
        apiError.body &&
        typeof apiError.body === 'object' &&
        'detail' in apiError.body &&
        typeof (apiError.body as { detail?: unknown }).detail === 'string'
      ) {
        message = (apiError.body as { detail: string }).detail;
      } else if (apiError.message) {
        message = apiError.message;
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

      if (response.access_token && response.user) {
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

      const apiError = error as ApiError;
      let message = 'Ошибка при регистрации';

      if (apiError.status === 400) {
        if (
          apiError.body &&
          typeof apiError.body === 'object' &&
          'detail' in apiError.body &&
          typeof (apiError.body as { detail?: unknown }).detail === 'string'
        ) {
          message = (apiError.body as { detail: string }).detail;
        } else {
          message = 'Пользователь с таким email или именем уже существует';
        }
      } else if (
        apiError.status === 0 ||
        apiError.message?.includes('Failed to fetch')
      ) {
        message = 'Сервер недоступен. Проверьте подключение к интернету.';
      } else if (
        apiError.body &&
        typeof apiError.body === 'object' &&
        'detail' in apiError.body &&
        typeof (apiError.body as { detail?: unknown }).detail === 'string'
      ) {
        message = (apiError.body as { detail: string }).detail;
      } else if (apiError.message) {
        message = apiError.message;
      }

      return {
        success: false,
        message,
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
    profileData: Record<string, unknown>
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

      const apiError = error as ApiError;
      let message = 'Ошибка при обновлении профиля';

      if (
        apiError.body &&
        typeof apiError.body === 'object' &&
        'detail' in apiError.body &&
        typeof (apiError.body as { detail?: unknown }).detail === 'string'
      ) {
        message = (apiError.body as { detail: string }).detail;
      }

      return {
        success: false,
        message,
      };
    }
  }

  static clearAuth(): void {
    ApiService.clearAuth();
  }
}

export default AuthService;