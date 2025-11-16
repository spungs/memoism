import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useChatHistory, useSendMessage } from '../api/chatApi';
import AiCharacter from '../components/AiCharacter';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import LoadingScreen from '../components/LoadingScreen';
import ErrorScreen from '../components/ErrorScreen';
import { ERROR_MESSAGES } from '../constants/errorMessages';

interface ChatScreenProps {
  navigation: any;
  token: string;
}

export default function ChatScreen({ navigation, token }: ChatScreenProps) {
  const [message, setMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const characterCreatedAt = new Date('2025-01-01'); // AI 캐릭터 생성 날짜

  const { data: messages, isLoading, isError } = useChatHistory(token);
  const sendMessageMutation = useSendMessage(token);

  const handleSendMessage = () => {
    if (message.trim() === '') return;

    // Show typing indicator while waiting for response
    setIsAiTyping(true);

    sendMessageMutation.mutate(
      { content: message },
      {
        onSuccess: () => {
          setMessage('');
          // Hide typing indicator after a delay (simulating AI response)
          setTimeout(() => setIsAiTyping(false), 1500);
        },
        onError: () => {
          setIsAiTyping(false);
        },
      }
    );
  };

  if (isLoading) {
    return <LoadingScreen testID="activity-indicator" />;
  }

  if (isError) {
    return <ErrorScreen message={ERROR_MESSAGES.CHAT_FETCH_ERROR} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <FlatList
            data={messages || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                showAvatar={item.role === 'assistant'}
                avatarComponent={
                  item.role === 'assistant' ? (
                    <AiCharacter
                      status="idle"
                      size="small"
                      createdAt={characterCreatedAt}
                    />
                  ) : undefined
                }
              />
            )}
            contentContainerStyle={styles.messageList}
            inverted={false}
          />

          {/* AI Typing Indicator */}
          {isAiTyping && (
            <TypingIndicator
              avatarComponent={
                <AiCharacter
                  status="typing"
                  size="small"
                  createdAt={characterCreatedAt}
                />
              }
              text="입력 중..."
            />
          )}
        </View>

        <ChatInput
          value={message}
          onChange={setMessage}
          onSend={handleSendMessage}
          placeholder="메시지를 입력하세요"
          disabled={sendMessageMutation.isPending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
