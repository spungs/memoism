import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useLogin } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { validateEmail as validateEmailUtil, validatePassword as validatePasswordUtil } from '../utils/validation';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');

  const { setToken, setUser } = useAuthStore();
  const loginMutation = useLogin();

  const handleSubmit = () => {
    const emailResult = validateEmailUtil(email);
    const passwordResult = validatePasswordUtil(password);

    setEmailError(emailResult.errorMessage);
    setPasswordError(passwordResult.errorMessage);

    const isEmailValid = emailResult.isValid;
    const isPasswordValid = passwordResult.isValid;

    if (isEmailValid && isPasswordValid) {
      setServerError('');
      loginMutation.mutate(
        { email, password },
        {
          onSuccess: (data) => {
            setToken(data.access_token);
            setUser(data.user);
          },
          onError: (error) => {
            setServerError(error.message);
          },
        }
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>로그인</Text>
        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        {serverError ? <Text style={styles.serverErrorText}>{serverError}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('AuthSignup')}>
          <Text style={styles.link}>계정이 없으신가요? 회원가입</Text>
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
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
  serverErrorText: {
    color: '#FF3B30',
    fontSize: 15,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    textAlign: 'center',
  },
});
