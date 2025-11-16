import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDiaryDetail, useUpdateDiary } from '../api/diaryApi';
import { ERROR_MESSAGES } from '../constants/errorMessages';

interface DiaryEditScreenProps {
  navigation: any;
  route: {
    params: {
      diaryId: string;
    };
  };
  token: string;
}

export default function DiaryEditScreen({
  navigation,
  route,
  token,
}: DiaryEditScreenProps) {
  const { diaryId } = route.params;
  const { data: diary, isLoading, isError } = useDiaryDetail(token, diaryId);
  const updateDiaryMutation = useUpdateDiary(token);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Load existing data into form when diary is fetched
  useEffect(() => {
    if (diary) {
      setTitle(diary.title || '');
      setContent(diary.content);
      setSelectedImages(diary.images || []);
    }
  }, [diary]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newImageUri = result.assets[0].uri;
      setSelectedImages([...selectedImages, newImageUri]);
    }
  };

  const handleSave = async () => {
    try {
      await updateDiaryMutation.mutateAsync({
        id: diaryId,
        title,
        content,
        images: selectedImages,
      });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update diary:', error);
    }
  };

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
          <Text style={styles.errorText}>{ERROR_MESSAGES.DIARY_FETCH_ERROR}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <TextInput
          style={styles.titleInput}
          placeholder="제목"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.contentInput}
          placeholder="내용"
          value={content}
          onChangeText={setContent}
          multiline
        />

        {/* Image picker button */}
        <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
          <Text style={styles.addImageButtonText}>이미지 추가</Text>
        </TouchableOpacity>

        {/* Display selected images */}
        {selectedImages.length > 0 && (
          <View style={styles.imagesContainer}>
            {selectedImages.map((imageUri, index) => (
              <Image
                key={index}
                source={{ uri: imageUri }}
                style={styles.image}
                testID="selected-image"
              />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>저장</Text>
        </TouchableOpacity>
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
  titleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  contentInput: {
    fontSize: 17,
    color: '#000',
    lineHeight: 26,
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 200,
    textAlignVertical: 'top',
  },
  addImageButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  addImageButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  imagesContainer: {
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 17,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
