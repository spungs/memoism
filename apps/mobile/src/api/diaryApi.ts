/**
 * Diary API hooks using React Query
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';

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

interface UpdateDiaryRequest {
  id: string;
  title?: string;
  content?: string;
  images?: string[];
  location?: any;
}

export const useDiariesQuery = (token: string) => {
  return useQuery({
    queryKey: ['diaries'],
    queryFn: () => apiFetch<DiaryResponse[]>('/diary', { token }),
  });
};

export const useCreateDiary = (token: string) => {
  return useMutation({
    mutationFn: (data: CreateDiaryRequest) =>
      apiFetch<DiaryResponse>('/diary', { method: 'POST', token, body: data }),
  });
};

export const useUpdateDiary = (token: string) => {
  return useMutation({
    mutationFn: (data: UpdateDiaryRequest) => {
      const { id, ...updateData } = data;
      return apiFetch<DiaryResponse>(`/diary/${id}`, {
        method: 'PUT',
        token,
        body: updateData,
      });
    },
  });
};

export const useDeleteDiary = (token: string) => {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/diary/${id}`, { method: 'DELETE', token }),
  });
};

export const useDiaryDetail = (token: string, diaryId: string) => {
  return useQuery({
    queryKey: ['diary', diaryId],
    queryFn: () => apiFetch<DiaryResponse>(`/diary/${diaryId}`, { token }),
  });
};
