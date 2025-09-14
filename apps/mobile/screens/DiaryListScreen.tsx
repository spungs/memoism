import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Image, ScrollView, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../utils/navigationRef';
import { useDiaries, useUpdateDiary } from '../api/diaryApi';
import { useDiaryStore } from '../store/diaryStore';
import { useAuthStore } from '../store/authStore';
import { Diary } from '../api/diaryApi'; // Diary 타입을 가져옵니다.

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryList'>;

// 각 다이어리 항목을 렌더링하는 컴포넌트
const DiaryItem = ({ diary, navigation, onToggleShare }: { diary: Diary, navigation: Props['navigation'], onToggleShare: (id: string, status: boolean) => void }) => (
  <View style={styles.diaryCard}>
    <View style={styles.diaryHeader}>
      <Text style={styles.diaryDateLabel}>
        {new Date(diary.created_at).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </Text>
      <View style={styles.diaryActions}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('DiaryEdit', { id: diary.id })}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onToggleShare(diary.id, diary.is_public || false)}
          style={[styles.shareToggleButton, diary.is_public && styles.sharedButton]}
        >
          <Ionicons 
            name={diary.is_public ? "eye" : "eye-off"} 
            size={16} 
            color={diary.is_public ? "#34C759" : "#8E8E93"} 
          />
        </TouchableOpacity>
      </View>
    </View>
    
    <Text style={styles.diaryContent}>{diary.content}</Text>
    
    {diary.images && diary.images.length > 0 && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
        {diary.images.map((imageUri, index) => (
          <Image 
            key={index}
            source={{ uri: imageUri }} 
            style={styles.diaryImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
    )}
    
    {diary.is_public && (
      <View style={styles.publicIndicator}>
        <Ionicons name="globe-outline" size={14} color="#34C759" />
        <Text style={styles.publicText}>공유됨</Text>
      </View>
    )}
  </View>
);


export default function DiaryListScreen({ navigation }: Props) {
  const { data: diaries, isLoading, error } = useDiaries();
  const updateDiaryMutation = useUpdateDiary();
  const setDiaries = useDiaryStore((state) => state.setDiaries);
  const { logout, user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  React.useEffect(() => {
    if (diaries) {
      setDiaries(diaries);
    }
  }, [diaries, setDiaries]);

  const handleLogout = async () => {
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
              const savedId = await AsyncStorage.getItem('savedId');
              const currentUserEmail = user?.email;
              const shouldKeepSavedId = savedId === currentUserEmail;
              
              if (!shouldKeepSavedId) {
                await AsyncStorage.removeItem('savedId');
              }
              
              setDiaries([]);
              logout();
            } catch (error) {
              console.error('Failed to clear storage:', error);
              logout();
            }
          }
        }
      ]
    );
  };

  const toggleShareStatus = async (diaryId: string, currentStatus: boolean) => {
    const action = currentStatus ? '공유 해제' : '공유';
    Alert.alert(
      `일기 ${action}`,
      `정말 이 일기를 ${action}하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: action,
          onPress: async () => {
            try {
              await updateDiaryMutation.mutateAsync({
                id: diaryId,
                is_public: !currentStatus
              });
              Alert.alert('성공', `일기가 ${action}되었습니다.`);
            } catch (error) {
              Alert.alert('오류', `일기 ${action} 중 오류가 발생했습니다.`);
            }
          }
        }
      ]
    );
  };

  // 선택된 날짜의 일기 목록 필터링
  const getDiariesForSelectedDate = () => {
    if (!diaries) return [];
    const todayString = selectedDate.toDateString();
    return diaries.filter(diary => new Date(diary.created_at).toDateString() === todayString);
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const formatDate = (date: Date) => ({
    year: date.getFullYear().toString(),
    month: (date.getMonth() + 1).toString().padStart(2, '0'),
    day: date.getDate().toString().padStart(2, '0')
  });

  const dateInfo = formatDate(selectedDate);
  const diariesForDate = getDiariesForSelectedDate();

  if (isLoading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainFrame}>
        {/* 상단 영역 */}
        <View style={styles.topSection}>
          {/* 헤더 */}
          <View style={styles.headerFrame}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrapper}>
                <Ionicons name="document-text-outline" size={24} color="#007AFF" />
              </View>
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>새 항목</Text>
            </View>

            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('DiaryEdit', {})}
            >
              <View style={styles.addButtonWrapper}>
                <Text style={styles.addButtonText}>+</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 날짜 선택기 */}
          <View style={styles.dateFrame}>
            <TouchableOpacity onPress={() => changeDate('prev')}>
              <Ionicons name="chevron-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            
            <View style={styles.dateContainer}>
              <View style={styles.dateSection}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateText}>{dateInfo.year}</Text>
                </View>
              </View>

              <View style={styles.dateSection}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateText}>{dateInfo.month}</Text>
                </View>
              </View>

              <View style={styles.dateSection}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateText}>{dateInfo.day}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={() => changeDate('next')}>
              <Ionicons name="chevron-forward" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* 사용자 정보 */}
          <View style={styles.userFrame}>
            <View style={styles.userInfo}>
              <View style={styles.userContent}>
                <View style={styles.userAvatar}>
                  <Text style={styles.avatarText}>
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>

                <View style={styles.userDetails}>
                  <View style={styles.userNameContainer}>
                    <Text style={styles.userName}>{user?.username || '사용자'}</Text>
                  </View>
                  <View style={styles.userTimeContainer}>
                    <Text style={styles.userTime}>
                      {selectedDate.toLocaleDateString('ko-KR', { 
                        month: 'long', 
                        day: 'numeric' 
                      })}, {selectedDate.toLocaleDateString('ko-KR', { weekday: 'long' })}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 장식 구분선 */}
          <View style={styles.decorFrame1}>
            <View style={styles.decorInner}>
              <View style={styles.decorElement} />
            </View>
          </View>

          <View style={styles.decorFrame2}>
            <View style={styles.decorInner}>
              <View style={styles.decorElement} />
            </View>
          </View>
        </View>

        {/* 하단 영역 */}
        <View style={styles.bottomSection}>
          {/* 네비게이션 바 */}
          <View style={styles.navFrame}>
            <TouchableOpacity style={styles.navItem}>
              <View style={[styles.navIconWrapper, styles.activeNavItem]}>
                <Ionicons name="home" size={24} color="#007AFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => navigation.navigate('ShareFeed')}
            >
              <View style={styles.navIconWrapper}>
                <Ionicons name="people-outline" size={24} color="#8E8E93" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem}>
              <View style={styles.navIconWrapper}>
                <Ionicons name="search-outline" size={24} color="#8E8E93" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={styles.navIconWrapper}>
                <Ionicons name="settings-outline" size={24} color="#8E8E93" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
              <View style={styles.navIconWrapper}>
                <Ionicons name="log-out-outline" size={24} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          </View>

          {/* AI 캐릭터와 일기 목록 표시 영역 */}
          <View style={styles.contentFrame}>
            <FlatList
              data={diariesForDate}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <DiaryItem 
                  diary={item} 
                  navigation={navigation} 
                  onToggleShare={toggleShareStatus} 
                />
              )}
              ListHeaderComponent={
                <View style={styles.aiCharacterSection}>
                  <View style={styles.aiCharacter}>
                    <Ionicons name="sparkles" size={32} color="#FFD700" />
                  </View>
                  <Text style={styles.aiGreeting}>
                    {diariesForDate.length > 0
                      ? `${dateInfo.month}월 ${dateInfo.day}일의 일기 ${diariesForDate.length}개를 찾았어요!` 
                      : `${dateInfo.month}월 ${dateInfo.day}일에는 아직 일기가 없네요.`
                    }
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyDiarySection}>
                  <TouchableOpacity 
                    style={styles.createDiaryPrompt}
                    onPress={() => navigation.navigate('DiaryEdit', {})}
                  >
                    <Ionicons name="add-circle-outline" size={48} color="#007AFF" />
                    <Text style={styles.createDiaryText}>이날의 일기를 작성해보세요</Text>
                  </TouchableOpacity>
                </View>
              }
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              style={styles.diaryDisplaySection}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mainFrame: {
    flex: 1,
  },
  topSection: {
    backgroundColor: '#fff',
    paddingBottom: 16,
  },
  headerFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  addButtonWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
  },
  dateSection: {
    marginHorizontal: 8,
  },
  dateBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  userFrame: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    marginLeft: 12,
  },
  userNameContainer: {
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userTimeContainer: {
    marginTop: 2,
  },
  userTime: {
    fontSize: 12,
    color: '#666',
  },
  decorFrame1: {
    height: 1,
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  decorInner: {
    flex: 1,
  },
  decorElement: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E3F2FD',
  },
  decorFrame2: {
    height: 1,
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  navFrame: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navItem: {
    padding: 8,
  },
  navIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeNavItem: {
    backgroundColor: '#E3F2FD',
  },
  contentFrame: {
    flex: 1,
    paddingHorizontal: 16,
  },
  aiCharacterSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 16,
  },
  aiCharacter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF8DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiGreeting: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  diaryDisplaySection: {
    flex: 1,
  },
  diaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  diaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  diaryDateLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  diaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  shareToggleButton: {
    padding: 8,
  },
  sharedButton: {
    backgroundColor: '#E8F5E8',
    borderRadius: 4,
  },
  diaryContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  diaryImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  publicIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  publicText: {
    fontSize: 12,
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyDiarySection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  createDiaryPrompt: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E3F2FD',
    borderStyle: 'dashed',
  },
  createDiaryText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});