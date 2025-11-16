import { validateEmail, validatePassword, validateUsername } from '../validation';

describe('validateEmail', () => {
  it('should return error for empty email', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('이메일을 입력해주세요');
  });

  it('should return error for invalid email format (missing @)', () => {
    const result = validateEmail('testexample.com');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('올바른 이메일 형식이 아닙니다');
  });

  it('should return error for invalid email format (missing domain)', () => {
    const result = validateEmail('test@');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('올바른 이메일 형식이 아닙니다');
  });

  it('should return error for invalid email format (missing extension)', () => {
    const result = validateEmail('test@example');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('올바른 이메일 형식이 아닙니다');
  });

  it('should return valid for correct email format', () => {
    const result = validateEmail('test@example.com');
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBe('');
  });

  it('should return valid for email with subdomain', () => {
    const result = validateEmail('user@mail.example.com');
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBe('');
  });
});

describe('validatePassword', () => {
  it('should return error for empty password', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('비밀번호를 입력해주세요');
  });

  it('should return error for password shorter than 6 characters', () => {
    const result = validatePassword('12345');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('비밀번호는 최소 6자 이상이어야 합니다');
  });

  it('should return valid for password with exactly 6 characters', () => {
    const result = validatePassword('123456');
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBe('');
  });

  it('should return valid for password longer than 6 characters', () => {
    const result = validatePassword('MySecurePassword123!');
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBe('');
  });
});

describe('validateUsername', () => {
  it('should return error for empty username', () => {
    const result = validateUsername('');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('사용자명을 입력해주세요');
  });

  it('should return error for username shorter than 3 characters', () => {
    const result = validateUsername('ab');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('사용자명은 최소 3자 이상이어야 합니다');
  });

  it('should return valid for username with exactly 3 characters', () => {
    const result = validateUsername('abc');
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBe('');
  });

  it('should return valid for username longer than 3 characters', () => {
    const result = validateUsername('john_doe');
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBe('');
  });
});
