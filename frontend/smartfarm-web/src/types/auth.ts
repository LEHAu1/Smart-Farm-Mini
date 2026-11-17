export interface LoginCredentials {
  email: string
  password: string
}

export type LoginErrors = Partial<Record<keyof LoginCredentials, string>>

export interface AuthUser {
  id: string
  userName: string
  email: string
  displayName?: string | null
  phoneNumber?: string | null
  role: string
  createdAtUtc?: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAtUtc: string
  user: AuthUser
}
