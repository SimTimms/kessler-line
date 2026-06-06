import * as THREE from 'three';
import { MOON_BODY_ID } from './moonConfig';
import {
  gravityBodyNavTarget,
  positionRefNavTarget,
  type PlanetaryNavTarget,
} from './planetaryNavTargets';

/** Nav target id for Sol (visual sun only — not in gravity registry). */
export const TUTORIAL_ORBITAL_SOL_NAV_ID = 'tutorial-sol';

/** World position of the tutorial sun; updated each frame by {@link TutorialOrbitalSolarSystem}. */
export const tutorialOrbitalSolPosRef = { current: new THREE.Vector3() };

export type TutorialOrbitalNavTarget = PlanetaryNavTarget;

/** Nav HUD planetary list for the orbital tutorial — only bodies present in the scene. */
export const TUTORIAL_ORBITAL_NAV_TARGETS: TutorialOrbitalNavTarget[] = [
  gravityBodyNavTarget(MOON_BODY_ID, 'Luna', MOON_BODY_ID),
  positionRefNavTarget(TUTORIAL_ORBITAL_SOL_NAV_ID, 'Sol', tutorialOrbitalSolPosRef),
];
