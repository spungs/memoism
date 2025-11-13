import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useDiariesQuery } from '../api/diaryApi';

interface MapScreenProps {
  navigation: any;
  token: string;
}

export default function MapScreen({ navigation, token }: MapScreenProps) {
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
          <Text style={styles.errorText}>지도를 불러오는데 실패했습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title} testID="screen-title">지도</Text>
        <View style={styles.mapContainer} testID="map-view">
          <Text style={styles.placeholderText}>지도가 여기에 표시됩니다</Text>
        </View>
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
  mapContainer: {
    flex: 1,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
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
