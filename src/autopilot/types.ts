import * as THREE from 'three';
import type { GravityBody } from '../context/GravityRegistry';
import type { AutopilotPhase } from '../context/AutopilotState';

export type { AutopilotPhase, GravityBody };

export type OrbitStatus = {
  isOrbiting: boolean;
  periapsis: number;
  apoapsis: number;
};

/**
 * All per-frame shared state passed to autopilot phase helpers.
 * Scratch vectors (noseDir, toTarget, velFlat) are module-level in the
 * controller and safe to read within a single useFrame call.
 */
export type AutopilotCtx = {
  shipPos: THREE.Vector3;          // world position (XZ used; Y ignored)
  noseDir: THREE.Vector3;          // unit vec: ship nose in world XZ
  toTarget: THREE.Vector3;         // unit vec: ship → target in world XZ
  velFlat: THREE.Vector3;          // velocity in world XZ

  dist: number;                    // distance to target center
  distToArrival: number;           // dist minus arrivalRadius
  vToward: number;                 // velocity component toward target (+ = closing)
  speed: number;                   // total XZ speed
  angVel: number;                  // yaw angular velocity (rad/s)
  aligned: boolean;                // nose within angle + angular-velocity thresholds

  gravBody: GravityBody | undefined;
  arrivalRadius: number;
  orbitStatus: OrbitStatus;

  // Thrust output refs — helpers write to these; cleared each frame before phase logic
  thrustForward: { current: boolean };
  thrustReverse: { current: boolean };
  yawLeft:       { current: boolean };
  yawRight:      { current: boolean };

  // Status string written each frame by the active phase helper — shown in NavHUD
  status: { current: string };
};
