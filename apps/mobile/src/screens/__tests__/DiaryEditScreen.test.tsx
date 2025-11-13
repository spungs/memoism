/**
 * Test 4.13: DiaryEditScreen form
 *
 * Given: User navigates to diary edit screen with diary ID
 * When: DiaryEditScreen component is rendered
 * Then:
 *   - Screen should load existing diary data into form
 *   - Screen should display title input field
 *   - Screen should display content input field
 *   - User should be able to modify title and content
 *   - Submit button should be present
 */
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DiaryEditScreen from '../DiaryEditScreen';

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

describe('DiaryEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('test_diary_edit_form', () => {
    it('should load existing diary data into form', async () => {
      /**
       * Test 4.13: 일기 편집 폼
       *
       * Given: 서버에 기존 일기 데이터가 있음
       * When: DiaryEditScreen 렌더링
       * Then:
       *   - 기존 일기 데이터가 폼에 로드됨
       *   - 제목 입력 필드가 표시됨
       *   - 내용 입력 필드가 표시됨
       *   - 제목과 내용을 수정할 수 있음
       *   - 저장 버튼이 표시됨
       */

      // Arrange
      const mockDiary = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: '기존 일기 제목',
        content: '기존 일기 내용입니다.',
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
          <DiaryEditScreen
            navigation={mockNavigation}
            route={mockRoute}
            token={mockToken}
          />
        </Wrapper>
      );

      // Assert - Wait for data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('기존 일기 제목')).toBeTruthy();
      });

      expect(screen.getByDisplayValue('기존 일기 내용입니다.')).toBeTruthy();

      // Verify inputs are editable
      const titleInput = screen.getByPlaceholderText('제목');
      const contentInput = screen.getByPlaceholderText('내용');

      fireEvent.changeText(titleInput, '수정된 제목');
      fireEvent.changeText(contentInput, '수정된 내용입니다.');

      expect(screen.getByDisplayValue('수정된 제목')).toBeTruthy();
      expect(screen.getByDisplayValue('수정된 내용입니다.')).toBeTruthy();

      // Verify submit button exists
      expect(screen.getByText('저장')).toBeTruthy();
    });
  });
});
