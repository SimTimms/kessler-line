import { useEffect } from 'react';
import * as THREE from 'three';
import type { ScannableRegistrationOptions } from '../config/scannableSignature';
import { registerCollidable, unregisterCollidable } from '../context/CollisionRegistry';
import { registerMagnetic, unregisterMagnetic } from '../context/MagneticRegistry';
import { registerDriveSignature, unregisterDriveSignature } from '../context/DriveSignatureRegistry';

const DEFAULT_PROXIMITY_SHAPE = { type: 'sphere' as const, radius: 50 };

/**
 * Registers an object with scanner subsystems based on {@link ScannableSignature} flags.
 * Mount on any component that owns a `groupRef` at the object's world transform.
 */
export function useScannableRegistration({
  id,
  label,
  groupRef,
  scannable = true,
  magnet = false,
  driveSignature = false,
  proximity = false,
  proximityShape = DEFAULT_PROXIMITY_SHAPE,
}: ScannableRegistrationOptions): void {
  const getPosition = (target: THREE.Vector3) => {
    if (groupRef.current) groupRef.current.getWorldPosition(target);
    else target.set(0, 0, 0);
    return target;
  };

  const getWorldQuaternion = (target: THREE.Quaternion) => {
    if (groupRef.current) groupRef.current.getWorldQuaternion(target);
    else target.identity();
    return target;
  };

  useEffect(() => {
    if (!scannable) return;

    if (proximity) {
      registerCollidable({
        id,
        getWorldPosition: getPosition,
        getWorldQuaternion,
        shape: proximityShape,
        getObject3D: () => groupRef.current,
      });
    }

    if (magnet) {
      registerMagnetic({ id, label, getPosition });
    }

    if (driveSignature) {
      registerDriveSignature({ id, label, getPosition });
    }

    return () => {
      if (proximity) unregisterCollidable(id);
      if (magnet) unregisterMagnetic(id);
      if (driveSignature) unregisterDriveSignature(id);
    };
    // proximityShape must be referentially stable (useMemo at call site if not default)
  }, [id, label, scannable, magnet, driveSignature, proximity, proximityShape]);
}
