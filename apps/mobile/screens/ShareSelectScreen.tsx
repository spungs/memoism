import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../utils/navigationRef';
import { useDiaries, useUpdateDiary } from '../api/diaryApi';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<RootStackParamList, 'ShareSelect'>;

const ShareSelectScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { data: diaries, isLoading, error } = useDiaries(false); // private diaries
  const updateDiaryMutation = useUpdateDiary();
  const [selectedDiaries, setSelectedDiaries] = useState<string[]>([]);

  const toggleDiarySelection = (diaryId: string) => {
    setSelectedDiaries(prev => 
      prev.includes(diaryId) 
        ? prev.filter(id => id !== diaryId)
        : [...prev, diaryId]
    );
  };

  const handleShare = async () => {
    if (selectedDiaries.length === 0) {
      Alert.alert('알림', '공유할 일기를 선택해주세요.');
      return;
    }

    try {
      for (const diaryId of selectedDiaries) {
        await updateDiaryMutation.mutateAsync({
          id: diaryId,
          is_public: true
        });
      }
      Alert.alert('성공', `${selectedDiaries.length}개의 일기가 공유되었습니다.`, [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('오류', '일기 공유 중 오류가 발생했습니다.');
    }
  };

  const renderDiaryItem = ({ item }: { item: any }) => {
    const isSelected = selectedDiaries.includes(item.id);
    const isPublic = item.is_public;
    
    return (
      <TouchableOpacity 
        style={[styles.diaryItem, isSelected && styles.selectedItem]}
        onPress={() => !isPublic && toggleDiarySelection(item.id)}
        disabled={isPublic}
      >
        <View style={styles.diaryHeader}>
          <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.diaryInfo}>
            <Text style={styles.diaryDate}>
              {new Date(item.created_at).toLocaleDateString('ko-KR')}
            </Text>
            {isPublic && (
              <Text style={styles.publicLabel}>이미 공유됨</Text>
            )}
          </View>
        </View>
        <Text style={styles.diaryContent} numberOfLines={3}>
          {item.content}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>오류가 발생했습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공유할 일기 선택</Text>
        <TouchableOpacity 
          onPress={handleShare} 
          disabled={selectedDiaries.length === 0}
          style={[styles.shareButton, selectedDiaries.length === 0 && styles.disabledButton]}
        >
          <Text style={[styles.shareButtonText, selectedDiaries.length === 0 && styles.disabledText]}>
            공유 ({selectedDiaries.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={diaries}
        renderItem={renderDiaryItem}
        keyExtractor={(item) => item.id}
        style={styles.diaryList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>작성된 일기가 없습니다.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledText: {
    color: '#999',
  },
  diaryList: {
    flex: 1,
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
  selectedItem: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  diaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  diaryInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diaryDate: {
    fontSize: 14,
    color: '#666',
  },
  publicLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  diaryContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#ff0000',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ShareSelectScreen; 