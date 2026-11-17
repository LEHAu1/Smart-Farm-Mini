import type { LoginCredentials, LoginErrors } from '../types/auth'

export function validateLogin({ email, password }: LoginCredentials): LoginErrors {
  const errors: LoginErrors = {}
  const identity = email.trim()
  if (!identity) errors.email = 'Vui lòng nhập email hoặc tên đăng nhập.'
  else if (identity.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)) errors.email = 'Email không đúng định dạng.'
  if (!password) errors.password = 'Vui lòng nhập mật khẩu.'
  return errors
}
