import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import MainScreen from './MainScreen';
import ApiService from '../../services/ApiService';
import AuthService from '../../services/AuthService';
import type { User } from '../../types/user';

jest.mock('../NotesScreen/NotesScreen', () => () => <div>Notes screen</div>);
jest.mock('../ProfileScreen/ProfileScreen', () => () => <div>Profile screen</div>);
jest.mock('../MyBookingsScreen/MyBookingsScreen', () => () => <div>Bookings screen</div>);

jest.mock('../../hooks/useSeo', () => ({
  useSeo: jest.fn(),
}));

const requestMock = jest.spyOn(ApiService, 'request');
const getCurrentUserMock = jest.spyOn(AuthService, 'getCurrentUser');

const baseUser: User = {
  id: 10,
  username: 'user10',
  email: 'user10@example.com',
  role: 'user',
  created_at: '2026-04-13T00:00:00Z',
  is_active: true,
};

describe('MainScreen', () => {
  beforeEach(() => {
    jest.useRealTimers();
    requestMock.mockReset();
    getCurrentUserMock.mockReset();
    getCurrentUserMock.mockReturnValue(baseUser);
  });

  it('shows loading mentors state while data is pending', () => {
    requestMock.mockReturnValue(new Promise(() => undefined));

    render(
      <MemoryRouter>
        <MainScreen user={baseUser} onLogout={jest.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Загрузка менторов')).toBeInTheDocument();
  });

  it('shows mentors loading error when API request fails', async () => {
    requestMock.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <MainScreen user={baseUser} onLogout={jest.fn()} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Не удалось загрузить менторов')).toBeInTheDocument();
  });

  it('sends search filter in mentors request after debounce', async () => {
    jest.useFakeTimers();

    requestMock.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        page_size: 3,
        total: 0,
        pages: 1,
      },
    });

    render(
      <MemoryRouter>
        <MainScreen user={baseUser} onLogout={jest.fn()} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByPlaceholderText('Имя, стиль, город'), {
      target: { value: 'Anna' },
    });

    act(() => {
      jest.advanceTimersByTime(450);
    });

    await waitFor(() => {
      expect(requestMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    const lastCallEndpoint = requestMock.mock.calls.at(-1)?.[0] as string;
    expect(decodeURIComponent(lastCallEndpoint)).toContain('search=Anna');
    expect(lastCallEndpoint).toContain('/mentors?');
  });

  it('renders role-specific mentor navigation link', async () => {
    requestMock.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        page_size: 3,
        total: 0,
        pages: 1,
      },
    });

    const mentorUser: User = {
      ...baseUser,
      role: 'mentor',
    };

    render(
      <MemoryRouter>
        <MainScreen user={mentorUser} onLogout={jest.fn()} />
      </MemoryRouter>
    );

    expect(await screen.findByText('ПАНЕЛЬ МЕНТОРА')).toBeInTheDocument();
  });

  it('renders role-specific admin navigation link', async () => {
    requestMock.mockResolvedValue({
      items: [],
      meta: {
        page: 1,
        page_size: 3,
        total: 0,
        pages: 1,
      },
    });

    const adminUser: User = {
      ...baseUser,
      role: 'admin',
    };

    render(
      <MemoryRouter>
        <MainScreen user={adminUser} onLogout={jest.fn()} />
      </MemoryRouter>
    );

    expect(await screen.findByText('ПАНЕЛЬ АДМИНИСТРАТОРА')).toBeInTheDocument();
  });
});
