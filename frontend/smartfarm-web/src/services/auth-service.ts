import { apiClient } from './api-client'
import type {
  AuthResponseDto,
  LoginCredentials,
  RegisterCredentials,
  UserDto,
  UserProfileDto,
} from '../types/auth'

const TOKEN_KEY = 'smartfarm_access_token'
const REFRESH_KEY = 'smartfarm_refresh_token'
const USER_KEY = 'smartfarm_user'

export const authService = {
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },

  getCurrentUser(): UserDto | null {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as UserDto
    } catch {
      return null
    }
  },

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem(TOKEN_KEY))
  },

  setSession(data: AuthResponseDto): void {
    localStorage.setItem(TOKEN_KEY, data.accessToken)
    localStorage.setItem(REFRESH_KEY, data.refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  },

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  },

  async login(credentials: LoginCredentials): Promise<AuthResponseDto> {
    const response = await apiClient.post<AuthResponseDto>('/api/Auth/login', {
      email: credentials.email.trim(),
      password: credentials.password,
    })
    authService.setSession(response.data)
    return response.data
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponseDto> {
    const response = await apiClient.post<AuthResponseDto>('/api/Auth/register', {
      email: credentials.email.trim(),
      password: credentials.password,
      displayName: credentials.displayName?.trim() || credentials.email.split('@')[0],
      role: 'User',
    })
    authService.setSession(response.data)
    return response.data
  },

  async logout(): Promise<void> {
    const refreshToken = authService.getRefreshToken()
    try {
      if (refreshToken) {
        await apiClient.post('/api/Auth/logout', { refreshToken })
      }
    } catch {
      // Bỏ qua lỗi mạng khi logout để luôn xóa local session
    } finally {
      authService.clearSession()
    }
  },

  async getProfile(): Promise<UserProfileDto> {
    const response = await apiClient.get<UserProfileDto>('/api/Auth/me')
    return response.data
  },
}
