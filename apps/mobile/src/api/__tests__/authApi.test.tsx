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
import { useSignup } from '../authApi';

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
});
