/**
 * Chat API hooks using React Query
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { API_URL } from '../config/api';
import { ChatMessageResponse, SendMessageRequest } from '../types/chat';

export const useSendMessage = (token: string) => {
  return useMutation({
    mutationFn: async (data: SendMessageRequest): Promise<ChatMessageResponse> => {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send message');
      }

      return response.json();
    },
  });
};

export const useChatHistory = (token: string) => {
  return useQuery({
    queryKey: ['chat-history'],
    queryFn: async (): Promise<ChatMessageResponse[]> => {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch chat history');
      }

      return response.json();
    },
  });
};
