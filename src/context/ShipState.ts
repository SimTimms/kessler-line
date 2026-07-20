import {
  ensureVesselState,
  setVesselPower,
  setVesselFuel,
  canVesselUsePropulsion,
  setVesselO2,
  setVesselCrew,
  setVesselHullIntegrity,
  drainVesselPower,
  damageVesselHull,
} from './VesselStateStore';
import { onPlayerPowerChanged } from './shipPowerSystems';
import {
  PLAYER_VESSEL_ID,
  mobileThrustForward,
  mobileThrustReverse,
  mobileThrustLeft,
  mobileThrustRight,
  mobileThrustStrafeLeft,
  mobileThrustStrafeRight,
  mobileThrustRadialOut,
  mobileThrustRadialIn,
  cinematicThrustForward,
  cinematicThrustReverse,
} from './PlayerShipState';

// ── Physics constants (values live in src/config/shipConfig.ts) ────────────────
import {
  PLAYER_SHIP_AMMO_CAPACITY,
  PLAYER_SHIP_AMMO_START,
} from '../config/shipConfig';
export {
  THRUST,
  YAW_THRUST,
  YAW_DAMPING,
  MAX_YAW_RATE,
  SHIP_RADIUS,
  RESTITUTION,
  MAX_THRUST_MULTIPLIER,
  SHIP_IMPACT_PULSE_MS,
  DOCKING_PORT_RADIUS,
  DOCKING_PORT_LOCAL_Z,
  MAIN_ENGINE_HIT_RADIUS,
  PLAYER_SHIP_AMMO_CAPACITY,
  PLAYER_SHIP_AMMO_START,
} from '../config/shipConfig';
export { COLLISION_DAMAGE_MULTIPLIER as DAMAGE_MULTIPLIER } from '../config/damageConfig';
export const SHIP_COLLISION_ID = 'spaceship';

const playerState = ensureVesselState(PLAYER_VESSEL_ID);

function syncPlayerResourceBindings() {
  power = playerState.power;
  hullIntegrity = playerState.hullIntegrity;
  fuel = playerState.fuel;
  o2 = playerState.o2;
  shipCrew = playerState.shipCrew;
}

// ── Resource state (player compatibility bindings) ───────────────────────────
export let power = playerState.power; // 0–100, decreases by 1 per active thrust key/sec
export let hullIntegrity = playerState.hullIntegrity; // 0–100, decreases on collision
export let fuel = playerState.fuel; // 0–100, drains while thrusting, refills while docked
export let o2 = playerState.o2; // 0–100, depletes constantly, refills while docked
export let shipCrew = playerState.shipCrew; // crew aboard (0–SHIP_CREW_CAPACITY)

/** Current cannon rounds aboard the player ship. */
export let ammo = PLAYER_SHIP_AMMO_START;
/** Magazine capacity for the player ship (configurable per ship). */
export let ammoCapacity = PLAYER_SHIP_AMMO_CAPACITY;

export function setAmmoCapacity(capacity: number): void {
  ammoCapacity = Math.max(0, Math.floor(capacity));
  ammo = Math.min(ammo, ammoCapacity);
}

export function setAmmo(v: number): void {
  ammo = Math.max(0, Math.min(ammoCapacity, Math.floor(v)));
}

/** Reset magazine to the configured start load for this ship. */
export function resetAmmo(
  start: number = PLAYER_SHIP_AMMO_START,
  capacity: number = PLAYER_SHIP_AMMO_CAPACITY
): void {
  ammoCapacity = Math.max(0, Math.floor(capacity));
  ammo = Math.max(0, Math.min(ammoCapacity, Math.floor(start)));
}

/** Consume rounds if available. Returns false when the magazine is empty. */
export function tryConsumeAmmo(count = 1): boolean {
  const n = Math.max(1, Math.floor(count));
  if (ammo < n) return false;
  ammo -= n;
  return true;
}

