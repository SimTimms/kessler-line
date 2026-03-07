import * as THREE from 'three';
import { EARTH_DEF } from '../config/worldConfig';

/** Mutable ref holding the 3D world position of the active nav target.
 *  Updated by the HUD selector; read each frame by RedPlanetLine. */
export const navTargetPosRef: { current: THREE.Vector3 } = {
  current: new THREE.Vector3(...EARTH_DEF.position),
};

export const navTargetIdRef: { current: string } = {
  current: EARTH_DEF.id,
};
