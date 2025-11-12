/**
 * Test 3.5: useSignup mutation
 *
 * Given: User provides valid signup data
 * When: useSignup mutation is called
 * Then:
 *   - API request is sent to /auth/signup
 *   - Response includes user data (id, email, username)
 *   - Success callback is triggered
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSignup, useLogin } from '../authApi';

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

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_use_signup_mutation', () => {
    it('should successfully signup a new user', async () => {
      // Arrange
      const mockResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'newuser@example.com',
        username: 'newuser',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const signupData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
      };

      // Act
      const { result } = renderHook(() => useSignup(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(signupData);

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/signup'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(signupData),
        })
      );

      expect(result.current.data).toEqual(mockResponse);
    });
  });

  /**
   * Test 3.6: useSignup error handling
   *
   * Given: API returns an error response (e.g., duplicate email)
   * When: useSignup mutation is called
   * Then:
   *   - isError should be true
   *   - error object should contain error information
   *   - User data should not be set
   */
  describe('test_use_signup_error', () => {
    it('should handle signup error when API returns 400', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Email already registered' }),
      });

      const signupData = {
        email: 'existing@example.com',
        username: 'testuser',
        password: 'password123',
      };

      // Act
      const { result } = renderHook(() => useSignup(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(signupData);

      // Assert
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });
  });

  /**
   * Test 3.7: useLogin mutation
   *
   * Given: User provides valid login credentials
   * When: useLogin mutation is called
   * Then:
   *   - API request is sent to /auth/login
   *   - Response includes access_token and user data
   *   - Success callback is triggered
   */
  describe('test_use_login_mutation', () => {
    it('should successfully login a user and return token', async () => {
      // Arrange
      const mockResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          username: 'testuser',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      // Act
      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(loginData);

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(loginData),
        })
      );

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.access_token).toBeDefined();
      expect(result.current.data?.user.email).toBe('user@example.com');
    });
  });

  /**
   * Test 3.8: useLogin error handling
   *
   * Given: API returns an error response (e.g., invalid credentials)
   * When: useLogin mutation is called
   * Then:
   *   - isError should be true
   *   - error object should contain error information
   *   - Token and user data should not be set
   */
  describe('test_use_login_error', () => {
    it('should handle login error when credentials are invalid', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid email or password' }),
      });

      const loginData = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      };

      // Act
      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(loginData);

      // Assert
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });
  });
});
