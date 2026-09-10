import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { findPhysical } from '../context/PhysicalRegistry';

export default function useSyncPhysicalBody(
  id: string,
  ref: React.RefObject<THREE.Object3D | null>
) {
  useFrame(() => {
    const body = findPhysical(id);
    if (ref.current && body) {
      ref.current.position.copy(body.position);
    }
  });
}
