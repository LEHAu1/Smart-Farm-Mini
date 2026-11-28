export type PlantMood = 'idle' | 'focus' | 'error' | 'success';

export interface RegisterFieldValidation {
  username?: boolean;
  email?: boolean;
  password?: boolean;
  confirm?: boolean;
}

/**
 * Calculates registration form completion progress strictly from boolean validity flags.
 * NEVER inspects or reads password text or sensitive inputs.
 * Returns a normalized progress number from 0 to 1.
 */
export function calculateRegisterProgress(validity: RegisterFieldValidation): number {
  const fields = [validity.username, validity.email, validity.password, validity.confirm];
  const validCount = fields.filter(Boolean).length;
  return validCount / fields.length;
}
