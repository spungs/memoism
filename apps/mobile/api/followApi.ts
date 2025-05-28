import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { API_URL } from './config';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  is_read: boolean;
  created_at: string;
}

// 사용자 팔로우
export const useFollowUser = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore.getState().token;
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`${API_URL}/follow/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to follow user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
    },
  });
};

// 사용자 언팔로우
export const useUnfollowUser = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore.getState().token;
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`${API_URL}/follow/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to unfollow user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
    },
  });
};

// 팔로잉 목록 조회
export const useFollowing = () => {
  const token = useAuthStore.getState().token;
  return useQuery<UserProfile[]>({
    queryKey: ['following'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/follow/following`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to fetch following');
      }
      return response.json();
    },
  });
};

// 팔로워 목록 조회
export const useFollowers = () => {
  const token = useAuthStore.getState().token;
  return useQuery<UserProfile[]>({
    queryKey: ['followers'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/follow/followers`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to fetch followers');
      }
      return response.json();
    },
  });
};

// 팔로우 상태 확인
export const useFollowStatus = (userId: string) => {
  const token = useAuthStore.getState().token;
  return useQuery<{ is_following: boolean }>({
    queryKey: ['followStatus', userId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/follow/check/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to check follow status');
      }
      return response.json();
    },
    enabled: !!userId,
  });
};

// 알림 목록 조회
export const useNotifications = () => {
  const token = useAuthStore.getState().token;
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/follow/notifications`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to fetch notifications');
      }
      return response.json();
    },
  });
};

// 알림 읽음 처리
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore.getState().token;
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`${API_URL}/follow/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to mark notification as read');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}; 