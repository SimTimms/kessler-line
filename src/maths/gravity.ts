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

/** Circular orbital speed at a given radius: v = sqrt(mu / r). */
export function circularSpeed(mu: number, r: number): number {
  return Math.sqrt(mu / r);
}

/** Specific orbital energy: E = v²/2 - mu/r. Negative = bound, positive = escape. */
export function orbitalEnergy(v2: number, mu: number, r: number): number {
  return 0.5 * v2 - mu / r;
}

/** Eccentricity from specific energy and angular momentum: e = sqrt(1 + 2Eh²/mu²). */
export function eccentricityFromEnergy(energy: number, h2: number, mu: number): number {
  return Math.sqrt(Math.max(0, 1 + (2 * energy * h2) / (mu * mu)));
}
