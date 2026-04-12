import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ROUTES } from './constants/routes';

// Public screens – part of the initial bundle (fast first paint)
import WelcomeScreen from './screens/WelcomeScreen/WelcomeScreen';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import RegisterScreen from './screens/RegisterScreen/RegisterScreen';

// 4.1 Heavy protected screens – loaded lazily (code splitting)
const MainScreen = lazy(() => import('./screens/MainScreen/MainScreen'));
const MentorProfileScreen = lazy(() => import('./screens/MentorsProfile/MentorProfileScreen'));
const MentorDashboardScreen = lazy(() => import('./screens/MentorDashboardScreen/MentorDashboardScreen'));
const MentorEditScreen = lazy(() => import('./screens/MentorEditScreen/MentorEditScreen'));
const AdminDashboardScreen = lazy(() => import('./screens/AdminDashboardScreen/AdminDashboardScreen'));
const AdminMentorsScreen = lazy(() => import('./screens/AdminMentorsScreen/AdminMentorsScreen'));
const BookingScreen = lazy(() => import('./screens/BookingScreen/BookingScreen'));
const BookingConfirmationScreen = lazy(() => import('./screens/BookingConfirm/BookingConfirmationScreen'));

import './App.css';

// Minimal fallback shown while a lazy chunk is downloading
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <div className="loading-spinner" />
  </div>
);

function AppRoutes() {
  const { user, logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    await logout();
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      {/* Public routes */}
      <Route path={ROUTES.home} element={<WelcomeScreen />} />
      <Route path={ROUTES.auth.login} element={<LoginScreen />} />
      <Route path={ROUTES.auth.register} element={<RegisterScreen />} />

      {/* Legacy auth aliases */}
      <Route path={ROUTES.auth.legacyLogin} element={<Navigate to={ROUTES.auth.login} replace />} />
      <Route
        path={ROUTES.auth.legacyRegister}
        element={<Navigate to={ROUTES.auth.register} replace />}
      />

      {/* User routes - role: user */}
      <Route
        path={ROUTES.user.main}
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <MainScreen user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route path={ROUTES.user.legacyMain} element={<Navigate to={ROUTES.user.main} replace />} />
      <Route
        path="/booking/:mentorId"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <BookingScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.booking.confirmation}
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <BookingConfirmationScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.booking.legacyConfirmation}
        element={<Navigate to={ROUTES.booking.confirmation} replace />}
      />

      {/* Mentor routes - role: mentor */}
      <Route
        path={ROUTES.mentor.dashboard}
        element={
          <ProtectedRoute allowedRoles={['mentor']}>
            <MentorDashboardScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.mentor.editProfile}
        element={
          <ProtectedRoute allowedRoles={['mentor']}>
            <MentorEditScreen />
          </ProtectedRoute>
        }
      />

      {/* Admin routes - role: admin */}
      <Route
        path={ROUTES.admin.dashboard}
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.admin.mentors}
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminMentorsScreen />
          </ProtectedRoute>
        }
      />

      {/* Multi-role routes */}
      <Route
        path="/mentors/:mentorId"
        element={
          <ProtectedRoute allowedRoles={['user', 'admin']}>
            <MentorProfileScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/:mentorId"
        element={
          <ProtectedRoute allowedRoles={['user', 'admin']}>
            <MentorProfileScreen />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;