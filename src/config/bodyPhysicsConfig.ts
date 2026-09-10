export const GRAVITATIONAL_CONSTANT = 10000;
export const SOFTENING = 500;

export function calcOrbitalVelocity(
  centerMass: number,
  orbitingPos: [number, number, number],
  centerPos: [number, number, number]
): [number, number, number] {
  const dx = orbitingPos[0] - centerPos[0];
  const dy = orbitingPos[1] - centerPos[1];
  const dz = orbitingPos[2] - centerPos[2];
  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const speed = Math.sqrt(GRAVITATIONAL_CONSTANT * centerMass / r);

  // direction perpendicular to the line between the bodies (in the XZ plane)
  const perpX = -dz / r;
  const perpZ = dx / r;

  return [perpX * speed, 0, perpZ * speed];
}
