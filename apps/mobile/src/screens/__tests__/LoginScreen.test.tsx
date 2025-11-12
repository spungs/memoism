/**
 * Test 3.9: LoginScreen renders
 *
 * Given: User navigates to the login screen
 * When: LoginScreen component is rendered
 * Then:
 *   - Screen should display "로그인" title
 *   - Email input field should be visible
 *   - Password input field should be visible
 *   - Login button should be visible
 *   - Signup link should be visible
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginScreen from '../LoginScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_login_screen_renders', () => {
    it('should render login screen with all elements', () => {
      // Arrange & Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <LoginScreen navigation={mockNavigation} />
        </Wrapper>
      );

      // Assert
      const loginTexts = screen.getAllByText('로그인');
      expect(loginTexts.length).toBeGreaterThanOrEqual(2); // title + button
      expect(screen.getByPlaceholderText('이메일')).toBeTruthy();
      expect(screen.getByPlaceholderText('비밀번호')).toBeTruthy();
      expect(screen.getByText(/회원가입/)).toBeTruthy();
    });
  });
});
