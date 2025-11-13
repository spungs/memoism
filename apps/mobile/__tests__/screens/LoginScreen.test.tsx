import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';

describe('LoginScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_login_screen_renders', () => {
    it('renders login screen correctly', () => {
      render(<LoginScreen navigation={mockNavigation} />);

      const loginTexts = screen.getAllByText('로그인');
      expect(loginTexts).toHaveLength(2); // title and button
      expect(screen.getByPlaceholderText('이메일')).toBeTruthy();
      expect(screen.getByPlaceholderText('비밀번호')).toBeTruthy();
      expect(screen.getByText('계정이 없으신가요? 회원가입')).toBeTruthy();
    });
  });

  describe('test_login_form_validation', () => {
    it('should show error when email is empty and submit is pressed', () => {
      render(<LoginScreen navigation={mockNavigation} />);

      const submitButton = screen.getAllByText('로그인')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.getByText('이메일을 입력해주세요')).toBeTruthy();
    });

    it('should show error when email format is invalid', () => {
      render(<LoginScreen navigation={mockNavigation} />);

      const emailInput = screen.getByPlaceholderText('이메일');
      fireEvent.changeText(emailInput, 'invalid-email');

      const submitButton = screen.getAllByText('로그인')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.getByText('올바른 이메일 형식이 아닙니다')).toBeTruthy();
    });

    it('should show error when password is empty and submit is pressed', () => {
      render(<LoginScreen navigation={mockNavigation} />);

      const emailInput = screen.getByPlaceholderText('이메일');
      fireEvent.changeText(emailInput, 'test@example.com');

      const submitButton = screen.getAllByText('로그인')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.getByText('비밀번호를 입력해주세요')).toBeTruthy();
    });

    it('should show error when password is too short', () => {
      render(<LoginScreen navigation={mockNavigation} />);

      const emailInput = screen.getByPlaceholderText('이메일');
      const passwordInput = screen.getByPlaceholderText('비밀번호');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '123');

      const submitButton = screen.getAllByText('로그인')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.getByText('비밀번호는 최소 6자 이상이어야 합니다')).toBeTruthy();
    });

    it('should not show errors when all inputs are valid', () => {
      render(<LoginScreen navigation={mockNavigation} />);

      const emailInput = screen.getByPlaceholderText('이메일');
      const passwordInput = screen.getByPlaceholderText('비밀번호');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const submitButton = screen.getAllByText('로그인')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.queryByText('이메일을 입력해주세요')).toBeNull();
      expect(screen.queryByText('올바른 이메일 형식이 아닙니다')).toBeNull();
      expect(screen.queryByText('비밀번호를 입력해주세요')).toBeNull();
      expect(screen.queryByText('비밀번호는 최소 6자 이상이어야 합니다')).toBeNull();
    });
  });
});
