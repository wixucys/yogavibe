import ApiService, { ApiError } from './ApiService';

const originalLocation = window.location;

describe('ApiService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
    });
  });

  it('throws ApiError with backend detail on server error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Internal failure' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(ApiService.request('/users/me')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Internal failure',
    });
  });

  it('refreshes token on 401 and retries original request', async () => {
    localStorage.setItem('yogavibe_token', 'expired_access');
    localStorage.setItem('yogavibe_refresh_token', 'valid_refresh');

    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'new_access', refresh_token: 'new_refresh' }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

    const response = await ApiService.request<{ ok: boolean }>('/users/me');

    expect(response.ok).toBe(true);
    expect(localStorage.getItem('yogavibe_token')).toBe('new_access');
    expect(localStorage.getItem('yogavibe_refresh_token')).toBe('new_refresh');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('clears auth and raises session error when refresh fails', async () => {
    localStorage.setItem('yogavibe_token', 'expired_access');
    localStorage.setItem('yogavibe_refresh_token', 'expired_refresh');

    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/' },
      writable: true,
    });

    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Refresh expired' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      );

    const clearAuthSpy = jest.spyOn(ApiService, 'clearAuth');

    await expect(ApiService.request('/users/me')).rejects.toBeInstanceOf(ApiError);
    expect(clearAuthSpy).toHaveBeenCalled();
    expect(window.location.href).toBe('/auth/login');
  });
});
