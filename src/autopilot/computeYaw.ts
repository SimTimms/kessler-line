import { YAW_THRUST } from '../context/ShipState';
import { ALIGN_ANGLE_THRESHOLD, ALIGN_ANG_VEL_THRESHOLD } from './constants';

// Short RCS yaw bursts (no continuous burn in vacuum).
const YAW_BURST_ON_MS = 120;
const YAW_BURST_OFF_MS = 260;
const YAW_BRAKE_BURST_ON_MS = 90;
const YAW_BRAKE_BURST_OFF_MS = 220;

const MAX_DESIRED_ANG_VEL = 0.9; // rad/s
const VEL_ERROR_DEADBAND = 0.025; // rad/s
const ALIGN_BRAKE_ZONE = 0.08; // rad (~4.6°)
const ANG_VEL_DAMPING = 0.9;

// Stateful pulse gate so yaw can never latch on continuously due to frame timing.
const yawPulseState = {
  activeDir: 0 as -1 | 0 | 1, // -1 left, +1 right
  burstEndsAtMs: 0,
  cooldownEndsAtMs: 0,
};

/**
 * Bang-bang yaw controller.
 *
 * signedError > 0  →  target is CW from nose  →  need to decrease rotation.y (yawLeft)
 * signedError < 0  →  target is CCW from nose →  need to increase rotation.y (yawRight)
 */
export function computeYaw(
  signedError: number,
  angVel: number,
): { yawLeft: boolean; yawRight: boolean } {
  const pulseGate = (dir: -1 | 0 | 1, braking: boolean) => {
    const now = performance.now();
    const onMs = braking ? YAW_BRAKE_BURST_ON_MS : YAW_BURST_ON_MS;
    const offMs = braking ? YAW_BRAKE_BURST_OFF_MS : YAW_BURST_OFF_MS;

    if (dir === 0) {
      // Keep any active burst running only until its timer expires.
      if (yawPulseState.activeDir !== 0 && now < yawPulseState.burstEndsAtMs) {
        return yawPulseState.activeDir;
      }
      yawPulseState.activeDir = 0;
      return 0;
    }

    // If a burst is active, keep that command until the burst finishes.
    if (yawPulseState.activeDir !== 0) {
      if (now < yawPulseState.burstEndsAtMs) return yawPulseState.activeDir;
      // Burst just ended; enforce an off window.
      yawPulseState.activeDir = 0;
      yawPulseState.cooldownEndsAtMs = now + offMs;
      return 0;
    }

    // Allow immediate opposite-direction braking pulses to arrest overshoot.
    const brakingOpposite =
      (dir === -1 && angVel > ALIGN_ANG_VEL_THRESHOLD) ||
      (dir === 1 && angVel < -ALIGN_ANG_VEL_THRESHOLD);
    if (!brakingOpposite && now < yawPulseState.cooldownEndsAtMs) return 0;

    // Start a new burst.
    yawPulseState.activeDir = dir;
    yawPulseState.burstEndsAtMs = now + onMs;
    return dir;
  };

  const abs = Math.abs(signedError);
  if (abs < ALIGN_ANGLE_THRESHOLD && Math.abs(angVel) < ALIGN_ANG_VEL_THRESHOLD) {
    return { yawLeft: false, yawRight: false };
  }

  // Desired angular velocity from heading error.
  // For constant-accel turning, ω_stop ~= sqrt(2 * α * θ). We target a damped
  // value below that so we begin counter-burns before the nose reaches target.
  const stopLimitedOmega = Math.sqrt(Math.max(0, 2 * YAW_THRUST * abs)) * ANG_VEL_DAMPING;
  let desiredOmegaMag = Math.min(MAX_DESIRED_ANG_VEL, stopLimitedOmega);
  if (abs < ALIGN_BRAKE_ZONE) desiredOmegaMag = 0;
  const desiredAngVel = signedError > 0 ? -desiredOmegaMag : desiredOmegaMag;

  const velError = desiredAngVel - angVel;
  if (Math.abs(velError) <= VEL_ERROR_DEADBAND) {
    const dir = pulseGate(0, true);
    return { yawLeft: dir === -1, yawRight: dir === 1 };
  }

  const dir: -1 | 1 = velError < 0 ? -1 : 1;
  const braking = (dir === -1 && angVel > 0) || (dir === 1 && angVel < 0);
  const pulsedDir = pulseGate(dir, braking);
  return { yawLeft: pulsedDir === -1, yawRight: pulsedDir === 1 };
}
