/**
 * Chat related type definitions for improved reusability and type safety
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface ChatMessageResponse extends ChatMessage {}

export interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar?: boolean;
  avatarComponent?: React.ReactNode;
}

export interface ChatInputProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

export interface TypingIndicatorProps {
  avatarComponent?: React.ReactNode;
  text?: string;
}