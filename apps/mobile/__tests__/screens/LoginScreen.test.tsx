import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginScreen from '../../src/screens/LoginScreen';
import { useAuthStore } from '../../src/store/authStore';

// Mock fetch
global.fetch = jest.fn();

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

describe('LoginScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth store
    useAuthStore.getState().clearAuth();
  });

  describe('test_login_screen_renders', () => {
    it('renders login screen correctly', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <LoginScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const loginTexts = screen.getAllByText('로그인');
      expect(loginTexts).toHaveLength(2); // title and button
      expect(screen.getByPlaceholderText('이메일')).toBeTruthy();
      expect(screen.getByPlaceholderText('비밀번호')).toBeTruthy();
      expect(screen.getByText('계정이 없으신가요? 회원가입')).toBeTruthy();
    });
  });

  describe('test_login_form_validation', () => {
    it('should show error when email is empty and submit is pressed', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <LoginScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const submitButton = screen.getAllByText('로그인')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.getByText('이메일을 입력해주세요')).toBeTruthy();
    });

    it('should show error when email format is invalid', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <LoginScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const emailInput = screen.getByPlaceholderText('이메일');
      fireEvent.changeText(emailInput, 'invalid-email');

      const submitButton = screen.getAllByText('로그인')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.getByText('올바른 이메일 형식이 아닙니다')).toBeTruthy();
    });

    it('should show error when password is empty and submit is pressed', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <LoginScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const emailInput = screen.getByPlaceholderText('이메일');
      fireEvent.changeText(emailInput, 'test@example.com');

      const submitButton = screen.getAllByText('로그인')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.getByText('비밀번호를 입력해주세요')).toBeTruthy();
    });

    it('should show error when password is too short', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <LoginScreen navigation={mockNavigation} />
        </Wrapper>
      );

      const emailInput = screen.getByPlaceholderText('이메일');
      const passwordInput = screen.getByPlaceholderText('비밀번호');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '123');

      const submitButton = screen.getAllByText('로그인')[1]; // Get button, not title
      fireEvent.press(submitButton);

      expect(screen.getByText('비밀번호는 최소 6자 이상이어야 합니다')).toBeTruthy();
    });

    it('should not show errors when all inputs are valid', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <LoginScreen navigation={mockNavigation} />
        </Wrapper>
      );

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

  describe('test_login_submission', () => {
    it('should call login API and store token when form is submitted with valid data', async () => {
      // Arrange
      const mockResponse = {
        access_token: 'mock-jwt-token-12345',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          username: 'testuser',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <LoginScreen navigation={mockNavigation} />
        </Wrapper>
      );

      // Act
      const emailInput = screen.getByPlaceholderText('이메일');
      const passwordInput = screen.getByPlaceholderText('비밀번호');
      const submitButton = screen.getAllByText('로그인')[1];

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(submitButton);

      // Assert
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123',
            }),
          })
        );
      });

      // Check that token and user are stored in authStore
      await waitFor(() => {
        const authState = useAuthStore.getState();
        expect(authState.token).toBe('mock-jwt-token-12345');
        expect(authState.user?.email).toBe('test@example.com');
        expect(authState.isAuthenticated).toBe(true);
      });
    });
  });
});
