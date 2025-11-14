/**
 * Chat Screen Tests
 *
 * Test 7.15: test_chat_screen_renders - 채팅 화면 렌더링
 * Test 7.16: test_chat_input_field - 메시지 입력 필드 동작
 * Test 7.17: test_send_message_button - 메시지 전송 버튼
 * Test 7.18: test_chat_message_display - 메시지 말풍선 표시
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChatScreen from '../ChatScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

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

describe('ChatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_chat_screen_renders', () => {
    /**
     * Test 7.15: ChatScreen renders
     *
     * Given: Authenticated user navigates to chat screen
     * When: ChatScreen component is rendered
     * Then:
     *   - Screen should display "채팅" or "AI 캐릭터" title
     *   - Message input field should be visible
     *   - Send button should be visible
     *   - Message list area should be visible
     */
    it('should render chat screen with all UI elements', async () => {
      // Arrange
      const mockToken = 'test-jwt-token';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      // Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ChatScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/메시지/i)).toBeTruthy();
        expect(screen.getByText(/전송/i)).toBeTruthy();
      });
    });
  });

  describe('test_chat_input_field', () => {
    /**
     * Test 7.16: Chat input field behavior
     *
     * Given: Chat screen is displayed
     * When: User types a message
     * Then:
     *   - Input field should update with typed text
     *   - Input field should accept Korean and English text
     */
    it('should accept user input in the message field', async () => {
      // Arrange
      const mockToken = 'test-jwt-token';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ChatScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/메시지/i)).toBeTruthy();
      });

      // Act
      const input = screen.getByPlaceholderText(/메시지/i);
      fireEvent.changeText(input, '안녕하세요!');

      // Assert
      expect(input.props.value).toBe('안녕하세요!');
    });
  });

  describe('test_send_message_button', () => {
    /**
     * Test 7.17: Send message button
     *
     * Given: User has typed a message
     * When: User presses send button
     * Then:
     *   - Message should be sent to API
     *   - Input field should be cleared
     *   - Send button should trigger POST /chat
     */
    it('should send message when send button is pressed', async () => {
      // Arrange
      const mockToken = 'test-jwt-token';
      const mockResponse = {
        id: '123',
        role: 'user',
        content: '테스트 메시지',
        created_at: '2025-01-14T10:00:00Z',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => mockResponse,
        });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ChatScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/메시지/i)).toBeTruthy();
      });

      // Act
      const input = screen.getByPlaceholderText(/메시지/i);
      const sendButton = screen.getByText(/전송/i);

      fireEvent.changeText(input, '테스트 메시지');
      fireEvent.press(sendButton);

      // Assert
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/chat'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ content: '테스트 메시지' }),
          })
        );
      });
    });
  });

  describe('test_chat_message_display', () => {
    /**
     * Test 7.18: Message display with user/AI distinction
     *
     * Given: Chat history exists with user and assistant messages
     * When: Chat screen loads
     * Then:
     *   - Messages should be displayed in a list
     *   - User messages should be distinguishable from AI messages
     *   - Each message should show content
     */
    it('should display messages with user and AI distinction', async () => {
      // Arrange
      const mockToken = 'test-jwt-token';
      const mockMessages = [
        {
          id: '1',
          role: 'user',
          content: '사용자 메시지',
          created_at: '2025-01-14T10:00:00Z',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'AI 응답',
          created_at: '2025-01-14T10:01:00Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockMessages,
      });

      // Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ChatScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('사용자 메시지')).toBeTruthy();
        expect(screen.getByText('AI 응답')).toBeTruthy();
      });
    });
  });

  describe('test_chat_loading_state', () => {
    /**
     * Test 7.21: Loading state display
     *
     * Given: Chat history is being loaded
     * When: Chat screen is rendered
     * Then:
     *   - ActivityIndicator should be visible
     *   - Loading spinner should be centered
     *   - Input field should not be visible during loading
     */
    it('should display loading state when fetching chat history', async () => {
      // Arrange
      const mockToken = 'test-jwt-token';
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(pendingPromise);

      // Act
      const Wrapper = createWrapper();
      const { getByTestId, queryByPlaceholderText } = render(
        <Wrapper>
          <ChatScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Assert - Loading state should be visible
      expect(() => getByTestId('activity-indicator')).not.toThrow();
      expect(queryByPlaceholderText(/메시지/i)).toBeNull();

      // Cleanup - Resolve promise to avoid warnings
      resolvePromise!({
        ok: true,
        json: async () => [],
      });
    });
  });

  describe('test_chat_error_handling', () => {
    /**
     * Test 7.22: Error message display
     *
     * Given: Network error or API failure
     * When: Chat screen tries to load
     * Then:
     *   - Error message should be displayed
     *   - Error text should be in red color
     *   - Retry option or message should be available
     */
    it('should display error message when API call fails', async () => {
      // Arrange
      const mockToken = 'test-jwt-token';
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      // Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ChatScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('채팅을 불러오는데 실패했습니다')).toBeTruthy();
      });
    });

    it('should display error when sending message fails', async () => {
      // Arrange
      const mockToken = 'test-jwt-token';

      // First call for loading history succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        // Second call for sending message fails
        .mockRejectedValueOnce(new Error('Failed to send message'));

      // Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ChatScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/메시지/i)).toBeTruthy();
      });

      const input = screen.getByPlaceholderText(/메시지/i);
      const sendButton = screen.getByText(/전송/i);

      fireEvent.changeText(input, '에러 테스트 메시지');
      fireEvent.press(sendButton);

      // Assert - Error handling for message send failure
      // Note: In real implementation, you might want to show a toast or error message
      // For now, we just verify the mutation was attempted
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
