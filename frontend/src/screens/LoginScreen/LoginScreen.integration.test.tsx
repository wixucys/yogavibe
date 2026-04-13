import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import LoginScreen from './LoginScreen';
import { useAuth } from '../../contexts/AuthContext';

const mockNavigate = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../hooks/useSeo', () => ({
  useSeo: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('LoginScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  it('shows validation error for empty login form', async () => {
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
        <LoginScreen />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Введите логин или email')).toBeInTheDocument();
  });

  it('navigates to mentor dashboard after successful login', async () => {
    const loginMock = jest.fn().mockImplementation(async () => {
      localStorage.setItem(
        'yogavibe_user',
        JSON.stringify({ role: 'mentor' })
      );
    });

    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      login: loginMock,
      register: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Логин или email'), {
      target: { value: 'mentor@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'pass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        login: 'mentor@example.com',
        password: 'pass123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/mentor/dashboard');
    });
  });

  it('shows server error message when login fails', async () => {
    const loginMock = jest
      .fn()
      .mockRejectedValue(new Error('Неверный логин или пароль'));

    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      login: loginMock,
      register: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Логин или email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'pass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Неверный логин или пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });
});
