import * as THREE from 'three';

// ── Physics constants ──────────────────────────────────────────────────────────
export const THRUST = 2.2; // units per second²
export const YAW_THRUST = 1.0; // radians per second²
export const SHIP_RADIUS = 3; // bounding sphere radius (world units)
export const RESTITUTION = 0.4; // bounciness: 0 = dead stop, 1 = elastic
export const DAMAGE_MULTIPLIER = 1.2; // hull damage = impactSpeed × multiplier
export const SHIP_COLLISION_ID = 'spaceship';
export const DOCKING_PORT_RADIUS = 2; // port detection sphere radius (world units)
export const DOCKING_PORT_LOCAL_Z = 11; // local +Z from ship center to nose port

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
    periapsis: 0,     // min radial distance along simulated trajectory; 0 if none
    apoapsis: 0,      // max radial distance along closed trajectory; 0 if open
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
export const MAX_THRUST_MULTIPLIER = 3; // global cap for both player slider and autopilot
export const thrustMultiplier = { current: 1 }; // range 0.5–MAX_THRUST_MULTIPLIER
export const shipDestroyed = { current: false }; // set true when hull reaches 0

// ── Damage / control effects ───────────────────────────────────────────────
export const SHIP_IMPACT_PULSE_MS = 1200;
export const shipImpactPulseUntil = { current: 0 }; // performance.now() ms
export const shipControlDisabledUntil = { current: 0 }; // performance.now() ms
export const railgunImpactDir = new THREE.Vector3();
export const railgunImpactAt = { current: 0 }; // performance.now() ms
export const railgunTargetEngine = {
  current: null as 'reverseA' | 'reverseB' | null,
};

// ── Main engine damage state ───────────────────────────────────────────────
export const MAIN_ENGINE_HIT_RADIUS = 2.5;
export const MAIN_ENGINE_LOCAL_POS = {
  reverseA: new THREE.Vector3(-3.5, 2.5, -11.5),
  reverseB: new THREE.Vector3(3.5, 2.5, -11.5),
} as const;
export const mainEngineDisabled = {
  reverseA: { current: false },
  reverseB: { current: false },
};

// Yaw rate in rad/s — written by useShipPhysics each frame, read by AutopilotController
export const shipAngularVelocity = { current: 0 };
