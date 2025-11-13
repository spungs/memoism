/**
 * Test 4.7: DiaryListScreen empty state
 * Test 4.8: DiaryListScreen with data
 * Test 4.9: DiaryListScreen navigation
 *
 * Given: User has no diary entries
 * When: DiaryListScreen component is rendered
 * Then:
 *   - Screen should display empty state message
 *   - "일기가 없습니다" or similar message should be visible
 *   - No diary items should be displayed
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
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

  describe('test_diary_list_with_data', () => {
    it('should display list of diaries when data exists', async () => {
      /**
       * Test 4.8: 일기 목록 화면 데이터 있음
       *
       * Given: 서버에 일기 데이터가 있음
       * When: DiaryListScreen 렌더링
       * Then:
       *   - 일기 아이템이 표시됨
       *   - 각 일기의 제목과 내용이 보임
       *   - testID로 일기 아이템을 찾을 수 있음
       */

      // Arrange
      const mockDiaries = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: '첫 번째 일기',
          content: '오늘 날씨가 좋았다.',
          images: [],
          location: null,
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          title: '두 번째 일기',
          content: '오늘은 친구를 만났다.',
          images: [],
          location: null,
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2025-01-02T00:00:00.000Z',
          updated_at: '2025-01-02T00:00:00.000Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDiaries,
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
        const diaryItems = screen.getAllByTestId('diary-item');
        expect(diaryItems).toHaveLength(2);
      });

      // Verify diary content is displayed
      expect(screen.getByText('첫 번째 일기')).toBeTruthy();
      expect(screen.getByText('오늘 날씨가 좋았다.')).toBeTruthy();
      expect(screen.getByText('두 번째 일기')).toBeTruthy();
      expect(screen.getByText('오늘은 친구를 만났다.')).toBeTruthy();
    });
  });

  describe('test_diary_list_navigation', () => {
    it('should navigate to diary detail when item is pressed', async () => {
      /**
       * Test 4.9: 일기 상세로 네비게이션
       *
       * Given: 일기 목록이 표시됨
       * When: 일기 아이템을 터치
       * Then:
       *   - navigation.navigate가 호출됨
       *   - 'DiaryDetail' 화면으로 이동
       *   - 선택한 일기 ID가 파라미터로 전달됨
       */

      // Arrange
      const mockDiaries = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: '첫 번째 일기',
          content: '오늘 날씨가 좋았다.',
          images: [],
          location: null,
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDiaries,
      });

      const mockToken = 'mock-jwt-token-12345';

      // Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <DiaryListScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Wait for diary items to be displayed
      await waitFor(() => {
        const diaryItems = screen.getAllByTestId('diary-item');
        expect(diaryItems).toHaveLength(1);
      });

      // Press the diary item
      const diaryItem = screen.getByTestId('diary-item');
      fireEvent.press(diaryItem);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith('DiaryDetail', {
        diaryId: '123e4567-e89b-12d3-a456-426614174001',
      });
    });
  });
});
