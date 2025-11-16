import React from 'react';
import { TextInput, StyleSheet, TextInputProps, KeyboardTypeOptions } from 'react-native';

interface FormInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  testID?: string;
}

/**
 * 공통 폼 입력 컴포넌트
 *
 * LoginScreen과 SignupScreen에서 공통으로 사용하는 TextInput 스타일을 캡슐화합니다.
 *
 * @param {string} placeholder - 입력 필드 플레이스홀더
 * @param {string} value - 입력 값
 * @param {function} onChangeText - 값 변경 핸들러
 * @param {boolean} secureTextEntry - 비밀번호 입력 여부 (기본값: false)
 * @param {string} autoCapitalize - 자동 대문자화 설정 (기본값: 'none')
 * @param {string} keyboardType - 키보드 타입 (기본값: 'default')
 * @param {string} testID - 테스트 ID
 */
export default function FormInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  testID,
}: FormInputProps) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
});
