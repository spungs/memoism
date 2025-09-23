import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

function Box() {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.x = mesh.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={mesh} scale={2}>
      <boxGeometry />
      <meshStandardMaterial color={'orange'} />
    </mesh>
  );
}

export default function AiCharacter() {
  return (
    <Canvas style={styles.canvas}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 100,
    left: 20,
    width: 150,
    height: 150,
    backgroundColor: 'lightgrey',
    zIndex: 1,
  },
});