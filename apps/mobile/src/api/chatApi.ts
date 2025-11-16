/**
 * Chat API hooks using React Query
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/apiClient';
import { ChatMessageResponse, SendMessageRequest } from '../types/chat';

export const useSendMessage = (token: string) => {
  return useMutation({
    mutationFn: (data: SendMessageRequest) =>
      apiFetch<ChatMessageResponse>('/chat', { method: 'POST', token, body: data }),
  });
};

export const useChatHistory = (token: string) => {
  return useQuery({
    queryKey: ['chat-history'],
    queryFn: () => apiFetch<ChatMessageResponse[]>('/chat', { token }),
  });
};
