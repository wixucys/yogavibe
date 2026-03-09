import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen/WelcomeScreen';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import RegisterScreen from './screens/RegisterScreen/RegisterScreen';
import MainScreen from './screens/MainScreen/MainScreen';
import MentorProfileScreen from './screens/MentorsProfile/MentorProfileScreen';
import BookingScreen from './screens/BookingScreen/BookingScreen';
import BookingConfirmationScreen from './screens/BookingConfirm/BookingConfirmationScreen';
import AuthService from './services/AuthService';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Проверка аутентификации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResult = await AuthService.checkAuth();
        setIsAuthenticated(authResult.isAuthenticated);
        if (authResult.user) {
          setUser(authResult.user);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Обработчик входа - УПРОЩЕННАЯ ВЕРСИЯ
  const handleLogin = async (credentials) => {
    try {
      console.log('App: Starting login with:', { ...credentials, password: '***' });
      
      // Вызываем AuthService.login напрямую
      const result = await AuthService.login(credentials);
      console.log('App: Login result:', result);
      
      if (result.success) {
        // Получаем обновленные данные пользователя
        const currentUser = AuthService.getCurrentUser();
        console.log('App: Current user after login:', currentUser);
        
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          return { success: true, message: 'Вход выполнен успешно' };
        } else {
          return { 
            success: false, 
            message: 'Пользователь не найден после входа' 
          };
        }
      } else {
        console.log('App: Login failed:', result.message);
        return { 
          success: false, 
          message: result.message || 'Ошибка при входе' 
        };
      }
    } catch (error) {
      console.error('App: Login error:', error);
      return { 
        success: false, 
        message: 'Сервер недоступен. Проверьте подключение к интернету.' 
      };
    }
  };

  // Обработчик регистрации - УПРОЩЕННАЯ ВЕРСИЯ
  const handleRegister = async (userData) => {
    try {
      console.log('App: Starting registration with:', { ...userData, password: '***' });
      
      // Вызываем AuthService.register напрямую
      const result = await AuthService.register(userData);
      console.log('App: Registration result:', result);
      
      if (result.success) {
        // Получаем обновленные данные пользователя
        const currentUser = AuthService.getCurrentUser();
        console.log('App: Current user after registration:', currentUser);
        
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          return { success: true, message: 'Регистрация успешна' };
        } else {
          return { 
            success: false, 
            message: 'Пользователь не создан' 
          };
        }
      } else {
        console.log('App: Registration failed:', result.message);
        return { 
          success: false, 
          message: result.message || 'Ошибка при регистрации' 
        };
      }
    } catch (error) {
      console.error('App: Registration error:', error);
      return { 
        success: false, 
        message: 'Сервер недоступен. Проверьте подключение к интернету.' 
      };
    }
  };

  // Обработчик выхода
  const handleLogout = async () => {
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
              isAuthenticated ? 
              <Navigate to="/main" /> : 
              <LoginScreen onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? 
              <Navigate to="/main" /> : 
              <RegisterScreen onRegister={handleRegister} />
            } 
          />
          <Route 
            path="/main" 
            element={
              isAuthenticated ? 
              <MainScreen user={user} onLogout={handleLogout} /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/mentor/:mentorId" 
            element={
              isAuthenticated ? 
              <MentorProfileScreen /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/booking/:mentorId" 
            element={
              isAuthenticated ? 
              <BookingScreen /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/booking-confirmation" 
            element={
              isAuthenticated ? 
              <BookingConfirmationScreen /> : 
              <Navigate to="/login" />
            } 
          />
          {/* Добавляем fallback route для несуществующих страниц */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;