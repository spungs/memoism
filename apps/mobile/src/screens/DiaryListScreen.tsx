import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useDiariesQuery } from '../api/diaryApi';

interface DiaryListScreenProps {
  navigation: any;
  token: string;
}

export default function DiaryListScreen({
  navigation,
  token,
}: DiaryListScreenProps) {
  const { data: diaries, isLoading, isError } = useDiariesQuery(token);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>일기를 불러오는데 실패했습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!diaries || diaries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>작성된 일기가 없습니다</Text>
        </View>
      </SafeAreaView>
    );
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
            <View style={styles.diaryItem} testID="diary-item">
              {item.title && (
                <Text style={styles.diaryTitle}>{item.title}</Text>
              )}
              <Text style={styles.diaryContent}>{item.content}</Text>
              <Text style={styles.diaryDate}>
                {new Date(item.created_at).toLocaleDateString('ko-KR')}
              </Text>
            </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 17,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
