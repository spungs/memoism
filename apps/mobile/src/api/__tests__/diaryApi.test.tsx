/**
 * Diary API hooks tests
 *
 * Test 4.1: test_use_diaries_query - 일기 목록 조회 훅 테스트
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDiariesQuery } from '../diaryApi';

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

describe('DiaryApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_use_diaries_query', () => {
    it('should fetch diaries successfully', async () => {
      /**
       * Test 4.1: 일기 목록 조회 성공
       *
       * Given: 서버에 일기 목록이 있음
       * When: useDiariesQuery 훅을 호출
       * Then:
       *   - 일기 목록이 성공적으로 반환됨
       *   - 각 일기는 id, title, content, created_at 필드를 포함
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
      const { result } = renderHook(() => useDiariesQuery(mockToken), {
        wrapper: Wrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDiaries);
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0]).toHaveProperty('id');
      expect(result.current.data[0]).toHaveProperty('title');
      expect(result.current.data[0]).toHaveProperty('content');
      expect(result.current.data[0]).toHaveProperty('created_at');

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/diary'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });
  });

  describe('test_use_diaries_query_empty', () => {
    it('should handle empty diary list', async () => {
      /**
       * Test 4.2: 빈 일기 목록 처리
       *
       * Given: 서버에 일기가 없음
       * When: useDiariesQuery 훅을 호출
       * Then:
       *   - 빈 배열이 반환됨
       *   - 에러가 발생하지 않음
       *   - isSuccess는 true
       */

      // Arrange
      const mockEmptyDiaries: any[] = [];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyDiaries,
      });

      const mockToken = 'mock-jwt-token-12345';

      // Act
      const Wrapper = createWrapper();
      const { result } = renderHook(() => useDiariesQuery(mockToken), {
        wrapper: Wrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.data).toHaveLength(0);
      expect(result.current.isError).toBe(false);
    });
  });
});
