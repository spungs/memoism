import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { API_URL } from './config';

interface UserInfo {
  id: string;
  username: string;
}

interface CommentInfo {
  id: string;
  content: string;
  user: UserInfo;
  created_at: string;
}

interface Diary {
  id: string;
  user_id: string;
  content: string;
  images?: string[];
  created_at: string;
  updated_at: string;
  is_public: boolean;
  user?: UserInfo;
  comment_count: number;
  like_count: number;
  is_liked: boolean;
  comments: CommentInfo[];
}

// 일기 목록 조회
export const useDiaries = (publicOnly: boolean = false) => {
  const token = useAuthStore((state) => state.token);
  return useQuery<Diary[]>({
    queryKey: ['diaries', publicOnly, token],
    queryFn: async () => {
      console.log('🔍 Fetching diaries from:', `${API_URL}/diaries?public_only=${publicOnly}`);
      console.log('🔑 Using token:', token ? 'Present' : 'Missing');
      console.log('🔑 Token preview:', token ? `${token.substring(0, 10)}...` : 'null');
      
      try {
        const response = await fetch(`${API_URL}/diaries?public_only=${publicOnly}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('❌ API Error:', errorData);
          throw new Error(errorData?.detail || 'Failed to fetch diaries');
        }
        
        const data = await response.json();
        console.log('✅ Diaries fetched successfully:', data.length, 'items');
        return data;
      } catch (error) {
        console.error('🚨 Network Error:', error);
        throw error;
      }
    },
    enabled: !!token, // 토큰이 있을 때만 쿼리 실행
  });
};

// 일기 상세 조회
export const useDiary = (id: string) => {
  const token = useAuthStore((state) => state.token);
  return useQuery<Diary>({
    queryKey: ['diary', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/diaries/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch diary');
      return response.json();
    },
  });
};

// 일기 작성
export const useCreateDiary = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ content, images }: { content: string; images?: string[] }) => {
      const response = await fetch(`${API_URL}/diaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content, images }),
      });
      if (!response.ok) throw new Error('Failed to create diary');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });
};

// 일기 수정
export const useUpdateDiary = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async ({ id, content, is_public, images }: { id: string; content?: string; is_public?: boolean; images?: string[] }) => {
      const updateData: { content?: string; is_public?: boolean; images?: string[] } = {};
      if (content !== undefined) updateData.content = content;
      if (is_public !== undefined) updateData.is_public = is_public;
      if (images !== undefined) updateData.images = images;
      
      const response = await fetch(`${API_URL}/diaries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to update diary');
      }
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['diary', id] });
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });
};

// 일기 삭제
export const useDeleteDiary = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/diaries/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to delete diary');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });
};

// 좋아요 토글
export const useToggleLike = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  
  return useMutation({
    mutationFn: async (diaryId: string) => {
      const response = await fetch(`${API_URL}/diaries/${diaryId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to toggle like');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });
};

// 댓글 작성
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  
  return useMutation({
    mutationFn: async ({ diaryId, content }: { diaryId: string; content: string }) => {
      const response = await fetch(`${API_URL}/diaries/${diaryId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to create comment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });
};

// 댓글 수정
export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const response = await fetch(`${API_URL}/diaries/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to update comment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });
};

// 댓글 삭제
export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  
  return useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`${API_URL}/diaries/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to delete comment');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });
}; 