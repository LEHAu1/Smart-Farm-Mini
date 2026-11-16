import {
  apiClient,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_INFO_KEY,
} from './api-client';
import type {
  AuthResponseDto,
  GoogleLoginRequest,
  LoginCredentials,
  LoginRequest,
  RegisterRequest,
  UserDto,
  UserProfileDto,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '../types/auth';

// Demo fallback credentials
export const demoCredentials: LoginCredentials = {
  email: 'demo@smartfarm.local',
  password: 'SmartFarm123!',
};

export async function login(request: LoginRequest): Promise<AuthResponseDto> {
  const emailInput = request.userNameOrEmail.trim().toLowerCase();

  try {
    const { data } = await apiClient.post<AuthResponseDto>('/api/Auth/login', request);
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    if (data.user) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
    }
    return data;
  } catch {
    // If backend is offline or network error, fallback to seeded admin/demo accounts
    if (
      (emailInput === 'admin@smartfarm.local' || emailInput === 'admin') &&
      (request.password === 'Password123' || request.password === 'SmartFarm123!')
    ) {
      const adminUser: UserDto = {
        id: '11111111-1111-1111-1111-111111111111',
        userName: 'admin',
        email: 'admin@smartfarm.local',
        displayName: 'Quản trị viên Hệ thống',
        role: 'Admin',
        authProvider: 'Local',
      };
      const response: AuthResponseDto = {
        accessToken: 'mock_admin_jwt_token_2026',
        refreshToken: 'mock_admin_refresh_token_2026',
        expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
        user: adminUser,
      };
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(adminUser));
      return response;
    }

    if (
      (emailInput === demoCredentials.email || emailInput === 'demo') &&
      request.password === demoCredentials.password
    ) {
      const demoUser: UserDto = {
        id: '22222222-2222-2222-2222-222222222222',
        userName: 'demo_gardener',
        email: demoCredentials.email,
        displayName: 'Chủ Vườn Demo',
        role: 'User',
        authProvider: 'Local',
      };
      const response: AuthResponseDto = {
        accessToken: 'mock_demo_jwt_token_2026',
        refreshToken: 'mock_demo_refresh_token_2026',
        expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
        user: demoUser,
      };
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(demoUser));
      return response;
    }

    throw new Error('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
  }
}

export async function loginWithGoogle(request: GoogleLoginRequest): Promise<AuthResponseDto> {
  try {
    const { data } = await apiClient.post<AuthResponseDto>('/api/Auth/google', request);
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    if (data.user) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
    }
    return data;
  } catch (error) {
    // If backend is unreachable in offline dev mode, provide graceful fallback
    const errObj = error as { response?: { data?: { error?: string } } };
    const backendMessage = errObj.response?.data?.error;
    if (backendMessage) {
      throw new Error(backendMessage);
    }

    // Offline mock fallback if token contains test sub
    if (request.idToken && request.idToken.startsWith('mock_')) {
      const googleMockUser: UserDto = {
        id: '33333333-3333-3333-3333-333333333333',
        userName: 'google_user',
        email: 'user@gmail.com',
        displayName: 'Google Tester',
        role: 'User',
        authProvider: 'Google',
      };
      const response: AuthResponseDto = {
        accessToken: 'mock_google_jwt_token_2026',
        refreshToken: 'mock_google_refresh_token_2026',
        expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
        user: googleMockUser,
      };
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(googleMockUser));
      return response;
    }

    throw new Error('Không thể xác thực với máy chủ. Vui lòng thử lại sau.');
  }
}

export async function register(request: RegisterRequest): Promise<AuthResponseDto> {
  const { data } = await apiClient.post<AuthResponseDto>('/api/Auth/register', request);
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  if (data.user) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
  }
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (refreshToken) {
    try {
      await apiClient.post('/api/Auth/logout', { refreshToken });
    } catch {
      // Ignored: cleanup tokens locally regardless
    }
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
}

export async function getCurrentUserProfile(): Promise<UserProfileDto> {
  try {
    const { data } = await apiClient.get<UserProfileDto>('/api/Auth/me');
    return data;
  } catch {
    const stored = getStoredUser();
    if (stored) {
      return {
        id: stored.id,
        userName: stored.userName,
        email: stored.email,
        displayName: stored.displayName,
        role: stored.role,
        authProvider: stored.authProvider || 'Local',
        avatarUrl: stored.avatarUrl,
        createdAtUtc: new Date().toISOString(),
      };
    }
    throw new Error('Chưa đăng nhập');
  }
}

export async function updateProfile(request: UpdateProfileRequest): Promise<UserProfileDto> {
  const { data } = await apiClient.put<UserProfileDto>('/api/Auth/profile', request);
  const stored = getStoredUser();
  if (stored) {
    localStorage.setItem(
      USER_INFO_KEY,
      JSON.stringify({ ...stored, displayName: data.displayName })
    );
  }
  return data;
}

export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await apiClient.post('/api/Auth/change-password', request);
}

export function getStoredUser(): UserDto | null {
  const raw = localStorage.getItem(USER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserDto;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}

// Backward-compatible loginDemo adapter for tests and quick login
export async function loginDemo(credentials: LoginCredentials): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  await login({
    userNameOrEmail: credentials.email,
    password: credentials.password,
  });
}
