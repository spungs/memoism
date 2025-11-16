/**
 * Reusable TypingIndicator component for showing when AI is typing
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TypingIndicatorProps } from '../types/chat';

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  avatarComponent,
  text = '입력 중...',
}) => {
  return (
    <View style={styles.container}>
      {avatarComponent && <View style={styles.avatarContainer}>{avatarComponent}</View>}
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatarContainer: {
    marginRight: 8,
  },
  bubble: {
    backgroundColor: '#E5E5EA',
    padding: 12,
    borderRadius: 16,
  },
  text: {
    fontSize: 16,
    color: '#000',
  },
});

export default TypingIndicator;