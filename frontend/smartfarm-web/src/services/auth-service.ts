import {
  apiClient,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_INFO_KEY,
} from './api-client';
import type {
  AuthResponseDto,
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
  const { data } = await apiClient.post<AuthResponseDto>('/api/Auth/login', request);
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  if (data.user) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
  }
  return data;
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
  const { data } = await apiClient.get<UserProfileDto>('/api/Auth/me');
  return data;
}

export async function updateProfile(request: UpdateProfileRequest): Promise<UserProfileDto> {
  const { data } = await apiClient.put<UserProfileDto>('/api/Auth/profile', request);
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

// Backward-compatible loginDemo adapter
export async function loginDemo(credentials: LoginCredentials): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  try {
    await login({
      userNameOrEmail: credentials.email,
      password: credentials.password,
    });
  } catch {
    // If backend login fails, check fallback demo credentials
    if (
      credentials.email.trim().toLowerCase() === demoCredentials.email &&
      credentials.password === demoCredentials.password
    ) {
      const mockUser: UserDto = {
        id: '00000000-0000-0000-0000-000000000001',
        userName: 'demo_gardener',
        email: demoCredentials.email,
        displayName: 'Chủ Vườn Demo',
        role: 'User',
      };
      localStorage.setItem(ACCESS_TOKEN_KEY, 'demo_access_token_mock');
      localStorage.setItem(REFRESH_TOKEN_KEY, 'demo_refresh_token_mock');
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(mockUser));
      return;
    }
    throw new Error('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
  }
}
