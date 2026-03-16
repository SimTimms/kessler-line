import * as THREE from 'three';
import { FUEL_STATION_DEF } from '../config/worldConfig';

/** Mutable ref holding the 3D world position of the active nav target.
 *  Updated by the HUD selector; read each frame by RedPlanetLine. */
export const navTargetPosRef: { current: THREE.Vector3 } = {
  current: new THREE.Vector3(...FUEL_STATION_DEF.position),
};

export const navTargetIdRef: { current: string } = {
  current: FUEL_STATION_DEF.id,
};
