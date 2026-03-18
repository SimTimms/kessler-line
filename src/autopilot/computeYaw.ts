import { YAW_THRUST } from '../context/ShipState';
import { ALIGN_ANGLE_THRESHOLD, ALIGN_ANG_VEL_THRESHOLD } from './constants';

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
  const abs = Math.abs(signedError);
  if (abs < ALIGN_ANGLE_THRESHOLD && Math.abs(angVel) < ALIGN_ANG_VEL_THRESHOLD) {
    return { yawLeft: false, yawRight: false };
  }

  // Angle we'll coast through if we start braking now
  const thetaToStop = (angVel * angVel) / (2 * YAW_THRUST);

  if (signedError > ALIGN_ANGLE_THRESHOLD) {
    // Need CW (decrease rotation.y) = yawLeft = decrease angVel
    if (angVel >= 0 || thetaToStop < signedError) return { yawLeft: true, yawRight: false };
    return { yawLeft: false, yawRight: true };
  }

  if (signedError < -ALIGN_ANGLE_THRESHOLD) {
    // Need CCW (increase rotation.y) = yawRight = increase angVel
    if (angVel <= 0 || thetaToStop < -signedError) return { yawLeft: false, yawRight: true };
    return { yawLeft: true, yawRight: false };
  }

  // Within angle threshold — kill residual angular velocity
  if (angVel > ALIGN_ANG_VEL_THRESHOLD)  return { yawLeft: true,  yawRight: false };
  if (angVel < -ALIGN_ANG_VEL_THRESHOLD) return { yawLeft: false, yawRight: true  };
  return { yawLeft: false, yawRight: false };
}
