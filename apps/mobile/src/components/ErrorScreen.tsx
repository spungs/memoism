import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

interface ErrorScreenProps {
  message: string;
  testID?: string;
}

/**
 * 공통 에러 화면 컴포넌트
 *
 * 데이터를 불러오는 중 에러가 발생했을 때 표시되는 전체 화면 에러 메시지입니다.
 *
 * @param {string} message - 에러 메시지
 * @param {string} testID - 테스트 ID
 */
export default function ErrorScreen({ message, testID }: ErrorScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <Text style={styles.errorText} testID={testID || 'error-text'}>
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
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
});
