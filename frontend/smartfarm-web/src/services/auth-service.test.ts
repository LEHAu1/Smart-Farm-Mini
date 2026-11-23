// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiPostMock } = vi.hoisted(() => ({ apiPostMock: vi.fn() }));

vi.mock('./api-client', () => ({
  apiClient: { post: apiPostMock },
  ACCESS_TOKEN_KEY: 'smartfarm_access_token',
  REFRESH_TOKEN_KEY: 'smartfarm_refresh_token',
  USER_INFO_KEY: 'smartfarm_user',
}));

import { login } from './auth-service';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_INFO_KEY } from './api-client';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  apiPostMock.mockReset();
});

describe('auth session storage', () => {
  it('stores login tokens and user in tab-scoped sessionStorage only', async () => {
    const user = {
      id: 'user-1',
      userName: 'garden-user',
      email: 'garden@example.com',
      role: 'User',
    };
    apiPostMock.mockResolvedValue({
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAtUtc: '2026-11-22T00:00:00Z',
        user,
      },
    });

    await login({ userNameOrEmail: user.email, password: 'Password1' });

    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-token');
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-token');
    expect(sessionStorage.getItem(USER_INFO_KEY)).toBe(JSON.stringify(user));
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_INFO_KEY)).toBeNull();
  });
});
