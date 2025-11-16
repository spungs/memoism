import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useLogin } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { validateEmail as validateEmailUtil, validatePassword as validatePasswordUtil } from '../utils/validation';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import ErrorMessage from '../components/ErrorMessage';

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
        <FormInput
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <ErrorMessage message={emailError} />
        <FormInput
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <ErrorMessage message={passwordError} />
        <ErrorMessage message={serverError} variant="server" />
        <PrimaryButton title="로그인" onPress={handleSubmit} />
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
  link: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 15,
  },
});
