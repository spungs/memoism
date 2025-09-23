import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Alert, 
  SafeAreaView, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Image,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../utils/navigationRef';
import { useCreateDiary, useUpdateDiary, useDiary } from '../api/diaryApi';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryEdit'>;

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 4;

export default function DiaryEditScreen({ navigation, route }: Props) {
  const diaryId = route.params?.id;
  const isEdit = !!diaryId;
  const { data: diary } = useDiary(diaryId || '');
  const [content, setContent] = useState(diary?.content || '');
  const [images, setImages] = useState<string[]>(diary?.images || []);
  const [locations, setLocations] = useState<any[]>(diary?.location ? diary.location.images : []);
  const createDiary = useCreateDiary();
  const updateDiary = useUpdateDiary();

  React.useEffect(() => {
    if (isEdit && diary) {
      setContent(diary.content);
      setImages(diary.images || []);
      if (diary.location && Array.isArray(diary.location.images)) {
        setLocations(diary.location.images);
      }
    }
  }, [diary, isEdit]);

  const parseRational = (s: string): number => {
    // handles '123/100' or '12'
    if (typeof s !== 'string') return Number(s);
    const [a, b] = s.split('/');
    const num = parseFloat(a);
    const den = b ? parseFloat(b) : 1;
    if (!isFinite(num) || !isFinite(den) || den === 0) return NaN;
    return num / den;
  };

  const dmsToDecimal = (val: any, ref?: string): number => {
    try {
      let d = 0, m = 0, s = 0;
      if (Array.isArray(val)) {
        [d, m, s] = val.map((x) => (typeof x === 'string' ? parseRational(x) : Number(x)));
      } else if (typeof val === 'string') {
        const parts = val.split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          d = parseRational(parts[0]);
          m = parseRational(parts[1]);
          s = parseRational(parts[2]);
        } else {
          const num = parseFloat(val);
          if (isFinite(num)) return num;
        }
      } else if (typeof val === 'number') {
        return val;
      }
      let dec = d + m / 60 + s / 3600;
      if (ref && (ref === 'S' || ref === 'W')) dec = -dec;
      return dec;
    } catch {
      return NaN;
    }
  };

  const extractGpsFromExif = (exif: any): { latitude?: number; longitude?: number } => {
    if (!exif) return {};
    // Possible keys across platforms
    const latKeys = ['GPSLatitude', 'gpsLatitude', '{GPS}.Latitude'];
    const lonKeys = ['GPSLongitude', 'gpsLongitude', '{GPS}.Longitude'];
    const latRef = exif.GPSLatitudeRef || exif.gpsLatitudeRef;
    const lonRef = exif.GPSLongitudeRef || exif.gpsLongitudeRef;

    let lat: number | undefined;
    let lon: number | undefined;

    for (const k of latKeys) {
      if (exif[k] !== undefined) {
        const v = dmsToDecimal(exif[k], latRef);
        if (isFinite(v)) {
          lat = v;
          break;
        }
      }
    }
    for (const k of lonKeys) {
      if (exif[k] !== undefined) {
        const v = dmsToDecimal(exif[k], lonRef);
        if (isFinite(v)) {
          lon = v;
          break;
        }
      }
    }

    // Some devices embed as numeric strings without refs; try sign from alternative refs
    if (lat === undefined && typeof exif.GPSLatitude === 'number') lat = exif.GPSLatitude;
    if (lon === undefined && typeof exif.GPSLongitude === 'number') lon = exif.GPSLongitude;

    return { latitude: lat, longitude: lon };
  };

  const fetchGpsFromMediaLibrary = async (assetId?: string) => {
    try {
      if (!assetId) return {} as { latitude?: number; longitude?: number };
      // Dynamically import to avoid crashes in environments without the native module (e.g., Expo Go mismatch)
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      const MediaLibrary = await import('expo-media-library');
      // Request permission to access the media library
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) return {} as { latitude?: number; longitude?: number };
      const info = await MediaLibrary.getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: false });
      // Some platforms expose location directly
      if ((info as any).location && typeof (info as any).location.latitude === 'number') {
        return {
          latitude: (info as any).location.latitude,
          longitude: (info as any).location.longitude,
        };
      }
      if (info.exif) {
        const { latitude, longitude } = extractGpsFromExif(info.exif as any);
        return { latitude, longitude };
      }
    } catch (e) {
      console.log('[MediaLibrary] Failed to read EXIF or module not available', e);
    }
    return {} as { latitude?: number; longitude?: number };
  };

  const pickImage = async () => {
    if (images.length >= 10) {
      Alert.alert('알림', '최대 10장까지만 첨부할 수 있습니다.');
      return;
    }

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진을 선택하기 위해 갤러리 접근 권한이 필요합니다.');
      return;
    }

    // Android 10+ requires ACCESS_MEDIA_LOCATION to read EXIF GPS
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(
          // @ts-ignore - string literal permission name
          'android.permission.ACCESS_MEDIA_LOCATION'
        );
      } catch {}
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // 편집 화면을 항상 노출 (iOS/Android)
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: false,
      exif: true, // EXIF 데이터 요청
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newImages = [...images, asset.uri];
      setImages(newImages);

      if (asset.exif) {
        // 안드로이드에서는 exif가 중첩 객체에 담기는 경우가 있어 풀어서 시도
        const exif = (asset as any).exif?.Exif || (asset as any).exif || {};
        const { latitude, longitude } = extractGpsFromExif(exif);
        const valid =
          typeof latitude === 'number' &&
          typeof longitude === 'number' &&
          isFinite(latitude) &&
          isFinite(longitude) &&
          Math.abs(latitude) > 1e-6 &&
          Math.abs(longitude) > 1e-6 &&
          Math.abs(latitude) <= 90 &&
          Math.abs(longitude) <= 180;
        if (valid) {
          const newLocation = {
            uri: asset.uri,
            latitude,
            longitude,
          };
          setLocations((prev) => {
            const exists = prev.some((l) => l.uri === newLocation.uri);
            return exists ? prev : [...prev, newLocation];
          });
        } else if (Platform.OS === 'android') {
          // Try fetching original EXIF via MediaLibrary using assetId
          console.log('[ImagePicker] No valid GPS from picker; trying MediaLibrary with assetId', (asset as any).assetId);
          const { latitude: mlLat, longitude: mlLon } = await fetchGpsFromMediaLibrary((asset as any).assetId);
          const mlValid =
            typeof mlLat === 'number' &&
            typeof mlLon === 'number' &&
            isFinite(mlLat) &&
            isFinite(mlLon) &&
            Math.abs(mlLat) > 1e-6 &&
            Math.abs(mlLon) > 1e-6 &&
            Math.abs(mlLat) <= 90 &&
            Math.abs(mlLon) <= 180;
          if (mlValid) {
            const newLocation = { uri: asset.uri, latitude: mlLat!, longitude: mlLon! };
            setLocations((prev) => {
              const exists = prev.some((l) => l.uri === newLocation.uri);
              return exists ? prev : [...prev, newLocation];
            });
          } else {
            console.log('[MediaLibrary] No valid GPS found for asset');
          }
        }
      }
    }
  };

  const removeImage = (index: number) => {
    const imageToRemove = images[index];
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setLocations(locations.filter(loc => loc.uri !== imageToRemove));
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
          images: images.length > 0 ? images : undefined, 
          location: { images: locations },
        });
        Alert.alert('수정 완료', '일기가 수정되었습니다.');
      } else {
        await createDiary.mutateAsync({ 
          content, 
          images: images.length > 0 ? images : undefined, 
          location: { images: locations },
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButtonText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? '일기 수정' : '새 일기'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.headerButtonText}>완료</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TextInput
          style={styles.textInput}
          multiline
          value={content}
          onChangeText={setContent}
          placeholder="오늘의 일기를 입력하세요..."
          textAlignVertical="top"
        />

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
          {images.length < 10 && (
            <TouchableOpacity onPress={pickImage} style={styles.addImageButton}>
              <Ionicons name="camera" size={32} color="#007AFF" />
            </TouchableOpacity>
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
    borderColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  textInput: {
    fontSize: 17,
    lineHeight: 25,
    color: '#000',
    minHeight: 200,
    marginBottom: 24,
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
  addImageButton: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
