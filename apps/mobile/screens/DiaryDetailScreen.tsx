import React from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../utils/navigationRef';
import { useDiary, useDeleteDiary } from '../api/diaryApi';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryDetail'>;

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 2; // 2개씩 한 줄에 배치

export default function DiaryDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { data: diary, isLoading, error } = useDiary(id);
  const deleteDiary = useDeleteDiary();

  const handleDelete = async () => {
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
              navigation.goBack();
            } catch (e) {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  if (isLoading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    </SafeAreaView>
  );
  
  if (error || !diary) return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.errorText}>일기를 불러오지 못했습니다.</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>일기 상세</Text>
        <TouchableOpacity onPress={() => navigation.navigate('DiaryEdit', { id })} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 일기 내용 */}
        <Text style={styles.diaryContent}>{diary.content}</Text>
        
        {/* 이미지 표시 */}
        {diary.images && diary.images.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.imageSectionTitle}>첨부된 사진 ({diary.images.length}장)</Text>
            <View style={styles.imageGrid}>
              {diary.images.map((imageUri, index) => (
                <Image 
                  key={index}
                  source={{ uri: imageUri }} 
                  style={styles.image}
                  resizeMode="cover"
                />
              ))}
            </View>
          </View>
        )}

        {/* 일기 정보 */}
        <View style={styles.infoSection}>
          <Text style={styles.dateText}>
            작성일: {new Date(diary.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </Text>
          {diary.is_public && (
            <View style={styles.publicBadge}>
              <Ionicons name="globe-outline" size={16} color="#007AFF" />
              <Text style={styles.publicText}>공개됨</Text>
            </View>
          )}
        </View>

        {/* 액션 버튼들 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButtonLarge}
            onPress={() => navigation.navigate('DiaryEdit', { id })}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editButtonText}>수정</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  diaryContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 24,
  },
  imageSection: {
    marginBottom: 24,
  },
  imageSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  image: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publicText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  editButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#ff0000',
  },
});
