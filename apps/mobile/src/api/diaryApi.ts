/**
 * Diary API hooks using React Query
 */
import { useQuery, useMutation } from '@tanstack/react-query';

const API_URL = 'http://localhost:8000';

interface DiaryResponse {
  id: string;
  title: string | null;
  content: string;
  images: string[];
  location: any | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface CreateDiaryRequest {
  title?: string;
  content: string;
  images?: string[];
  location?: any;
}

export const useDiariesQuery = (token: string) => {
  return useQuery({
    queryKey: ['diaries'],
    queryFn: async (): Promise<DiaryResponse[]> => {
      const response = await fetch(`${API_URL}/diary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch diaries');
      }

      return response.json();
    },
  });
};

export const useCreateDiary = (token: string) => {
  return useMutation({
    mutationFn: async (data: CreateDiaryRequest): Promise<DiaryResponse> => {
      const response = await fetch(`${API_URL}/diary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create diary');
      }

      return response.json();
    },
  });
};
