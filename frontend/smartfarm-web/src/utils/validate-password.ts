export type PasswordPolicyError = 'required' | 'minLength' | 'lowercase' | 'digit';

export function getPasswordPolicyError(password: string): PasswordPolicyError | null {
  if (!password) return 'required';
  if (password.length < 8) return 'minLength';
  if (!/[a-z]/.test(password)) return 'lowercase';
  if (!/\d/.test(password)) return 'digit';
  return null;
}
