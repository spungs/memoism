import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import Checkbox from 'expo-checkbox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLogin } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../api/config';

export default function AuthLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saveId, setSaveId] = useState(false);
  const login = useLogin();
  const { setToken, setUser } = useAuthStore();

  useEffect(() => {
    (async () => {
      const savedId = await AsyncStorage.getItem('savedId');
      if (savedId) {
        setEmail(savedId);
        setSaveId(true);
      }
    })();
  }, []);

  const handleSaveIdChange = async (value: boolean) => {
    setSaveId(value);
    if (value) {
      await AsyncStorage.setItem('savedId', email);
    } else {
      await AsyncStorage.removeItem('savedId');
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('입력 오류', '비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await login.mutateAsync({ email: email.trim(), password });
      setToken(response.access_token);
      
      try {
        const userResponse = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${response.access_token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser({
            id: userData.id,
            email: userData.email,
            username: userData.username,
          });
        }
      } catch (userError) {
        console.error('Failed to fetch user info:', userError);
      }
      
      if (saveId) {
        await AsyncStorage.setItem('savedId', email.trim());
      } else {
        await AsyncStorage.removeItem('savedId');
      }
      
      navigation.navigate('MainTabs');
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
          editable={!login.isPending}
          placeholderTextColor="#8E8E93"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!login.isPending}
          placeholderTextColor="#8E8E93"
        />
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkboxLabel}
            onPress={() => handleSaveIdChange(!saveId)}
            activeOpacity={0.7}
          >
            <Checkbox value={saveId} onValueChange={handleSaveIdChange} style={styles.checkbox} />
            <Text style={styles.label}>아이디 저장</Text>
          </TouchableOpacity>
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
          <Text style={[styles.link, login.isPending && styles.linkDisabled]}>계정이 없으신가요? 회원가입</Text>
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    color: '#000',
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