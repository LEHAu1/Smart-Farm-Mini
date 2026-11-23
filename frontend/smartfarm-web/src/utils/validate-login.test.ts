import { describe, expect, it } from 'vitest';
import { validateLogin } from './validate-login';

describe('validateLogin', () => {
  it('only requires a non-empty password during login', () => {
    expect(validateLogin({ email: 'farmer', password: 'x' })).toEqual({});
  });

  it('requires a password', () => {
    expect(validateLogin({ email: 'farmer', password: '' }).password).toBe('Vui lòng nhập mật khẩu.');
  });
});
