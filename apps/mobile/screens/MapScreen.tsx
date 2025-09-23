import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../utils/navigationRef';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;

export default function MapScreen({ route }: Props) {
  const { locations } = route.params;
  const filtered = Array.isArray(locations)
    ? locations.filter(
        (l: any) =>
          l &&
          typeof l.latitude === 'number' &&
          typeof l.longitude === 'number' &&
          isFinite(l.latitude) &&
          isFinite(l.longitude) &&
          Math.abs(l.latitude) > 1e-6 &&
          Math.abs(l.longitude) > 1e-6 &&
          Math.abs(l.latitude) <= 90 &&
          Math.abs(l.longitude) <= 180
      )
    : [];

  // Calculate initial region to show all markers
  const initialRegion = filtered.length > 0 ? {
    latitude: filtered[0].latitude,
    longitude: filtered[0].longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {filtered.map((loc, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
          >
            <View style={styles.markerContainer}>
              <Image source={{ uri: loc.uri }} style={styles.markerImage} />
            </View>
          </Marker>
        ))}
      </MapView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  markerImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
});
