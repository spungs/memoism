import React from 'react';
import { View, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';

interface LoadingScreenProps {
  testID?: string;
}

/**
 * 공통 로딩 화면 컴포넌트
 *
 * 데이터를 불러오는 동안 표시되는 전체 화면 로딩 인디케이터입니다.
 *
 * @param {string} testID - 테스트 ID
 */
export default function LoadingScreen({ testID }: LoadingScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color="#007AFF"
          testID={testID || 'loading-indicator'}
        />
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
});
