import React, { JSX, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen/WelcomeScreen';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import RegisterScreen from './screens/RegisterScreen/RegisterScreen';
import MainScreen from './screens/MainScreen/MainScreen';
import MentorProfileScreen from './screens/MentorsProfile/MentorProfileScreen';
import BookingScreen from './screens/BookingScreen/BookingScreen';
import BookingConfirmationScreen from './screens/BookingConfirm/BookingConfirmationScreen';
import AuthService, {
  type User,
  type AuthCheckResult,
  type AuthActionResult,
  type LoginCredentials,
  type RegisterData,
} from './services/AuthService';
import './App.css';

function App(): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const authResult: AuthCheckResult = await AuthService.checkAuth();
        setIsAuthenticated(authResult.isAuthenticated);

        if (authResult.user) {
          setUser(authResult.user);
        }
      } catch (error: unknown) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, []);

  const handleLogin = async (
    credentials: LoginCredentials
  ): Promise<AuthActionResult> => {
    try {
      console.log('App: Starting login with:', { ...credentials, password: '***' });

      const result = await AuthService.login(credentials);
      console.log('App: Login result:', result);

      if (result.success) {
        const currentUser = AuthService.getCurrentUser();
        console.log('App: Current user after login:', currentUser);

        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          return { success: true, message: 'Вход выполнен успешно' };
        }

        return {
          success: false,
          message: 'Пользователь не найден после входа',
        };
      }

      console.log('App: Login failed:', result.message);
      return {
        success: false,
        message: result.message || 'Ошибка при входе',
      };
    } catch (error) {
      console.error('App: Login error:', error);
      return {
        success: false,
        message: 'Сервер недоступен. Проверьте подключение к интернету.',
      };
    }
  };

  const handleRegister = async (
    userData: RegisterData
  ): Promise<AuthActionResult> => {
    try {
      console.log('App: Starting registration with:', { ...userData, password: '***' });

      const result = await AuthService.register(userData);
      console.log('App: Registration result:', result);

      if (result.success) {
        const currentUser = AuthService.getCurrentUser();
        console.log('App: Current user after registration:', currentUser);

        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          return { success: true, message: 'Регистрация успешна' };
        }

        return {
          success: false,
          message: 'Пользователь не создан',
        };
      }

      console.log('App: Registration failed:', result.message);
      return {
        success: false,
        message: result.message || 'Ошибка при регистрации',
      };
    } catch (error) {
      console.error('App: Registration error:', error);
      return {
        success: false,
        message: 'Сервер недоступен. Проверьте подключение к интернету.',
      };
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/main" /> : <LoginScreen onLogin={handleLogin} />
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? (
                <Navigate to="/main" />
              ) : (
                <RegisterScreen onRegister={handleRegister} />
              )
            }
          />
          <Route
            path="/main"
            element={
              isAuthenticated ? (
                <MainScreen user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/mentor/:mentorId"
            element={isAuthenticated ? <MentorProfileScreen /> : <Navigate to="/login" />}
          />
          <Route
            path="/booking/:mentorId"
            element={isAuthenticated ? <BookingScreen /> : <Navigate to="/login" />}
          />
          <Route
            path="/booking-confirmation"
            element={isAuthenticated ? <BookingConfirmationScreen /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;