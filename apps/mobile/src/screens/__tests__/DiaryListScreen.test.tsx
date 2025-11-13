/**
 * Test 4.7: DiaryListScreen empty state
 *
 * Given: User has no diary entries
 * When: DiaryListScreen component is rendered
 * Then:
 *   - Screen should display empty state message
 *   - "일기가 없습니다" or similar message should be visible
 *   - No diary items should be displayed
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DiaryListScreen from '../DiaryListScreen';

// Mock fetch
global.fetch = jest.fn();

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

describe('DiaryListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_diary_list_empty_state', () => {
    it('should display empty state when no diaries exist', async () => {
      /**
       * Test 4.7: 일기 목록 화면 빈 상태
       *
       * Given: 서버에 일기가 없음
       * When: DiaryListScreen 렌더링
       * Then:
       *   - 빈 상태 메시지가 표시됨
       *   - "일기가 없습니다" 또는 유사한 메시지가 보임
       *   - 일기 아이템이 표시되지 않음
       */

      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const mockToken = 'mock-jwt-token-12345';

      // Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <DiaryListScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(/일기가 없습니다|작성된 일기가 없습니다/)
        ).toBeTruthy();
      });

      // Verify no diary items are displayed
      const diaryItems = screen.queryAllByTestId('diary-item');
      expect(diaryItems).toHaveLength(0);
    });
  });
});
