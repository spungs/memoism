import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Image,
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

        {/* Display images if available */}
        {diary.images && diary.images.length > 0 && (
          <View style={styles.imagesContainer}>
            {diary.images.map((imageUrl, index) => (
              <Image
                key={index}
                source={{ uri: imageUrl }}
                style={styles.image}
                testID="diary-image"
              />
            ))}
          </View>
        )}

        {/* Display location if available */}
        {diary.location && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationTextContainer}>
              {diary.location.name && (
                <Text style={styles.locationName}>{diary.location.name}</Text>
              )}
              {diary.location.address && (
                <Text style={styles.locationAddress}>
                  {diary.location.address}
                </Text>
              )}
            </View>
          </View>
        )}
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
    marginBottom: 24,
  },
  imagesContainer: {
    marginTop: 8,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 17,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
