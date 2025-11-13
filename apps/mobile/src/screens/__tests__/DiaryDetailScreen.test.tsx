/**
 * Test 4.10: DiaryDetailScreen renders
 *
 * Given: User navigates to diary detail screen with diary ID
 * When: DiaryDetailScreen component is rendered
 * Then:
 *   - Screen should display diary title
 *   - Screen should display diary content
 *   - Screen should display diary date
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DiaryDetailScreen from '../DiaryDetailScreen';

// Mock fetch
global.fetch = jest.fn();

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
};

// Mock route
const mockRoute = {
  params: {
    diaryId: '123e4567-e89b-12d3-a456-426614174001',
  },
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

describe('DiaryDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_diary_detail_renders', () => {
    it('should display diary details', async () => {
      /**
       * Test 4.10: 일기 상세 화면 렌더링
       *
       * Given: 서버에 일기 상세 데이터가 있음
       * When: DiaryDetailScreen 렌더링
       * Then:
       *   - 일기 제목이 표시됨
       *   - 일기 내용이 표시됨
       *   - 일기 날짜가 표시됨
       */

      // Arrange
      const mockDiary = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: '첫 번째 일기',
        content: '오늘 날씨가 좋았다.',
        images: [],
        location: null,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDiary,
      });

      const mockToken = 'mock-jwt-token-12345';

      // Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <DiaryDetailScreen
            navigation={mockNavigation}
            route={mockRoute}
            token={mockToken}
          />
        </Wrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('첫 번째 일기')).toBeTruthy();
      });

      expect(screen.getByText('오늘 날씨가 좋았다.')).toBeTruthy();
      expect(screen.getByText(/2025/)).toBeTruthy(); // Check date is displayed
    });
  });
});
