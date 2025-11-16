import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

interface EmptyStateProps {
  message: string;
  testID?: string;
}

/**
 * 공통 빈 상태 컴포넌트
 *
 * 데이터가 없을 때 표시되는 전체 화면 빈 상태 메시지입니다.
 *
 * @param {string} message - 빈 상태 메시지
 * @param {string} testID - 테스트 ID
 */
export default function EmptyState({ message, testID }: EmptyStateProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <Text style={styles.emptyText} testID={testID || 'empty-text'}>
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
