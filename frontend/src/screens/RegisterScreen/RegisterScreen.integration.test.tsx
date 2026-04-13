import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import RegisterScreen from './RegisterScreen';
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

describe('RegisterScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('shows validation error when passwords do not match', async () => {
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
        <RegisterScreen />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('логин (для входа)'), {
      target: { value: 'user_1' },
    });
    fireEvent.change(screen.getByPlaceholderText('email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('пароль'), {
      target: { value: 'pass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('подтвердите пароль'), {
      target: { value: 'pass1234' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument();
  });

  it('calls register and navigates to mentors screen on success', async () => {
    const registerMock = jest.fn().mockResolvedValue(undefined);

    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      login: jest.fn(),
      register: registerMock,
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(
      <MemoryRouter>
        <RegisterScreen />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('логин (для входа)'), {
      target: { value: '  user_1  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('email'), {
      target: { value: '  USER@EXAMPLE.COM  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('пароль'), {
      target: { value: 'pass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('подтвердите пароль'), {
      target: { value: 'pass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        username: 'user_1',
        email: 'user@example.com',
        password: 'pass123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/mentors');
    });
  });

  it('shows server error in general error area', async () => {
    const registerMock = jest
      .fn()
      .mockRejectedValue(new Error('Пользователь уже существует'));

    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      login: jest.fn(),
      register: registerMock,
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(
      <MemoryRouter>
        <RegisterScreen />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('логин (для входа)'), {
      target: { value: 'user_2' },
    });
    fireEvent.change(screen.getByPlaceholderText('email'), {
      target: { value: 'user2@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('пароль'), {
      target: { value: 'pass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('подтвердите пароль'), {
      target: { value: 'pass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    expect(await screen.findByText('Пользователь уже существует')).toBeInTheDocument();
  });
});
