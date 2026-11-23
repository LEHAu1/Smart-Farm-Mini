// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const { getCurrentUserProfileMock } = vi.hoisted(() => ({
  getCurrentUserProfileMock: vi.fn(),
}));

vi.mock('../services/auth-service', () => ({
  getStoredUser: () => {
    const raw = sessionStorage.getItem('smartfarm_user');
    return raw ? JSON.parse(raw) : null;
  },
  isAuthenticated: () => Boolean(sessionStorage.getItem('smartfarm_access_token')),
  getCurrentUserProfile: getCurrentUserProfileMock,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}));

function AuthStatus() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div>Loading auth</div>;
  return <div>{isAuthenticated ? `Signed in: ${user?.email}` : 'Signed out'}</div>;
}

function renderAuthStatus() {
  return render(
    <AuthProvider>
      <AuthStatus />
    </AuthProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  getCurrentUserProfileMock.mockReset();
});

describe('AuthProvider session state', () => {
  it('does not trust a cached user when the server profile request fails', async () => {
    sessionStorage.setItem('smartfarm_access_token', 'expired-token');
    sessionStorage.setItem('smartfarm_user', JSON.stringify({
      id: 'user-1',
      userName: 'cached-user',
      email: 'cached@example.com',
      role: 'User',
    }));
    getCurrentUserProfileMock.mockRejectedValue(new Error('Unauthorized'));

    renderAuthStatus();

    expect(await screen.findByText('Signed out')).toBeTruthy();
    expect(screen.queryByText('Signed in: cached@example.com')).toBeNull();
  });

  it('clears in-memory authentication immediately after refresh failure', async () => {
    sessionStorage.setItem('smartfarm_access_token', 'valid-token');
    getCurrentUserProfileMock.mockResolvedValue({
      id: 'user-1',
      userName: 'garden-user',
      email: 'garden@example.com',
      role: 'User',
      createdAtUtc: '2026-11-22T00:00:00Z',
    });

    renderAuthStatus();
    expect(await screen.findByText('Signed in: garden@example.com')).toBeTruthy();

    window.dispatchEvent(new Event('auth:unauthorized'));

    expect(await screen.findByText('Signed out')).toBeTruthy();
  });
});
