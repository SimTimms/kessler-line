import { useEffect } from 'react';
import * as THREE from 'three';
import {
  resolveScannerLabel,
  type ScannableRegistrationOptions,
} from '../config/scannableSignature';
import { registerCollidable, unregisterCollidable } from '../context/CollisionRegistry';
import { registerMagnetic, unregisterMagnetic } from '../context/MagneticRegistry';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../context/DriveSignatureRegistry';

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
  const magnetLabel = resolveScannerLabel(magnet, label);
  const driveSignatureLabel = resolveScannerLabel(driveSignature, label);
  const proximityLabel = resolveScannerLabel(proximity, label);

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

    if (proximityLabel !== null) {
      registerCollidable({
        id,
        label: proximityLabel,
        getWorldPosition: getPosition,
        getWorldQuaternion,
        shape: proximityShape,
        getObject3D: () => groupRef.current,
      });
    }

    if (magnetLabel !== null) {
      registerMagnetic({ id, label: magnetLabel, getPosition });
    }

    if (driveSignatureLabel !== null) {
      registerDriveSignature({ id, label: driveSignatureLabel, getPosition });
    }

    return () => {
      if (proximityLabel !== null) unregisterCollidable(id);
      if (magnetLabel !== null) unregisterMagnetic(id);
      if (driveSignatureLabel !== null) unregisterDriveSignature(id);
    };
    // proximityShape must be referentially stable (useMemo at call site if not default)
  }, [
    id,
    label,
    magnetLabel,
    driveSignatureLabel,
    proximityLabel,
    scannable,
    proximityShape,
  ]);
}
