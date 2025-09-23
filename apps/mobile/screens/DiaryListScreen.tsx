import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Image, ScrollView, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../utils/navigationRef';
import { useDiaries, useDeleteDiary } from '../api/diaryApi';
import { useDiaryStore } from '../store/diaryStore';
import { useAuthStore } from '../store/authStore';
import { Diary } from '../api/diaryApi'; // Diary 타입을 가져옵니다.
import { parseApiDate, isSameLocalDay } from '../utils/date';
import CalendarModal from '../components/CalendarModal';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryList'>;

// 각 다이어리 항목을 렌더링하는 컴포넌트
const DiaryItem = ({ diary, navigation, onDelete }: { diary: Diary, navigation: Props['navigation'], onDelete: (id: string) => void }) => (
  <TouchableOpacity onPress={() => navigation.navigate('DiaryDetail', { id: diary.id })} style={styles.diaryCard}>
    <View style={styles.diaryHeader}>
      <Text style={styles.diaryDateLabel}>
        {(() => {
          const d = parseApiDate(diary.created_at);
          return isNaN(d.getTime())
            ? '-'
            : d.toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
        })()}
      </Text>
      <TouchableOpacity onPress={() => onDelete(diary.id)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
    
    <Text style={styles.diaryContent} numberOfLines={3}>{diary.content}</Text>
    
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
  </TouchableOpacity>
);


export default function DiaryListScreen({ navigation }: Props) {
  const { data: diaries, isLoading, error } = useDiaries();
  const setDiaries = useDiaryStore((state) => state.setDiaries);
  const { logout, user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const deleteDiary = useDeleteDiary();

  React.useEffect(() => {
    if (diaries) {
      setDiaries(diaries);
    }
  }, [diaries, setDiaries]);

  const handleDelete = (id: string) => {
    Alert.alert(
      '일기 삭제',
      '정말 이 일기를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDiary.mutateAsync(id);
              Alert.alert('삭제 완료', '일기가 삭제되었습니다.');
            } catch (e) {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

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

  // 선택된 날짜의 일기 목록 필터링
  const getDiariesForSelectedDate = () => {
    if (!diaries) return [];
    return diaries.filter((diary) => {
      const d = parseApiDate(diary.created_at);
      return !isNaN(d.getTime()) && isSameLocalDay(d, selectedDate);
    });
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

  const resetToToday = () => {
    setSelectedDate(new Date());
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>일기</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => Alert.alert('알림', '샵 기능은 곧 준비될 예정입니다!')} style={styles.iconButton}>
            <Ionicons name="grid-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate('prev')}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCalendarVisible(true)}>
          <Text style={styles.dateText}>{`${dateInfo.year}년 ${dateInfo.month}월 ${dateInfo.day}일`}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={resetToToday} style={{ marginRight: 8 }}>
            <Ionicons name="refresh" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeDate('next')}>
            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={diariesForDate}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DiaryItem 
            diary={item} 
            navigation={navigation} 
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyDiarySection}>
            <Ionicons name="journal-outline" size={48} color="#ccc" />
            <Text style={styles.emptyDiaryText}>이날의 일기가 없습니다.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        style={styles.diaryList}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('DiaryEdit', {})}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <CalendarModal
        visible={calendarVisible}
        initialDate={selectedDate}
        onClose={() => setCalendarVisible(false)}
        onSelect={(d) => setSelectedDate(d)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
  },
  dateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  diaryList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  diaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  diaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  diaryDateLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  diaryContent: {
    fontSize: 17,
    lineHeight: 22,
    color: '#000',
    marginBottom: 12,
  },
  imagesContainer: {
    marginTop: 8,
  },
  diaryImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  emptyDiarySection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyDiaryText: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 16,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
