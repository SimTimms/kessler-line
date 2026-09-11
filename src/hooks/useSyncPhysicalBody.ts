import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { findPhysical } from '../context/PhysicalRegistry';

interface UseSyncPhysicalBodyProps {
  id: string;
  ref: React.RefObject<THREE.Object3D | null>;
  isAffectedByGravity: boolean;
}
export default function useSyncPhysicalBody({
  id,
  ref,
  isAffectedByGravity,
}: UseSyncPhysicalBodyProps) {
  useFrame(() => {
    const body = findPhysical(id);
    if (ref.current && body && isAffectedByGravity) {
      ref.current.position.copy(body.position);
    }
  });
}