export function setPower(v: number) {
  const previous = playerState.power;
  const next = onPlayerPowerChanged(previous, v);
  setVesselPower(PLAYER_VESSEL_ID, next);
  syncPlayerResourceBindings();
}
export function setFuel(v: number) {
  setVesselFuel(PLAYER_VESSEL_ID, v);
  syncPlayerResourceBindings();
}
export function canUsePropulsion(): boolean {
  return canVesselUsePropulsion(PLAYER_VESSEL_ID);
}
export function setO2(v: number) {
  setVesselO2(PLAYER_VESSEL_ID, v);
  syncPlayerResourceBindings();
}
export function setShipCrew(v: number) {
  setVesselCrew(PLAYER_VESSEL_ID, v);
  syncPlayerResourceBindings();
}
export function setHullIntegrity(v: number) {
  setVesselHullIntegrity(PLAYER_VESSEL_ID, v);
  syncPlayerResourceBindings();
}

export function drainPower(amount: number) {
  const previous = playerState.power;
  drainVesselPower(PLAYER_VESSEL_ID, amount);
  syncPlayerResourceBindings();
  onPlayerPowerChanged(previous, playerState.power);
}

export function damageHull(amount: number) {
  damageVesselHull(PLAYER_VESSEL_ID, amount);
  syncPlayerResourceBindings();
}

// ── Shared refs (read by other components every frame) ────────────────────────
export const shipVelocity = playerState.shipVelocity; // updated each frame; read by HUD
export const METRES_PER_UNIT = 1;
export function getShipSpeedMps() {
  return shipVelocity.length() * METRES_PER_UNIT;
}
export const shipAcceleration = playerState.shipAcceleration; // linear acceleration magnitude (units/s²)
export const shipQuaternion = playerState.shipQuaternion; // updated each frame; read by EjectedCargo
export const orbitingBodyIdRef = playerState.orbitingBodyIdRef; // current primary gravity body id
export const orbitStatusRef = playerState.orbitStatusRef;

// ── Trajectory-simulated apsides (written by VelocityIndicator each frame) ────
// Values are radial distances (not altitudes) from the primary body center.
// apoapsis is 0 when the trajectory is open (hyperbolic).
export const trajectoryApsisRef = playerState.trajectoryApsisRef;

export const isRefueling = playerState.isRefueling; // set by Refuel button while docked
export const isTransferringO2 = playerState.isTransferringO2; // set by Transfer O2 button while docked
export const thrustMultiplier = playerState.thrustMultiplier; // range 0.5–MAX_THRUST_MULTIPLIER
export const shipDestroyed = playerState.shipDestroyed; // set true when hull reaches 0

// ── Damage / control effects ───────────────────────────────────────────────
export const shipImpactPulseUntil = playerState.shipImpactPulseUntil; // performance.now() ms
export const shipControlDisabledUntil = playerState.shipControlDisabledUntil; // performance.now() ms
export const railgunImpactDir = playerState.railgunImpactDir;
export const railgunImpactAt = playerState.railgunImpactAt; // performance.now() ms
export const railgunTargetEngine = playerState.railgunTargetEngine;

// ── Main engine damage state ───────────────────────────────────────────────
export const MAIN_ENGINE_LOCAL_POS = playerState.MAIN_ENGINE_LOCAL_POS;
export const mainEngineDisabled = playerState.mainEngineDisabled;

// Yaw rate in rad/s — written by useShipPhysics each frame, read by AutopilotController
export const shipAngularVelocity = playerState.shipAngularVelocity;

// ── Effective thruster states ─────────────────────────────────────────────────
// Written by useShipPhysics each frame after cancel-assist and stabilizer logic.
// Read by ThrusterParticles so visual effects reflect computed thrust, not just
// raw key presses (stabilizer, autopilot overrides, and cancel-assist all show
// the correct thruster firing).
export const effectiveThrustFwd = playerState.effectiveThrustFwd;
export const effectiveThrustRev = playerState.effectiveThrustRev;
export const effectiveYawLeft = playerState.effectiveYawLeft;
export const effectiveYawRight = playerState.effectiveYawRight;
export const effectiveThrustStrL = playerState.effectiveThrustStrL;
export const effectiveThrustStrR = playerState.effectiveThrustStrR;

// ── Re-export player-control state from dedicated module ─────────────────────
export {
  PLAYER_VESSEL_ID,
  mobileThrustForward,
  mobileThrustReverse,
  mobileThrustLeft,
  mobileThrustRight,
  mobileThrustStrafeLeft,
  mobileThrustStrafeRight,
  mobileThrustRadialOut,
  mobileThrustRadialIn,
  cinematicThrustForward,
  cinematicThrustReverse,
};
