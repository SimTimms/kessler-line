/** Squared distance between two points in the XZ plane. */
export function distanceSquaredXZ(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
): number {
  const dx = x1 - x2;
  const dz = z1 - z2;
  return dx * dx + dz * dz;
}

/** True when a point is inside a body's SOI but outside its surface. */
export function isInsideSOI(
  distSq: number,
  surfaceRadius: number,
  soiRadius: number,
): boolean {
  return (
    distSq > surfaceRadius * surfaceRadius &&
    distSq < soiRadius * soiRadius
  );
}

/** Gravitational acceleration magnitude at a given squared distance. */
export function gravityAccel(mu: number, distSq: number): number {
  return mu / distSq;
}
