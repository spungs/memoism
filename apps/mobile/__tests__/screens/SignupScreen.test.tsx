import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
});
