export interface UserDto {
  id: string
  email: string
  displayName: string
  role: string
}

export interface UserProfileDto {
  id: string
  email: string
  displayName: string
  phoneNumber?: string | null
  role: string
  createdAtUtc: string
}

export interface AuthResponseDto {
  accessToken: string
  refreshToken: string
  expiresAtUtc: string
  user: UserDto
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  displayName?: string
}

export type LoginErrors = Partial<Record<keyof LoginCredentials, string>>
export type RegisterErrors = Partial<Record<keyof RegisterCredentials | 'confirmPassword', string>>
