/**
 * Diary API hooks using React Query
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { Diary, CreateDiaryRequest, UpdateDiaryRequest } from '../types/diary';

export const useDiariesQuery = (token: string) => {
  return useQuery({
    queryKey: ['diaries'],
    queryFn: () => apiFetch<Diary[]>('/diary', { token }),
  });
};

export const useCreateDiary = (token: string) => {
  return useMutation({
    mutationFn: (data: CreateDiaryRequest) =>
      apiFetch<Diary>('/diary', { method: 'POST', token, body: data }),
  });
};

export const useUpdateDiary = (token: string) => {
  return useMutation({
    mutationFn: (data: UpdateDiaryRequest) => {
      const { id, ...updateData } = data;
      return apiFetch<Diary>(`/diary/${id}`, {
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
    queryFn: () => apiFetch<Diary>(`/diary/${diaryId}`, { token }),
  });
};
