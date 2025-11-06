import React from 'react';
import { View, Text, Button, FlatList, SafeAreaView, TouchableOpacity, StyleSheet, Alert, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../utils/navigationRef';
import { useDiaries } from '../api/diaryApi';
import { useDiaryStore } from '../store/diaryStore';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryList'>;

export default function DiaryListScreen({ navigation }: Props) {
  const { data: diaries, isLoading, error, refetch } = useDiaries();
  const setDiaries = useDiaryStore((state) => state.setDiaries);
  const setToken = useAuthStore((state) => state.setToken);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (diaries) {
      setDiaries(diaries);
    }
  }, [diaries, setDiaries]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleLogout = async () => {
    try {
      setToken(null);
      setDiaries([]);
      // Navigation will automatically switch to AuthLogin when token is cleared
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading && !refreshing) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>오류: {error.message}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 일기</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.newDiaryButton}
            onPress={() => navigation.navigate('DiaryEdit', {})}
          >
            <Text style={styles.newDiaryButtonText}>+ 새 일기</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={diaries}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <View style={styles.diaryItem}>
              <TouchableOpacity 
                style={styles.diaryContent}
                onPress={() => navigation.navigate('DiaryDetail', { id: item.id })}
              >
                <Text style={styles.diaryText} numberOfLines={3}>
                  {item.content}
                </Text>
                
                {/* 이미지 미리보기 */}
                {item.images && item.images.length > 0 && (
                  <View style={styles.imagePreview}>
                    <Image 
                      source={{ uri: item.images[0] }} 
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    {item.images.length > 1 && (
                      <View style={styles.imageCountBadge}>
                        <Text style={styles.imageCountText}>+{item.images.length - 1}</Text>
                      </View>
                    )}
                  </View>
                )}
                
                <View style={styles.diaryInfo}>
                  <Text style={styles.diaryDate}>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>작성된 일기가 없습니다.</Text>
              <Text style={styles.emptySubText}>첫 번째 일기를 작성해보세요!</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  newDiaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newDiaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  diaryItem: {
    backgroundColor: '#fff',
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  diaryContent: {
    flex: 1,
    marginBottom: 12,
  },
  diaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
  },
  diaryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diaryDate: {
    fontSize: 12,
    color: '#999',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#ff0000',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  imagePreview: {
    position: 'relative',
    marginVertical: 8,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
