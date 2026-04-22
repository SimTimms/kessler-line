import * as THREE from 'three';
import { MAIN_ENGINE_LOCAL_POS_A, MAIN_ENGINE_LOCAL_POS_B } from '../config/shipConfig';

// ── Physics constants (values live in src/config/shipConfig.ts) ────────────────
export {
  THRUST,
  YAW_THRUST,
  SHIP_RADIUS,
  RESTITUTION,
  MAX_THRUST_MULTIPLIER,
  SHIP_IMPACT_PULSE_MS,
  DOCKING_PORT_RADIUS,
  DOCKING_PORT_LOCAL_Z,
  MAIN_ENGINE_HIT_RADIUS,
} from '../config/shipConfig';
export { COLLISION_DAMAGE_MULTIPLIER as DAMAGE_MULTIPLIER } from '../config/damageConfig';
export const SHIP_COLLISION_ID = 'spaceship';

// ── Resource state ────────────────────────────────────────────────────────────
export let power = 100; // 0–100, decreases by 1 per active thrust key/sec
export let hullIntegrity = 100; // 0–100, decreases on collision
export let fuel = 100; // 0–100, drains while thrusting, refills while docked
export let o2 = 100; // 0–100, depletes constantly, refills while docked

export function setPower(v: number) {
  power = v;
}
export function setFuel(v: number) {
  fuel = v;
}
export function setO2(v: number) {
  o2 = v;
}
export function setHullIntegrity(v: number) {
  hullIntegrity = v;
}

export function drainPower(amount: number) {
  power = Math.max(0, power - amount);
}

export function damageHull(amount: number) {
  hullIntegrity = Math.max(0, hullIntegrity - amount);
}

// ── Shared refs (read by other components every frame) ────────────────────────
export const shipVelocity = new THREE.Vector3(); // updated each frame; read by HUD
export const METRES_PER_UNIT = 1;
export function getShipSpeedMps() {
  return shipVelocity.length() * METRES_PER_UNIT;
}
export const shipAcceleration = { current: 0 }; // linear acceleration magnitude (units/s²)
export const shipQuaternion = new THREE.Quaternion(); // updated each frame; read by EjectedCargo
export const orbitingBodyIdRef = { current: null as string | null }; // current primary gravity body id
export const orbitStatusRef = {
  current: {
    bodyId: null as string | null,
    isOrbiting: false,
    periapsis: 0,
    apoapsis: 0,
    surfaceRadius: 0,
    radialVelocity: 0, // positive = moving away from body (toward apoapsis), negative = toward body (toward periapsis)
    hyperbolicPeriapsis: 0, // predicted periapsis on hyperbolic approach (energy ≥ 0); 0 when not applicable
  },
};

// ── Trajectory-simulated apsides (written by VelocityIndicator each frame) ────
// Values are radial distances (not altitudes) from the primary body center.
// apoapsis is 0 when the trajectory is open (hyperbolic).
export const trajectoryApsisRef = {
  current: {
    periapsis: 0, // min radial distance along simulated trajectory; 0 if none
    apoapsis: 0, // max radial distance along closed trajectory; 0 if open
    surfaceRadius: 0, // surface radius of the primary body at time of calculation
  },
};

// ── Mobile thrust inputs (set by MobileControls overlay) ─────────────────────
export const mobileThrustForward = { current: false };
export const mobileThrustReverse = { current: false };
export const mobileThrustLeft = { current: false };
export const mobileThrustRight = { current: false };
export const mobileThrustStrafeLeft = { current: false };
export const mobileThrustStrafeRight = { current: false };
export const mobileThrustRadialOut = { current: false };
export const mobileThrustRadialIn = { current: false };

// ── Cinematic thrust overrides ───────────────────────────────────────────────
export const cinematicThrustForward = { current: false };
export const cinematicThrustReverse = { current: false };

export const isRefueling = { current: false }; // set by Refuel button while docked
export const isTransferringO2 = { current: false }; // set by Transfer O2 button while docked
export const thrustMultiplier = { current: 1 }; // range 0.5–MAX_THRUST_MULTIPLIER
export const shipDestroyed = { current: false }; // set true when hull reaches 0

// ── Damage / control effects ───────────────────────────────────────────────
export const shipImpactPulseUntil = { current: 0 }; // performance.now() ms
export const shipControlDisabledUntil = { current: 0 }; // performance.now() ms
export const railgunImpactDir = new THREE.Vector3();
export const railgunImpactAt = { current: 0 }; // performance.now() ms
export const railgunTargetEngine = {
  current: null as 'reverseA' | 'reverseB' | null,
};

// ── Main engine damage state ───────────────────────────────────────────────
export const MAIN_ENGINE_LOCAL_POS = {
  reverseA: new THREE.Vector3(
    MAIN_ENGINE_LOCAL_POS_A[0],
    MAIN_ENGINE_LOCAL_POS_A[1],
    MAIN_ENGINE_LOCAL_POS_A[2]
  ),
  reverseB: new THREE.Vector3(
    MAIN_ENGINE_LOCAL_POS_B[0],
    MAIN_ENGINE_LOCAL_POS_B[1],
    MAIN_ENGINE_LOCAL_POS_B[2]
  ),
} as const;
export const mainEngineDisabled = {
  reverseA: { current: false },
  reverseB: { current: false },
};

// Yaw rate in rad/s — written by useShipPhysics each frame, read by AutopilotController
export const shipAngularVelocity = { current: 0 };
