import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface AiCharacterProps {
  status: 'idle' | 'typing' | 'sleeping';
  createdAt?: Date;
  size?: 'small' | 'medium' | 'large';
}

export default function AiCharacter({
  status = 'idle',
  createdAt,
  size = 'medium',
}: AiCharacterProps) {
  // Calculate character age
  const characterAge = useMemo(() => {
    if (!createdAt) return null;

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '오늘 태어남';
    } else if (diffDays < 30) {
      return `${diffDays}일째`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}개월`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}살`;
    }
  }, [createdAt]);

  // Size styles
  const sizeStyles = {
    small: { width: 40, height: 40, fontSize: 20 },
    medium: { width: 50, height: 50, fontSize: 24 },
    large: { width: 60, height: 60, fontSize: 30 },
  };

  const avatarSize = sizeStyles[size];

  // Character emoji based on status
  const characterEmoji = status === 'sleeping' ? '😴' : '🤖';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize.width,
            height: avatarSize.height,
          },
        ]}
        testID="ai-character-avatar"
      >
        <Text style={{ fontSize: avatarSize.fontSize }}>{characterEmoji}</Text>

        {/* Typing Indicator */}
        {status === 'typing' && (
          <View style={styles.typingContainer} testID="typing-indicator">
            <Text style={styles.typingDots}>...</Text>
          </View>
        )}

        {/* Sleep Indicator */}
        {status === 'sleeping' && (
          <View style={styles.sleepContainer} testID="sleep-indicator">
            <Text style={styles.sleepText}>Zzz</Text>
          </View>
        )}
      </View>

      {/* Character Age */}
      {createdAt && (
        <View style={styles.ageContainer} testID="character-age">
          <Text style={styles.ageText}>{characterAge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    backgroundColor: '#F2F2F7',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    position: 'relative',
  },
  typingContainer: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typingDots: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sleepContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  sleepText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  ageContainer: {
    marginTop: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ageText: {
    fontSize: 11,
    color: '#3C3C43',
  },
});