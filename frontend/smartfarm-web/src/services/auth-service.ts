import type { LoginCredentials } from '../types/auth'

// Public demo credentials, not a real account. Replace this adapter in issue #7.
export const demoCredentials: LoginCredentials = {
  email: 'demo@smartfarm.local',
  password: 'SmartFarm123!',
}

export async function loginDemo(credentials: LoginCredentials): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  if (credentials.email.trim().toLowerCase() !== demoCredentials.email || credentials.password !== demoCredentials.password) {
    throw new Error('Email hoặc mật khẩu không đúng. Vui lòng thử lại.')
  }
  // No password, token, or authenticated session is stored by this demo.
}
