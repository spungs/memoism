import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * 공통 주요 액션 버튼 컴포넌트
 *
 * LoginScreen과 SignupScreen에서 공통으로 사용하는 파란색 버튼 스타일을 캡슐화합니다.
 *
 * @param {string} title - 버튼 텍스트
 * @param {function} onPress - 클릭 핸들러
 * @param {boolean} disabled - 버튼 비활성화 여부 (기본값: false)
 * @param {string} testID - 테스트 ID
 */
export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  testID,
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
});
