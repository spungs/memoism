import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useSignup } from '../api/authApi';
import {
  validateEmail as validateEmailUtil,
  validatePassword as validatePasswordUtil,
  validateUsername as validateUsernameUtil,
} from '../utils/validation';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import ErrorMessage from '../components/ErrorMessage';

interface SignupScreenProps {
  navigation: any;
}

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');

  const signupMutation = useSignup();

  const handleSubmit = () => {
    const emailResult = validateEmailUtil(email);
    const usernameResult = validateUsernameUtil(username);
    const passwordResult = validatePasswordUtil(password);

    setEmailError(emailResult.errorMessage);
    setUsernameError(usernameResult.errorMessage);
    setPasswordError(passwordResult.errorMessage);

    const isEmailValid = emailResult.isValid;
    const isUsernameValid = usernameResult.isValid;
    const isPasswordValid = passwordResult.isValid;

    if (isEmailValid && isUsernameValid && isPasswordValid) {
      setServerError('');
      signupMutation.mutate(
        { email, username, password },
        {
          onSuccess: () => {
            // Navigate to login screen after successful signup
            navigation.navigate('AuthLogin');
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
        <Text style={styles.title}>회원가입</Text>
        <FormInput
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <ErrorMessage message={emailError} />
        <FormInput
          placeholder="사용자명"
          value={username}
          onChangeText={setUsername}
        />
        <ErrorMessage message={usernameError} />
        <FormInput
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <ErrorMessage message={passwordError} />
        <ErrorMessage message={serverError} variant="server" />
        <PrimaryButton title="회원가입" onPress={handleSubmit} />
        <TouchableOpacity onPress={() => navigation.navigate('AuthLogin')}>
          <Text style={styles.link}>이미 계정이 있으신가요? 로그인</Text>
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
