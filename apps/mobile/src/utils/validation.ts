/**
 * Form validation utilities
 *
 * Pure functions for validating form inputs.
 * These functions return ValidationResult objects instead of directly
 * manipulating state, making them easier to test and reuse.
 */

export interface ValidationResult {
  isValid: boolean;
  errorMessage: string;
}

/**
 * 이메일 형식 유효성 검증
 *
 * @param {string} email - 검증할 이메일 주소
 * @returns {ValidationResult} 검증 결과 및 에러 메시지
 *
 * @example
 * const result = validateEmail('test@example.com');
 * if (!result.isValid) {
 *   setEmailError(result.errorMessage);
 * }
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, errorMessage: '이메일을 입력해주세요' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, errorMessage: '올바른 이메일 형식이 아닙니다' };
  }

  return { isValid: true, errorMessage: '' };
};

/**
 * 비밀번호 유효성 검증
 *
 * @param {string} password - 검증할 비밀번호
 * @returns {ValidationResult} 검증 결과 및 에러 메시지
 *
 * @example
 * const result = validatePassword('mypassword');
 * if (!result.isValid) {
 *   setPasswordError(result.errorMessage);
 * }
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, errorMessage: '비밀번호를 입력해주세요' };
  }

  if (password.length < 6) {
    return { isValid: false, errorMessage: '비밀번호는 최소 6자 이상이어야 합니다' };
  }

  return { isValid: true, errorMessage: '' };
};

/**
 * 사용자명 유효성 검증
 *
 * @param {string} username - 검증할 사용자명
 * @returns {ValidationResult} 검증 결과 및 에러 메시지
 *
 * @example
 * const result = validateUsername('john');
 * if (!result.isValid) {
 *   setUsernameError(result.errorMessage);
 * }
 */
export const validateUsername = (username: string): ValidationResult => {
  if (!username) {
    return { isValid: false, errorMessage: '사용자명을 입력해주세요' };
  }

  if (username.length < 3) {
    return { isValid: false, errorMessage: '사용자명은 최소 3자 이상이어야 합니다' };
  }

  return { isValid: true, errorMessage: '' };
};
