import React, { JSX, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen/WelcomeScreen';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import RegisterScreen from './screens/RegisterScreen/RegisterScreen';
import MainScreen from './screens/MainScreen/MainScreen';
import MentorProfileScreen from './screens/MentorsProfile/MentorProfileScreen';
import MentorDashboardScreen from './screens/MentorDashboardScreen/MentorDashboardScreen';
import MentorEditScreen from './screens/MentorEditScreen/MentorEditScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen/AdminDashboardScreen';
import AdminMentorsScreen from './screens/AdminMentorsScreen/AdminMentorsScreen';
import BookingScreen from './screens/BookingScreen/BookingScreen';
import BookingConfirmationScreen from './screens/BookingConfirm/BookingConfirmationScreen';
import AuthService from './services/AuthService';
import type {
  AuthCheckResult,
  AuthActionResult,
  LoginCredentials,
  RegisterData,
} from './types/auth';
import type { User } from './types/user'
import './App.css';

function App(): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const authResult: AuthCheckResult = await AuthService.checkAuth();
        setIsAuthenticated(authResult.isAuthenticated);
        setUser(authResult.user ?? null);
      } catch (error: unknown) {
        console.error('Auth check error:', error);
        setUser(null);
        setIsAuthenticated(false);
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

      if (!result.success) {
        console.log('App: Login failed:', result.message);
        return result;
      }

      const currentUser = result.user ?? AuthService.getCurrentUser();
      console.log('App: Current user after login:', currentUser);

      if (!currentUser) {
        return {
          success: false,
          message: 'Пользователь не найден после входа',
        };
      }

      setUser(currentUser);
      setIsAuthenticated(true);

      return {
        success: true,
        user: currentUser,
        message: 'Вход выполнен успешно',
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

      if (!result.success) {
        console.log('App: Registration failed:', result.message);
        return result;
      }

      const currentUser = result.user ?? AuthService.getCurrentUser();
      console.log('App: Current user after registration:', currentUser);

      if (!currentUser) {
        return {
          success: false,
          message: 'Пользователь не создан',
        };
      }

      setUser(currentUser);
      setIsAuthenticated(true);

      return {
        success: true,
        user: currentUser,
        message: 'Регистрация успешна',
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
      setUser(null);
      setIsAuthenticated(false);
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
              isAuthenticated && user ? (
                <MainScreen user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/mentor/dashboard"
            element={
              isAuthenticated && user?.role === 'mentor' ? (
                <MentorDashboardScreen />
              ) : (
                <Navigate to="/main" />
              )
            }
          />
          <Route
            path="/mentor/profile/edit"
            element={
              isAuthenticated && user?.role === 'mentor' ? (
                <MentorEditScreen />
              ) : (
                <Navigate to="/main" />
              )
            }
          />
          <Route
            path="/mentor/:mentorId"
            element={isAuthenticated ? <MentorProfileScreen /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/dashboard"
            element={
              isAuthenticated && user?.role === 'admin' ? (
                <AdminDashboardScreen />
              ) : (
                <Navigate to="/main" />
              )
            }
          />
          <Route
            path="/admin/mentors"
            element={
              isAuthenticated && user?.role === 'admin' ? (
                <AdminMentorsScreen />
              ) : (
                <Navigate to="/main" />
              )
            }
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