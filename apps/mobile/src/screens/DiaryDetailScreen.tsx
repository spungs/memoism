import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useDiaryDetail } from '../api/diaryApi';

interface DiaryDetailScreenProps {
  navigation: any;
  route: {
    params: {
      diaryId: string;
    };
  };
  token: string;
}

export default function DiaryDetailScreen({
  navigation,
  route,
  token,
}: DiaryDetailScreenProps) {
  const { diaryId } = route.params;
  const { data: diary, isLoading, isError } = useDiaryDetail(token, diaryId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !diary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>일기를 불러오는데 실패했습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {diary.title && <Text style={styles.title}>{diary.title}</Text>}
        <Text style={styles.date}>
          {new Date(diary.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <Text style={styles.contentText}>{diary.content}</Text>
      </ScrollView>
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  date: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
  },
  contentText: {
    fontSize: 17,
    color: '#000',
    lineHeight: 26,
  },
  errorText: {
    fontSize: 17,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
