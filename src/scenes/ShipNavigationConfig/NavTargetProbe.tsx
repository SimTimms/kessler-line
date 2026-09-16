import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { registerMagnetic, unregisterMagnetic } from '../../context/MagneticRegistry';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';

interface NavTargetProbeProps {
  id: string;
  label: string;
  position: [number, number, number];
  color: string;
}

export default function NavTargetProbe({
  id,
  label,
  position,
  color,
}: NavTargetProbeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const probePos = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position]
  );

  useEffect(() => {
    registerCollidable({
      id,
      label,
      getWorldPosition: (target) => target.copy(probePos),
      shape: { type: 'sphere', radius: 120 },
      getObject3D: () => groupRef.current,
    });
    registerMagnetic({
      id,
      label,
      getPosition: (target) => target.copy(probePos),
    });
    registerDriveSignature({
      id,
      label,
      getPosition: (target) => target.copy(probePos),
      getVelocity: (target) => target.set(0, 0, 0),
    });

    return () => {
      unregisterCollidable(id);
      unregisterMagnetic(id);
      unregisterDriveSignature(id);
    };
  }, [id, label, probePos]);

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <icosahedronGeometry args={[90, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} />
      </mesh>
    </group>
  );
}
