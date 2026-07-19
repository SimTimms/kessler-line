import { MOON_BODY_ID } from '../../../config/moonConfig';
import { orbitStatusRef, trajectoryApsisRef } from '../../../context/ShipState';
import { formatCompactDistance } from '../../../utils/formatCompactDistance';
import { getAltitudeAboveSurface } from '../../../utils/orbitAltitude';

const DASH = '—';

export interface OrbitHudMetrics {
  alt: string;
  peri: string;
  apo: string;
}

/** Display labels for gravity bodies (includes tutorial moon). */
export function orbitBodyLabel(bodyId: string): string {
  if (bodyId === MOON_BODY_ID) return 'MOON';
  return bodyId;
}

export function computeOrbitHudMetrics(): OrbitHudMetrics {
  const { bodyId, periapsis, apoapsis, surfaceRadius, hyperbolicPeriapsis } =
    orbitStatusRef.current;
  if (!bodyId) {
    return { alt: DASH, peri: DASH, apo: DASH };
  }

  const altitude = getAltitudeAboveSurface();
  if (altitude === null) {
    return { alt: DASH, peri: DASH, apo: DASH };
  }

  const alt = formatCompactDistance(Math.max(0, altitude));

  const traj = trajectoryApsisRef.current;
  const analyticPeri =
    periapsis > 0 ? periapsis : hyperbolicPeriapsis > 0 ? hyperbolicPeriapsis : 0;
  const trajPeri =
    traj.periapsis > 0 && traj.surfaceRadius > 0 ? traj.periapsis : 0;
  const periRadial = trajPeri > 0 ? trajPeri : analyticPeri;
  const apoRadial = traj.apoapsis > 0 && traj.surfaceRadius > 0 ? traj.apoapsis : apoapsis;
  const periSurface =
    trajPeri > 0 && traj.surfaceRadius > 0 ? traj.surfaceRadius : surfaceRadius;
  const apoSurface = traj.apoapsis > 0 ? traj.surfaceRadius : surfaceRadius;

  let peri = DASH;
  if (periRadial > 0) {
    peri = formatCompactDistance(Math.max(0, periRadial - periSurface));
  }

  let apo = DASH;
  if (apoRadial > 0) {
    apo = formatCompactDistance(Math.max(0, apoRadial - apoSurface));
  }

  return { alt, peri, apo };
}
