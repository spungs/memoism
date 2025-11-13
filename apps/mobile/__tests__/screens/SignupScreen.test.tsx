import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SignupScreen from '../../src/screens/SignupScreen';

// Helper to create QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('SignupScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_signup_screen_renders', () => {
    it('renders signup screen correctly', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SignupScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const signupTexts = screen.getAllByText('회원가입');
      expect(signupTexts).toHaveLength(2); // title and button
      expect(screen.getByPlaceholderText('이메일')).toBeTruthy();
      expect(screen.getByPlaceholderText('사용자명')).toBeTruthy();
      expect(screen.getByPlaceholderText('비밀번호')).toBeTruthy();
      expect(screen.getByText('이미 계정이 있으신가요? 로그인')).toBeTruthy();
    });
  });

  describe('test_signup_form_validation', () => {
    it('should show error when email is empty and submit is pressed', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SignupScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const submitButton = screen.getAllByText('회원가입')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.getByText('이메일을 입력해주세요')).toBeTruthy();
    });

    it('should show error when email format is invalid', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SignupScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const emailInput = screen.getByPlaceholderText('이메일');
      fireEvent.changeText(emailInput, 'invalid-email');

      const submitButton = screen.getAllByText('회원가입')[1];
      fireEvent.press(submitButton);

      expect(screen.getByText('올바른 이메일 형식이 아닙니다')).toBeTruthy();
    });

    it('should show error when username is empty and submit is pressed', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SignupScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const emailInput = screen.getByPlaceholderText('이메일');
      fireEvent.changeText(emailInput, 'test@example.com');

      const submitButton = screen.getAllByText('회원가입')[1];
      fireEvent.press(submitButton);

      expect(screen.getByText('사용자명을 입력해주세요')).toBeTruthy();
    });

    it('should show error when username is too short', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SignupScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const emailInput = screen.getByPlaceholderText('이메일');
      const usernameInput = screen.getByPlaceholderText('사용자명');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(usernameInput, 'ab');

      const submitButton = screen.getAllByText('회원가입')[1];
      fireEvent.press(submitButton);

      expect(screen.getByText('사용자명은 최소 3자 이상이어야 합니다')).toBeTruthy();
    });

    it('should show error when password is empty and submit is pressed', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SignupScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const emailInput = screen.getByPlaceholderText('이메일');
      const usernameInput = screen.getByPlaceholderText('사용자명');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(usernameInput, 'testuser');

      const submitButton = screen.getAllByText('회원가입')[1];
      fireEvent.press(submitButton);

      expect(screen.getByText('비밀번호를 입력해주세요')).toBeTruthy();
    });

    it('should show error when password is too short', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SignupScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const emailInput = screen.getByPlaceholderText('이메일');
      const usernameInput = screen.getByPlaceholderText('사용자명');
      const passwordInput = screen.getByPlaceholderText('비밀번호');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(usernameInput, 'testuser');
      fireEvent.changeText(passwordInput, '123');

      const submitButton = screen.getAllByText('회원가입')[1];
      fireEvent.press(submitButton);

      expect(screen.getByText('비밀번호는 최소 6자 이상이어야 합니다')).toBeTruthy();
    });

    it('should not show errors when all inputs are valid', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SignupScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const emailInput = screen.getByPlaceholderText('이메일');
      const usernameInput = screen.getByPlaceholderText('사용자명');
      const passwordInput = screen.getByPlaceholderText('비밀번호');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(usernameInput, 'testuser');
      fireEvent.changeText(passwordInput, 'password123');

      const submitButton = screen.getAllByText('회원가입')[1];
      fireEvent.press(submitButton);

      expect(screen.queryByText('이메일을 입력해주세요')).toBeNull();
      expect(screen.queryByText('올바른 이메일 형식이 아닙니다')).toBeNull();
      expect(screen.queryByText('사용자명을 입력해주세요')).toBeNull();
      expect(screen.queryByText('사용자명은 최소 3자 이상이어야 합니다')).toBeNull();
      expect(screen.queryByText('비밀번호를 입력해주세요')).toBeNull();
      expect(screen.queryByText('비밀번호는 최소 6자 이상이어야 합니다')).toBeNull();
    });
  });
});
