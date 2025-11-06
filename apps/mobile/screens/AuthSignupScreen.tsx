import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSignup } from '../api/authApi';

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

export default function AuthSignupScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const signup = useSignup();

  const handleSignup = async () => {
    // 기본 유효성 검사
    if (!email.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert('입력 오류', '올바른 이메일 형식을 입력해주세요.');
      return;
    }
    if (!username.trim()) {
      Alert.alert('입력 오류', '사용자명을 입력해주세요.');
      return;
    }
    if (!validateUsername(username.trim())) {
      Alert.alert('입력 오류', '사용자명은 3-20자의 영문, 숫자, 밑줄(_)만 사용 가능합니다.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('입력 오류', '비밀번호를 입력해주세요.');
      return;
    }
    if (!validatePassword(password)) {
      Alert.alert('입력 오류', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    try {
      await signup.mutateAsync({ 
        email: email.trim(), 
        username: username.trim(), 
        password 
      });
      
      Alert.alert(
        '회원가입 성공', 
        '회원가입이 완료되었습니다. 로그인해주세요.',
        [{ text: '확인', onPress: () => navigation.replace('AuthLogin') }]
      );
    } catch (error) {
      console.error('Signup error:', error);
      if (error instanceof Error) {
        Alert.alert('회원가입 실패', error.message);
      } else {
        Alert.alert('회원가입 실패', '알 수 없는 오류가 발생했습니다.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!signup.isPending}
      />
      <TextInput
        style={styles.input}
        placeholder="사용자명 (3-20자, 영문/숫자/_ 가능)"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        editable={!signup.isPending}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 (8자 이상)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!signup.isPending}
      />
      <TouchableOpacity 
        style={[styles.button, signup.isPending && styles.buttonDisabled]} 
        onPress={handleSignup}
        disabled={signup.isPending}
      >
        {signup.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>회원가입</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => navigation.navigate('AuthLogin')}
        disabled={signup.isPending}
      >
        <Text style={[styles.link, signup.isPending && styles.linkDisabled]}>로그인</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
  },
  linkDisabled: {
    color: '#ccc',
  },
}); 