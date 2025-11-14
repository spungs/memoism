/**
 * Tests for Chat API hooks
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSendMessage, useChatHistory } from '../chatApi';

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

describe('chatApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_use_chat_mutation', () => {
    /**
     * Test 7.19: useSendMessage mutation
     *
     * Given: Authenticated user wants to send a chat message
     * When: useSendMessage mutation is called with message content
     * Then:
     *   - API request is sent to POST /chat with Authorization header
     *   - Response includes message data (id, role, content, created_at)
     *   - Role is "user"
     *   - Success callback is triggered
     */
    it('should successfully send a chat message', async () => {
      // Arrange
      const mockResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user',
        content: '안녕? 오늘 기분이 어때?',
        created_at: '2025-01-14T10:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const token = 'test-jwt-token';
      const messageData = {
        content: '안녕? 오늘 기분이 어때?',
      };

      // Act
      const { result } = renderHook(() => useSendMessage(token), {
        wrapper: createWrapper(),
      });

      result.current.mutate(messageData);

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(messageData),
        })
      );

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.role).toBe('user');
    });
  });

  describe('test_use_chat_history_query', () => {
    /**
     * Test 7.20: useChatHistory query
     *
     * Given: Authenticated user has chat message history
     * When: useChatHistory query is called
     * Then:
     *   - API request is sent to GET /chat with Authorization header
     *   - Response includes array of messages
     *   - Messages are in reverse chronological order (newest first)
     *   - Each message has id, role, content, created_at
     */
    it('should fetch chat history successfully', async () => {
      // Arrange
      const mockMessages = [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          role: 'user' as const,
          content: '세 번째 메시지',
          created_at: '2025-01-14T12:00:00Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          role: 'assistant' as const,
          content: '두 번째 응답',
          created_at: '2025-01-14T11:30:00Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          role: 'user' as const,
          content: '첫 번째 메시지',
          created_at: '2025-01-14T11:00:00Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessages,
      });

      const token = 'test-jwt-token';

      // Act
      const { result } = renderHook(() => useChatHistory(token), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMessages);
      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0].role).toBe('user');
      expect(result.current.data?.[1].role).toBe('assistant');
      expect(result.current.data?.[0]).toHaveProperty('id');
      expect(result.current.data?.[0]).toHaveProperty('content');
      expect(result.current.data?.[0]).toHaveProperty('created_at');

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      );
    });
  });
});
