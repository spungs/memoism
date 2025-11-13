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
});
