import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useDiariesQuery } from '../api/diaryApi';
import LoadingScreen from '../components/LoadingScreen';
import ErrorScreen from '../components/ErrorScreen';
import EmptyState from '../components/EmptyState';
import { DiaryListScreenNavigationProp } from '../types/navigation';

interface DiaryListScreenProps {
  navigation: DiaryListScreenNavigationProp;
  token: string;
}

export default function DiaryListScreen({
  navigation,
  token,
}: DiaryListScreenProps) {
  const { data: diaries, isLoading, isError } = useDiariesQuery(token);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return <ErrorScreen message="일기를 불러오는데 실패했습니다" />;
  }

  // Empty state
  if (!diaries || diaries.length === 0) {
    return <EmptyState message="작성된 일기가 없습니다" />;
  }

  // List of diaries
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>일기 목록</Text>
        <FlatList
          data={diaries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('DiaryDetail', { diaryId: item.id })
              }
              testID="diary-item"
            >
              <View style={styles.diaryItem}>
                {item.title && (
                  <Text style={styles.diaryTitle}>{item.title}</Text>
                )}
                <Text style={styles.diaryContent}>{item.content}</Text>
                <Text style={styles.diaryDate}>
                  {new Date(item.created_at).toLocaleDateString('ko-KR')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#000',
  },
  listContent: {
    paddingBottom: 16,
  },
  diaryItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  diaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  diaryContent: {
    fontSize: 15,
    color: '#3C3C43',
    marginBottom: 8,
    lineHeight: 20,
  },
  diaryDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
});
