import * as THREE from 'three';

export interface RadiationZoneDef {
  id: string;
  label: string;
  /** If set, zone tracks this planet's position from gravityBodies each frame. */
  planetName?: string;
  /** Fixed world-space position — only used when planetName is absent. */
  position?: THREE.Vector3;
  radius: number; // world units
  intensity: number; // 0–1 scalar; drives hull drain rate and exposure depth
}

export const RADIATION_ZONES: RadiationZoneDef[] = [
  {
    id: 'tutorial-radiation-zone',
    label: 'HMS Afridi Wreck',
    radius: 1000,
    // exposure tops out at intensity; 0.01 × drain rate was effectively zero hull loss
    intensity: 0.35,
    position: new THREE.Vector3(-1600, 0, 2000),
  },
];

// Hull integrity drained per second per intensity unit when inside a zone
export const RADIATION_HULL_DRAIN_RATE = 3;
