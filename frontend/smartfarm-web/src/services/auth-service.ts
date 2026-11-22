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
  const { data } = await apiClient.post<AuthResponseDto>('/api/Auth/login', request);
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  if (data.user) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
  }
  return data;
}

export async function loginWithGoogle(request: GoogleLoginRequest): Promise<AuthResponseDto> {
  const { data } = await apiClient.post<AuthResponseDto>('/api/Auth/google', request);
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
