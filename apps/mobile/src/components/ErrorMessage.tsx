import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface ErrorMessageProps {
  message: string;
  variant?: 'field' | 'server';
  testID?: string;
}

/**
 * 공통 에러 메시지 컴포넌트
 *
 * LoginScreen과 SignupScreen에서 공통으로 사용하는 에러 메시지 스타일을 캡슐화합니다.
 *
 * @param {string} message - 에러 메시지 텍스트
 * @param {string} variant - 에러 메시지 유형 ('field' | 'server', 기본값: 'field')
 *                           - 'field': 필드별 유효성 검증 에러 (작고 간단한 텍스트)
 *                           - 'server': 서버 에러 메시지 (배경이 있는 박스)
 * @param {string} testID - 테스트 ID
 */
export default function ErrorMessage({
  message,
  variant = 'field',
  testID,
}: ErrorMessageProps) {
  if (!message) return null;

  return (
    <Text
      style={variant === 'field' ? styles.fieldError : styles.serverError}
      testID={testID}
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  fieldError: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  serverError: {
    color: '#FF3B30',
    fontSize: 15,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    textAlign: 'center',
  },
});
