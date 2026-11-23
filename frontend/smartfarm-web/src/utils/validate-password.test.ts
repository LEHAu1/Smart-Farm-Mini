import { describe, expect, it } from 'vitest';
import { getPasswordPolicyError } from './validate-password';

describe('getPasswordPolicyError', () => {
  it('requires a password', () => {
    expect(getPasswordPolicyError('')).toBe('required');
  });

  it('requires at least eight characters', () => {
    expect(getPasswordPolicyError('abc1234')).toBe('minLength');
  });

  it('requires a lowercase letter', () => {
    expect(getPasswordPolicyError('PASSWORD1')).toBe('lowercase');
  });

  it('requires a digit', () => {
    expect(getPasswordPolicyError('password')).toBe('digit');
  });

  it('accepts a password with at least eight characters, a lowercase letter, and a digit', () => {
    expect(getPasswordPolicyError('Password1')).toBeNull();
  });
});
