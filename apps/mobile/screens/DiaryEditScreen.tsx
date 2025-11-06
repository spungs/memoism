import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../utils/navigationRef';
import { useCreateDiary, useUpdateDiary, useDiary } from '../api/diaryApi';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryEdit'>;

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 3; // 3개씩 한 줄에 배치

export default function DiaryEditScreen({ navigation, route }: Props) {
  const diaryId = route.params?.id;
  const isEdit = !!diaryId;
  const { data: diary } = useDiary(diaryId || '', { enabled: !!diaryId });
  const [content, setContent] = useState(diary?.content || '');
  const [images, setImages] = useState<string[]>(diary?.images || []);
  const [hasChanges, setHasChanges] = useState(false);
  const createDiary = useCreateDiary();
  const updateDiary = useUpdateDiary();

  React.useEffect(() => {
    if (isEdit && diary) {
      setContent(diary.content);
      setImages(diary.images || []);
    }
  }, [diary, isEdit]);

  // Track changes for unsaved warning
  React.useEffect(() => {
    if (isEdit && diary) {
      const contentChanged = content !== diary.content;
      const imagesChanged = JSON.stringify(images) !== JSON.stringify(diary.images || []);
      setHasChanges(contentChanged || imagesChanged);
    } else {
      setHasChanges(content.trim().length > 0 || images.length > 0);
    }
  }, [content, images, diary, isEdit]);

  const pickImage = async () => {
    if (images.length >= 10) {
      Alert.alert('알림', '최대 10장까지만 첨부할 수 있습니다.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '권한 필요',
        '사진을 선택하기 위해 갤러리 접근 권한이 필요합니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '설정으로 이동',
            onPress: () => Linking.openSettings()
          }
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const newImages = [...images, result.assets[0].uri];
      setImages(newImages);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleGoBack = () => {
    if (hasChanges) {
      Alert.alert(
        '저장하지 않은 변경사항',
        '작성 중인 내용이 있습니다. 저장하지 않고 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '나가기',
            style: 'destructive',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '일기 내용을 입력해주세요.');
      return;
    }

    try {
      if (isEdit && diaryId) {
        await updateDiary.mutateAsync({ 
          id: diaryId, 
          content, 
          images: images.length > 0 ? images : undefined 
        });
        Alert.alert('수정 완료', '일기가 수정되었습니다.');
      } else {
        await createDiary.mutateAsync({ 
          content, 
          images: images.length > 0 ? images : undefined 
        });
        Alert.alert('작성 완료', '새 일기가 작성되었습니다.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? '일기 수정' : '새 일기 작성'}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.saveButton,
            (createDiary.isPending || updateDiary.isPending) && styles.saveButtonDisabled
          ]}
          disabled={createDiary.isPending || updateDiary.isPending}
        >
          {createDiary.isPending || updateDiary.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 텍스트 입력 */}
        <TextInput
          style={styles.textInput}
          multiline
          value={content}
          onChangeText={setContent}
          placeholder="오늘의 일기를 입력하세요..."
          textAlignVertical="top"
        />

        {/* 이미지 섹션 */}
        <View style={styles.imageSection}>
          <View style={styles.imageSectionHeader}>
            <Text style={styles.imageSectionTitle}>사진 ({images.length}/10)</Text>
            <TouchableOpacity onPress={pickImage} style={styles.addImageButton}>
              <Ionicons name="camera" size={20} color="#007AFF" />
              <Text style={styles.addImageText}>사진 추가</Text>
            </TouchableOpacity>
          </View>

          {/* 이미지 그리드 */}
          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((imageUri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.image} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    minHeight: 200,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addImageText: {
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  image: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
});
