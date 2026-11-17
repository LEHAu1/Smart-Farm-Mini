import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { apiClient } from './api-client'
import {
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_SESSION_UPDATED_EVENT,
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
} from './auth-storage'
import type { AuthSession, AuthUser, LoginCredentials } from '../types/auth'

type AuthResponse = AuthSession
let sessionRestorePromise: Promise<AuthSession | null> | null = null
let refreshInProgress: Promise<AuthSession> | null = null

type RetryableRequestConfig = InternalAxiosRequestConfig & { _authRetry?: boolean }

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const response = await apiClient.post<AuthResponse>('/api/Auth/login', {
    userNameOrEmail: credentials.email.trim(),
    password: credentials.password,
  })
  return storeAuthResponse(response.data)
}

export async function refreshAuthSession(refreshToken: string): Promise<AuthSession> {
  try {
    const response = await apiClient.post<AuthResponse>('/api/Auth/refresh-token', { refreshToken })
    return storeAuthResponse(response.data)
  } catch (error) {
    expireSession()
    throw error
  }
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>('/api/Auth/me')
  return response.data
}

export function restoreAuthSession(): Promise<AuthSession | null> {
  // React StrictMode can run mount effects twice in development. Share the
  // refresh request so one rotated refresh token is never submitted twice.
  if (!sessionRestorePromise) {
    sessionRestorePromise = restoreSessionOnce().finally(() => {
      sessionRestorePromise = null
    })
  }
  return sessionRestorePromise
}

async function restoreSessionOnce(): Promise<AuthSession | null> {
  const saved = readAuthSession()
  if (!saved) return null

  if (Date.parse(saved.expiresAtUtc) <= Date.now() + 30_000) {
    return refreshAuthSession(saved.refreshToken)
  }

  try {
    const user = await getCurrentUser()
    // A 401 from /me may have rotated tokens inside the response interceptor.
    // Preserve the newest pair instead of writing the original refresh token back.
    const current = readAuthSession() ?? saved
    const restored = { ...current, user: { ...current.user, ...user } }
    saveAuthSession(restored)
    return restored
  } catch (error) {
    // Keep a still-valid tab session usable during a temporary network outage.
    if (axios.isAxiosError(error) && !error.response) return saved
    throw error
  }
}

function storeAuthResponse(response: AuthResponse): AuthSession {
  if (
    !response?.accessToken ||
    !response.refreshToken ||
    !response.expiresAtUtc ||
    !response.user?.id ||
    !response.user.userName ||
    !response.user.email ||
    !response.user.role
  ) {
    throw new Error('Máy chủ trả về dữ liệu phiên đăng nhập không hợp lệ.')
  }
  saveAuthSession(response)
  window.dispatchEvent(new Event(AUTH_SESSION_UPDATED_EVENT))
  return response
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await apiClient.post('/api/Auth/logout', { refreshToken })
  } finally {
    clearAuthSession()
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined
    if (
      error.response?.status !== 401 ||
      !config ||
      config._authRetry ||
      isAuthEndpoint(config.url)
    ) {
      return Promise.reject(error)
    }

    const saved = readAuthSession()
    if (!saved) return Promise.reject(error)

    config._authRetry = true
    try {
      if (!refreshInProgress) {
        refreshInProgress = refreshAuthSession(saved.refreshToken).finally(() => {
          refreshInProgress = null
        })
      }
      const refreshed = await refreshInProgress
      config.headers.Authorization = `Bearer ${refreshed.accessToken}`
      return apiClient.request(config)
    } catch (refreshError) {
      expireSession()
      return Promise.reject(refreshError)
    }
  },
)

export function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Tên đăng nhập hoặc email/mật khẩu không đúng. Vui lòng thử lại.'
    }
    if (!error.response) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.'
    }

    const responseBody = error.response.data as { message?: unknown; title?: unknown } | string | undefined
    if (typeof responseBody === 'string' && responseBody.trim()) return responseBody
    if (responseBody && typeof responseBody === 'object') {
      if (typeof responseBody.message === 'string' && responseBody.message.trim()) return responseBody.message
      if (typeof responseBody.title === 'string' && responseBody.title.trim()) return responseBody.title
    }
  }

  return 'Không thể đăng nhập. Vui lòng thử lại.'
}

function isAuthEndpoint(url?: string): boolean {
  return ['/api/Auth/login', '/api/Auth/refresh-token', '/api/Auth/logout'].some((path) => url?.includes(path))
}

function expireSession(): void {
  clearAuthSession()
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
}
