import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Checkbox from 'expo-checkbox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLogin, useCurrentUser } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../api/config';
import type { LoginData, AuthResponse } from '../api/authApi';

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function AuthLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saveId, setSaveId] = useState(false);
  // const [autoLogin, setAutoLogin] = useState(false);
  const login = useLogin();
  const { setToken, setUser } = useAuthStore();

  // 앱 시작 시 저장된 값 불러오기
  useEffect(() => {
    (async () => {
      const savedId = await AsyncStorage.getItem('savedId');
      // const savedAutoLogin = await AsyncStorage.getItem('autoLogin');
      // const savedToken = await AsyncStorage.getItem('autoLoginToken');
      // const savedTimestamp = await AsyncStorage.getItem('autoLoginTimestamp');
      if (savedId) {
        setEmail(savedId);
        setSaveId(true);
      }
      // if (savedAutoLogin === 'true' && savedToken && savedTimestamp) {
      //   const now = Date.now();
      //   const diff = now - parseInt(savedTimestamp, 10);
      //   if (diff < 1000) {
      //     setAutoLogin(true);
      //     setToken(savedToken);
      //     navigation.replace('MainTabs');
      //   } else {
      //     await AsyncStorage.removeItem('autoLoginToken');
      //     await AsyncStorage.removeItem('autoLoginTimestamp');
      //     await AsyncStorage.removeItem('autoLogin');
      //     setToken(null);
      //   }
      // }
    })();
  }, []);

  // 체크박스 상태 변경 시 즉시 저장/삭제
  const handleSaveIdChange = async (value: boolean) => {
    setSaveId(value);
    if (value) {
      await AsyncStorage.setItem('savedId', email);
    } else {
      await AsyncStorage.removeItem('savedId');
    }
  };

  // const handleAutoLoginChange = async (value: boolean) => {
  //   setAutoLogin(value);
  //   if (value) {
  //     await AsyncStorage.setItem('autoLogin', 'true');
  //   } else {
  //     await AsyncStorage.removeItem('autoLogin');
  //     await AsyncStorage.removeItem('autoLoginToken');
  //     await AsyncStorage.removeItem('autoLoginTimestamp');
  //   }
  // };

  const handleLogin = async () => {
    // 기본 유효성 검사
    if (!email.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert('입력 오류', '올바른 이메일 형식을 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('입력 오류', '비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await login.mutateAsync({ email: email.trim(), password });
      setToken(response.access_token);

      // 사용자 정보 가져오기
      try {
        const userResponse = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${response.access_token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user info');
        }

        const userData = await userResponse.json();
        setUser({
          id: userData.id,
          email: userData.email,
          username: userData.username,
        });
      } catch (userError) {
        console.error('Failed to fetch user info:', userError);
        Alert.alert('경고', '사용자 정보를 불러오는데 실패했습니다.');
      }

      // 아이디 저장 체크박스가 체크되어 있으면 항상 현재 이메일로 저장
      if (saveId) {
        await AsyncStorage.setItem('savedId', email.trim());
      } else {
        await AsyncStorage.removeItem('savedId');
      }

      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        Alert.alert('로그인 실패', error.message);
      } else {
        Alert.alert('로그인 실패', '알 수 없는 오류가 발생했습니다.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>로그인</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        editable={!login.isPending}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!login.isPending}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}
          onPress={() => handleSaveIdChange(!saveId)}
          activeOpacity={0.7}
        >
          <Checkbox value={saveId} onValueChange={handleSaveIdChange} style={{ marginRight: 4 }} />
          <Text>아이디 저장</Text>
        </TouchableOpacity>
        {/*
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => handleAutoLoginChange(!autoLogin)}
          activeOpacity={0.7}
        >
          <Checkbox value={autoLogin} onValueChange={handleAutoLoginChange} style={{ marginRight: 4 }} />
          <Text>자동로그인</Text>
        </TouchableOpacity>
        */}
      </View>
      <TouchableOpacity 
        style={[styles.button, login.isPending && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={login.isPending}
      >
        {login.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>로그인</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => navigation.navigate('AuthSignup')}
        disabled={login.isPending}
      >
        <Text style={[styles.link, login.isPending && styles.linkDisabled]}>회원가입</Text>
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