import type { AuthSession } from '../types/auth'

export const AUTH_SESSION_KEY = 'smartfarm.auth.session.v1'
export const AUTH_SESSION_UPDATED_EVENT = 'smartfarm:auth-session-updated'
export const AUTH_SESSION_EXPIRED_EVENT = 'smartfarm:auth-session-expired'

export function readAuthSession(): AuthSession | null {
  try {
    const serialized = window.sessionStorage.getItem(AUTH_SESSION_KEY)
    if (!serialized) return null

    const parsed: unknown = JSON.parse(serialized)
    if (!isAuthSession(parsed)) {
      clearAuthSession()
      return null
    }

    return parsed
  } catch {
    clearAuthSession()
    return null
  }
}

export function saveAuthSession(session: AuthSession): void {
  window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearAuthSession(): void {
  try {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY)
  } catch {
    // The application can still transition to the signed-out UI if storage is unavailable.
  }
}

export function getStoredAccessToken(): string | null {
  return readAuthSession()?.accessToken ?? null
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<AuthSession>
  return Boolean(
    typeof session.accessToken === 'string' &&
      session.accessToken &&
      typeof session.refreshToken === 'string' &&
      session.refreshToken &&
      typeof session.expiresAtUtc === 'string' &&
      !Number.isNaN(Date.parse(session.expiresAtUtc)) &&
      session.user &&
      typeof session.user === 'object' &&
      typeof session.user.id === 'string' &&
      typeof session.user.userName === 'string' &&
      typeof session.user.email === 'string' &&
      typeof session.user.role === 'string',
  )
}
