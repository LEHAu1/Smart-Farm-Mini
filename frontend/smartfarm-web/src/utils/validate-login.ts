import type { LoginCredentials, LoginErrors } from '../types/auth'

export function validateLogin({ email, password }: LoginCredentials): LoginErrors {
  const errors: LoginErrors = {}
  if (!email.trim()) errors.email = 'Vui lòng nhập email.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Email không đúng định dạng.'
  if (!password) errors.password = 'Vui lòng nhập mật khẩu.'
  return errors
}
