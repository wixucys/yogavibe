import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ProtectedRoute', () => {
  it('shows loading state while auth is loading', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['user']}>
          <div>Private content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login page', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['user']}>
          <div>Private content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Redirect:/auth/login')).toBeInTheDocument();
  });

  it('redirects users with forbidden role to mentors page', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 1,
        username: 'mentor1',
        email: 'mentor@example.com',
        role: 'mentor',
        created_at: '2026-04-13T00:00:00Z',
        is_active: true,
      },
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['user']}>
          <div>Private content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Redirect:/mentors')).toBeInTheDocument();
  });

  it('renders protected content for allowed role', () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 2,
        username: 'user1',
        email: 'user@example.com',
        role: 'user',
        created_at: '2026-04-13T00:00:00Z',
        is_active: true,
      },
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['user']}>
          <div>Private content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Private content')).toBeInTheDocument();
  });
});
