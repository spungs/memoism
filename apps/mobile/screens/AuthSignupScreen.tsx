import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useSignup } from '../api/authApi';

export default function AuthSignupScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const signup = useSignup();

  const handleSignup = async () => {
    if (!email.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return;
    }
    if (!username.trim()) {
      Alert.alert('입력 오류', '사용자명을 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('입력 오류', '비밀번호를 입력해주세요.');
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>회원가입</Text>
        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!signup.isPending}
          placeholderTextColor="#8E8E93"
        />
        <TextInput
          style={styles.input}
          placeholder="사용자명 (3-20자, 영문/숫자/_ 가능)"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!signup.isPending}
          placeholderTextColor="#8E8E93"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!signup.isPending}
          placeholderTextColor="#8E8E93"
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
          <Text style={[styles.link, signup.isPending && styles.linkDisabled]}>이미 계정이 있으신가요? 로그인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#000',
  },
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
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A9A9A9',
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 15,
  },
  linkDisabled: {
    color: '#A9A9A9',
  },
});