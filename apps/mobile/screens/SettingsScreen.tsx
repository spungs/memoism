import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Switch, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // 아이콘 사용을 위해 추가
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../utils/navigationRef';
import { useAuthStore } from '../store/authStore';
import { useUpdateProfile, useCurrentUser } from '../api/authApi';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../api/config';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { logout, user, setUser } = useAuthStore();
  const [pushNotifications, setPushNotifications] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const { data: currentUserData, isLoading: userLoading } = useCurrentUser();
  const updateProfileMutation = useUpdateProfile();

  // 현재 사용자 정보를 authStore에 업데이트
  useEffect(() => {
    if (currentUserData && (!user || user.username !== currentUserData.username)) {
      setUser({
        id: currentUserData.id,
        email: currentUserData.email,
        username: currentUserData.username,
      });
    }
  }, [currentUserData, user, setUser]);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const setting = await AsyncStorage.getItem('pushNotifications');
      setPushNotifications(setting === 'true');
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const savePushNotificationSetting = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('pushNotifications', value.toString());
      setPushNotifications(value);
      Alert.alert(
        '알림', 
        value ? '푸시 알림이 활성화되었습니다.' : '푸시 알림이 비활성화되었습니다.'
      );
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('오류', '설정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '로그아웃', 
          style: 'destructive',
          onPress: async () => {
            try {
              // 현재 사용자의 아이디 저장 설정을 확인
              const savedId = await AsyncStorage.getItem('savedId');
              const currentUserEmail = displayUser?.email;
              
              // 현재 로그인한 사용자의 이메일이 저장되어 있는지 확인
              const shouldKeepSavedId = savedId === currentUserEmail;
              
              // 아이디 저장이 되어있지 않거나 다른 사용자라면 저장된 아이디 제거
              if (!shouldKeepSavedId) {
                await AsyncStorage.removeItem('savedId');
              }
              // shouldKeepSavedId가 true라면 savedId는 그대로 유지
              
              await AsyncStorage.removeItem('pushNotifications');
              logout(); // This clears both token and user from the auth store
              // Navigation will automatically switch to AuthLogin when token is cleared
            } catch (error) {
              console.error('Failed to clear storage:', error);
              logout(); // Still logout even if storage clearing fails
            }
          }
        }
      ]
    );
  };

  const handleUsernameUpdate = async () => {
    if (!newUsername.trim()) {
      Alert.alert('오류', '닉네임을 입력해주세요.');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({ username: newUsername.trim() });
      
      // 업데이트 후 최신 사용자 정보를 다시 가져오기
      try {
        const userResponse = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().token}`,
          },
        });
        
        if (userResponse.ok) {
          const updatedUserData = await userResponse.json();
          setUser({
            id: updatedUserData.id,
            email: updatedUserData.email,
            username: updatedUserData.username,
          });
        }
      } catch (fetchError) {
        console.error('Failed to fetch updated user info:', fetchError);
        // 사용자 정보 가져오기가 실패해도 Alert는 표시
      }
      
      setShowUsernameModal(false);
      setNewUsername('');
      Alert.alert('성공', '닉네임이 변경되었습니다.');
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '닉네임 변경 중 오류가 발생했습니다.');
    }
  };

  // 현재 사용자 정보 (서버에서 가져온 최신 정보 우선)
  const displayUser = currentUserData || user;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={{ width: 24 }} />{/* 오른쪽 공간 확보 */}
      </View>
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>푸시 알림</Text>
              <Text style={styles.settingDescription}>
                일기 작성 리마인더 및 앱 업데이트 알림을 받습니다.
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={pushNotifications ? '#007AFF' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={savePushNotificationSetting}
              value={pushNotifications}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => {
              setNewUsername(displayUser?.username || '');
              setShowUsernameModal(true);
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>닉네임</Text>
              <Text style={styles.settingDescription}>
                현재 닉네임: {userLoading ? '로딩 중...' : (displayUser?.username || '설정되지 않음')}
              </Text>
            </View>
            <Text style={styles.expandIcon}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, styles.logoutText]}>로그아웃</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>버전</Text>
              <Text style={styles.settingDescription}>1.0.0</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 닉네임 변경 모달 */}
      <Modal
        visible={showUsernameModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>닉네임 변경</Text>
            <TextInput
              style={styles.textInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="새 닉네임을 입력하세요"
              autoFocus={true}
              maxLength={20}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowUsernameModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUsernameUpdate}
                disabled={updateProfileMutation.isPending}
              >
                <Text style={styles.saveButtonText}>
                  {updateProfileMutation.isPending ? '저장 중...' : '저장'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    // 뒤로가기 버튼 스타일
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  settingItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  logoutText: {
    color: '#ff3b30',
  },
  expandIcon: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default SettingsScreen;