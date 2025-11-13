/**
 * Test 4.16: MapScreen renders
 * Test 4.17: Map markers display
 *
 * Given: User opens the map screen
 * When: MapScreen component is rendered
 * Then:
 *   - Screen should display successfully
 *   - Map view should be visible
 *   - Screen title should be displayed
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapScreen from '../MapScreen';

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

describe('MapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_map_screen_renders', () => {
    it('should render map screen successfully', async () => {
      /**
       * Test 4.16: 지도 화면 렌더링
       *
       * Given: 사용자가 지도 화면을 열음
       * When: MapScreen 렌더링
       * Then:
       *   - 화면이 정상적으로 표시됨
       *   - "지도" 또는 "Map" 제목이 보임
       *   - 지도 뷰가 표시됨 (testID로 확인)
       */

      // Arrange
      const mockToken = 'mock-jwt-token-12345';

      // Mock empty diaries response (no locations yet)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <MapScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Assert - Check that screen title is displayed
      await waitFor(() => {
        expect(screen.getByTestId('screen-title')).toBeTruthy();
      });

      // Verify title text content
      const titleElement = screen.getByTestId('screen-title');
      expect(titleElement.props.children).toBe('지도');

      // Assert - Check that map view is rendered
      expect(screen.getByTestId('map-view')).toBeTruthy();
    });
  });

  describe('test_map_markers', () => {
    it('should display markers for diaries with location data', async () => {
      /**
       * Test 4.17: 지도 마커 표시
       *
       * Given: 위치 정보가 있는 일기들이 존재함
       * When: MapScreen 렌더링
       * Then:
       *   - 각 일기의 위치에 마커가 표시됨
       *   - 마커 개수가 위치 정보가 있는 일기 개수와 일치
       *   - 마커에 testID가 있어 찾을 수 있음
       */

      // Arrange
      const mockToken = 'mock-jwt-token-12345';

      const mockDiariesWithLocations = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: '서울 여행',
          content: '남산타워에 다녀왔다.',
          images: [],
          location: {
            latitude: 37.5512,
            longitude: 126.9882,
            address: '서울특별시 용산구 남산공원길',
          },
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          title: '부산 여행',
          content: '해운대 바다를 봤다.',
          images: [],
          location: {
            latitude: 35.1586,
            longitude: 129.1603,
            address: '부산광역시 해운대구',
          },
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2025-01-02T00:00:00.000Z',
          updated_at: '2025-01-02T00:00:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          title: '집에서',
          content: '오늘은 집에만 있었다.',
          images: [],
          location: null, // No location
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          created_at: '2025-01-03T00:00:00.000Z',
          updated_at: '2025-01-03T00:00:00.000Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDiariesWithLocations,
      });

      // Act
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <MapScreen navigation={mockNavigation} token={mockToken} />
        </Wrapper>
      );

      // Assert - Wait for markers to be displayed
      await waitFor(() => {
        const markers = screen.getAllByTestId('map-marker');
        // Should have 2 markers (2 diaries with location, 1 without)
        expect(markers).toHaveLength(2);
      });
    });
  });
});
