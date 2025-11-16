/**
 * Reusable MessageBubble component for chat messages
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MessageBubbleProps } from '../types/chat';

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar = false,
  avatarComponent,
}) => {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
      ]}
    >
      {/* Avatar for non-user messages */}
      {!isUser && showAvatar && avatarComponent && (
        <View style={styles.avatarContainer}>{avatarComponent}</View>
      )}

      {/* Message bubble */}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.assistantMessageBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText,
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  avatarContainer: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessageBubble: {
    backgroundColor: '#007AFF',
  },
  assistantMessageBubble: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#000',
  },
});

export default MessageBubble;