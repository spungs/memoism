/**
 * Test 4.10: DiaryDetailScreen renders
 * Test 4.11: DiaryDetailScreen images
 * Test 4.12: DiaryDetailScreen location
 *
 * Given: User navigates to diary detail screen with diary ID
 * When: DiaryDetailScreen component is rendered
 * Then:
 *   - Screen should display diary title
 *   - Screen should display diary content
 *   - Screen should display diary date
 *   - Screen should display diary images
 *   - Screen should display location information
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

  describe('test_diary_detail_images', () => {
    it('should display diary images', async () => {
      /**
       * Test 4.11: 일기 이미지 표시
       *
       * Given: 일기에 이미지가 포함되어 있음
       * When: DiaryDetailScreen 렌더링
       * Then:
       *   - 이미지들이 표시됨
       *   - 각 이미지는 testID로 찾을 수 있음
       *   - 이미지 URL이 source prop에 올바르게 설정됨
       */

      // Arrange
      const mockImageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];

      const mockDiary = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: '사진과 함께한 일기',
        content: '오늘 멋진 풍경을 봤다.',
        images: mockImageUrls,
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
        expect(screen.getByText('사진과 함께한 일기')).toBeTruthy();
      });

      // Verify images are displayed
      const images = screen.getAllByTestId('diary-image');
      expect(images).toHaveLength(2);

      // Verify image sources
      expect(images[0].props.source).toEqual({ uri: mockImageUrls[0] });
      expect(images[1].props.source).toEqual({ uri: mockImageUrls[1] });
    });
  });

  describe('test_diary_detail_location', () => {
    it('should display location information', async () => {
      /**
       * Test 4.12: 일기 위치 정보 표시
       *
       * Given: 일기에 위치 정보가 포함되어 있음
       * When: DiaryDetailScreen 렌더링
       * Then:
       *   - 위치 정보가 표시됨
       *   - 위치 이름 또는 주소가 보임
       */

      // Arrange
      const mockLocation = {
        name: '서울 타워',
        address: '서울특별시 용산구',
        latitude: 37.5512,
        longitude: 126.9882,
      };

      const mockDiary = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: '서울 타워 방문',
        content: '오늘 서울 타워에 다녀왔다.',
        images: [],
        location: mockLocation,
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
        expect(screen.getByText('서울 타워 방문')).toBeTruthy();
      });

      // Verify location is displayed - should have 2 instances (title and location)
      const seoulTowerTexts = screen.getAllByText(/서울 타워/);
      expect(seoulTowerTexts.length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText(/서울특별시 용산구/)).toBeTruthy();
    });
  });
});
