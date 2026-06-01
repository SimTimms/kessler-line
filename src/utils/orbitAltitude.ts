import { gravityBodies } from '../context/GravityRegistry';
import { shipPosRef } from '../context/ShipPos';
import { orbitStatusRef } from '../context/ShipState';

/**
 * Altitude above the primary body's surface (same formula as the Nav HUD ALT readout).
 * Returns null when there is no active gravity body.
 */
export function getAltitudeAboveSurface(): number | null {
  const { bodyId, surfaceRadius } = orbitStatusRef.current;
  if (!bodyId || surfaceRadius <= 0) return null;

  const body = gravityBodies.get(bodyId);
  if (!body) return null;

  const dx = shipPosRef.current.x - body.position.x;
  const dy = shipPosRef.current.y - body.position.y;
  const dz = shipPosRef.current.z - body.position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return dist - surfaceRadius;
}
