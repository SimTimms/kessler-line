import { useEffect, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  registerCollidable,
  unregisterCollidable,
  type ColliderShape,
} from '../context/CollisionRegistry';
import { registerMagnetic, unregisterMagnetic } from '../context/MagneticRegistry';

export type WorldObjectMagneticConfig = {
  label: string;
};

export type WorldObjectCollidableConfig = {
  shape: ColliderShape;
  stationId?: string;
};

/** Declarative scanner/collision registration for a single world object. */
export type WorldObjectRegistrationConfig = {
  id: string;
  /** `true` uses `id` as the HUD label; pass `{ label }` for a custom name. */
  magnetic?: boolean | WorldObjectMagneticConfig;
  collidable?: WorldObjectCollidableConfig;
};

/**
 * Registers a Three.js object with game systems from component-level config.
 * Collidables feed proximity scan + ship collision; magnetic feeds MagneticHUD.
 */
export function useRegisterWorldObject(
  objectRef: RefObject<THREE.Object3D | null>,
  config: WorldObjectRegistrationConfig
) {
  const velocityRef = useRef(new THREE.Vector3());
  const prevPosRef = useRef(new THREE.Vector3());
  const hasPrevRef = useRef(false);
  const worldPosRef = useRef(new THREE.Vector3());

  const { id, magnetic, collidable } = config;
  const magneticLabel = typeof magnetic === 'object' ? magnetic.label : id;

  useEffect(() => {
    const getWorldPosition = (target: THREE.Vector3) => {
      if (objectRef.current) objectRef.current.getWorldPosition(target);
      return target;
    };
    const getWorldQuaternion = (target: THREE.Quaternion) => {
      if (objectRef.current) objectRef.current.getWorldQuaternion(target);
      return target;
    };
    const getWorldVelocity = (target: THREE.Vector3) => target.copy(velocityRef.current);
    const getObject3D = () => objectRef.current;

    if (collidable) {
      registerCollidable({
        id,
        stationId: collidable.stationId,
        getWorldPosition,
        getWorldQuaternion,
        getWorldVelocity,
        shape: collidable.shape,
        getObject3D,
      });
    }

    if (magnetic) {
      registerMagnetic({
        id,
        label: magneticLabel,
        getPosition: getWorldPosition,
        getVelocity: getWorldVelocity,
      });
    }

    return () => {
      if (collidable) unregisterCollidable(id);
      if (magnetic) unregisterMagnetic(id);
    };
  }, [id, magnetic, magneticLabel, collidable, objectRef]);

  useFrame((_, delta) => {
    if (!objectRef.current || delta <= 0 || (!collidable && !magnetic)) return;

    objectRef.current.getWorldPosition(worldPosRef.current);
    if (hasPrevRef.current) {
      velocityRef.current
        .copy(worldPosRef.current)
        .sub(prevPosRef.current)
        .multiplyScalar(1 / delta);
    } else {
      velocityRef.current.set(0, 0, 0);
      hasPrevRef.current = true;
    }
    prevPosRef.current.copy(worldPosRef.current);
  });

  return { velocityRef };
}
