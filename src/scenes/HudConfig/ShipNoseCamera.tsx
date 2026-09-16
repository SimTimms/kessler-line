import { useEffect, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shipDestroyed } from '../../context/ShipState';
import { sceneCamera } from '../../context/CameraRef';
import { SHIP_FLIGHT_FORWARD_LOCAL } from '../../config/shipConfig';

const _pos = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _look = new THREE.Vector3();
const _forwardLocal = new THREE.Vector3(...SHIP_FLIGHT_FORWARD_LOCAL);
const _upLocal = new THREE.Vector3(0, 1, 0);

interface ShipNoseCameraProps {
  attachTo: RefObject<THREE.Object3D | null>;
  /** Ship-local camera position (ahead of the nose along flight forward). */
  localOffset?: [number, number, number];
  /** useFrame priority (lower runs earlier). */
  framePriority?: number;
}

/**
 * First-person camera locked to the ship nose, looking along flight forward (−Z).
 * Claims {@link sceneCamera} for HUD world→screen projections.
 */
export default function ShipNoseCamera({
  attachTo,
  localOffset = [0, 1.2, -14],
  framePriority = 0,
}: ShipNoseCameraProps) {
  const { camera, scene } = useThree();

  useEffect(() => {
    sceneCamera.current = camera;
    scene.add(camera);
    return () => {
      sceneCamera.current = null;
      scene.remove(camera);
    };
  }, [camera, scene]);

  useFrame(() => {
    if (shipDestroyed.current) return;
    const ship = attachTo.current;
    if (!ship) return;

    ship.updateWorldMatrix(true, false);
    _pos.set(...localOffset);
    ship.localToWorld(_pos);
    camera.position.copy(_pos);

    _forward.copy(_forwardLocal).transformDirection(ship.matrixWorld).normalize();
    _up.copy(_upLocal).transformDirection(ship.matrixWorld).normalize();
    camera.up.copy(_up);
    _look.copy(_pos).add(_forward);
    camera.lookAt(_look);
    camera.updateMatrixWorld();
  }, framePriority);

  return null;
}
