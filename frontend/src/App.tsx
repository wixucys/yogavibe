import React, { JSX } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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
import './App.css';

function AppRoutes(): JSX.Element {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* User routes - role: user */}
      <Route
        path="/main"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <MainScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/:mentorId"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <BookingScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking-confirmation"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <BookingConfirmationScreen />
          </ProtectedRoute>
        }
      />

      {/* Mentor routes - role: mentor */}
      <Route
        path="/mentor/dashboard"
        element={
          <ProtectedRoute allowedRoles={['mentor']}>
            <MentorDashboardScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/profile/edit"
        element={
          <ProtectedRoute allowedRoles={['mentor']}>
            <MentorEditScreen />
          </ProtectedRoute>
        }
      />

      {/* Admin routes - role: admin */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/mentors"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminMentorsScreen />
          </ProtectedRoute>
        }
      />

      {/* Multi-role routes */}
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
  );
}

function App(): JSX.Element {
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