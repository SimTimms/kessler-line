import * as THREE from 'three';

export type { GravityBody } from '../context/GravityRegistry';

/** Mutable per-object state for gravity-integrated orbiting objects. */
export interface OrbitState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  primaryBodyId: string | null;
  primaryBodyVelocity: THREE.Vector3;
}

/** Returned by `stepOrbit` — caller uses these for SFX, HUD, etc. */
export interface StepResult {
  primaryBodyId: string | null;
  soiTransition: { from: string | null; to: string | null } | null;
  distSq: number;
}

/** Output of `computeOrbitalParameters` — conic orbit info for HUD display. */
export interface OrbitalParameters {
  bodyId: string;
  isOrbiting: boolean;
  periapsis: number;
  apoapsis: number;
  surfaceRadius: number;
  radialVelocity: number;
  hyperbolicPeriapsis: number;
}

/** Result of `findPrimaryBody` — the gravity body with greatest acceleration. */
export interface PrimaryBodyResult {
  body: import('../context/GravityRegistry').GravityBody;
  id: string;
  distSq: number;
}

/** Options for `initCircularOrbit`. */
export interface InitCircularOrbitOptions {
  bodyId: string;
  radius: number;
  phase: number;
  inclinationX?: number;
  inclinationZ?: number;
}

/** Result of `initCircularOrbit` — vectors for seeding an OrbitState. */
export interface InitCircularOrbitResult {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  bodyVelocity: THREE.Vector3;
  bodyId: string;
}
