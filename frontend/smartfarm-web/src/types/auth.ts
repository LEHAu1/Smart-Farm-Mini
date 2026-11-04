export interface LoginCredentials {
  email: string
  password: string
}

export type LoginErrors = Partial<Record<keyof LoginCredentials, string>>
