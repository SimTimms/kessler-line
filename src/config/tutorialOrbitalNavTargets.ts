import * as THREE from 'three';
import { gravityBodies } from '../context/GravityRegistry';
import { MOON_BODY_ID } from './moonConfig';

/** Nav target id for Sol (visual sun only — not in gravity registry). */
export const TUTORIAL_ORBITAL_SOL_NAV_ID = 'tutorial-sol';

/** World position of the tutorial sun; updated each frame by {@link TutorialOrbitalSolarSystem}. */
export const tutorialOrbitalSolPosRef = { current: new THREE.Vector3() };

const _origin = new THREE.Vector3();

export interface TutorialOrbitalNavTarget {
  id: string;
  label: string;
  getPosition: (out: THREE.Vector3) => THREE.Vector3;
}

function getMoonPosition(out: THREE.Vector3): THREE.Vector3 {
  const body = gravityBodies.get(MOON_BODY_ID);
  return body ? out.copy(body.position) : out.copy(_origin);
}

/** Nav HUD planetary list for the orbital tutorial — only bodies present in the scene. */
export const TUTORIAL_ORBITAL_NAV_TARGETS: TutorialOrbitalNavTarget[] = [
  {
    id: MOON_BODY_ID,
    label: 'Luna',
    getPosition: getMoonPosition,
  },
  {
    id: TUTORIAL_ORBITAL_SOL_NAV_ID,
    label: 'Sol',
    getPosition: (out) => out.copy(tutorialOrbitalSolPosRef.current),
  },
];
