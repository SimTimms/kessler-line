/**
 * Per-station readiness for hover-dock descend: ship physics waits until the
 * LandPad platform has risen to meet height before starting the descend stage.
 */
export const landingPadElevatorReadyByStation: Map<string, boolean> = new Map();

export function setLandingPadElevatorReady(stationId: string, ready: boolean): void {
  landingPadElevatorReadyByStation.set(stationId, ready);
}

export function isLandingPadElevatorReady(stationId: string | null | undefined): boolean {
  if (!stationId) return true;
  // Pads without an elevator (or not yet mounted) must not block docking.
  if (!landingPadElevatorReadyByStation.has(stationId)) return true;
  return landingPadElevatorReadyByStation.get(stationId) === true;
}

export function clearLandingPadElevator(stationId: string): void {
  landingPadElevatorReadyByStation.delete(stationId);
}
