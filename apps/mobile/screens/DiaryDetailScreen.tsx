import React from 'react';
import { 
  View, 
  Text, 
  Alert, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  Image,
  StyleSheet,
  Dimensions
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../utils/navigationRef';
import { useDiary, useDeleteDiary } from '../api/diaryApi';
import { Ionicons } from '@expo/vector-icons';
import { parseApiDate } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryDetail'>;

const { width } = Dimensions.get('window');

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>일기</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    </SafeAreaView>
  );
  
  if (error || !diary) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오류</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>일기를 불러오지 못했습니다.</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {(() => {
            const d = parseApiDate(diary.created_at);
            return isNaN(d.getTime())
              ? '일기'
              : d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
          })()}
        </Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => navigation.navigate('DiaryEdit', { id })} style={{ marginRight: 16 }}>
            <Ionicons name="create-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.diaryContent}>{diary.content}</Text>

        {diary.location && diary.location.images && diary.location.images.length > 0 && (
          <TouchableOpacity 
            style={styles.locationContainer}
            onPress={() => {
              const valid = diary.location.images.filter(
                (loc: any) =>
                  loc &&
                  typeof loc.latitude === 'number' &&
                  typeof loc.longitude === 'number' &&
                  isFinite(loc.latitude) &&
                  isFinite(loc.longitude) &&
                  Math.abs(loc.latitude) > 1e-6 &&
                  Math.abs(loc.longitude) > 1e-6
              );
              if (valid.length === 0) {
                Alert.alert('위치 정보 없음', '선택한 사진에 유효한 위치 정보가 없습니다.');
                return;
              }
              navigation.navigate('Map', { locations: valid });
            }} // MapScreen으로 이동
          >
            <Ionicons name="location-outline" size={20} color="#555" />
            <Text style={styles.locationText}>
              이 일기에는 위치 정보가 있는 사진이 {
                diary.location.images.filter(
                  (loc: any) =>
                    loc &&
                    typeof loc.latitude === 'number' &&
                    typeof loc.longitude === 'number' &&
                    isFinite(loc.latitude) &&
                    isFinite(loc.longitude) &&
                    Math.abs(loc.latitude) > 1e-6 &&
                    Math.abs(loc.longitude) > 1e-6
                ).length
              }장 포함되어 있습니다.
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#555" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}
        
        {diary.images && diary.images.length > 0 && (
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
        )}
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
    borderColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  diaryContent: {
    fontSize: 17,
    lineHeight: 25,
    color: '#000',
    marginBottom: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#555',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  image: {
    width: (width - 56) / 2,
    height: (width - 56) / 2,
    borderRadius: 8,
    marginBottom: 8,
    marginRight: 8,
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
  errorText: {
    fontSize: 16,
    color: '#ff0000',
  },
});
