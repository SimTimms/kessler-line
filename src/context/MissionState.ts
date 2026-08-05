/**
 * MissionState — module-level refs for mission tracking.
 *
 * Follows the same pattern as ShipState.ts / TutorialState.ts so that
 * SaveManager can read and write mission progress without going through React.
 */

export type MissionId = 'kronos4' | 'mars' | 'neptune';

export const activeMissionRef: { current: MissionId | null } = { current: null };
export const completedMissionsRef: { current: string[] } = { current: [] };

const EVENT_NAME = 'MissionStateChanged';

function notify() {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function setActiveMission(mission: MissionId | null): void {
  activeMissionRef.current = mission;
  notify();
}

export function addCompletedMission(missionId: string): void {
  if (!completedMissionsRef.current.includes(missionId)) {
    completedMissionsRef.current = [...completedMissionsRef.current, missionId];
  }
  notify();
}

export function setCompletedMissions(missions: string[]): void {
  completedMissionsRef.current = [...missions];
  notify();
}

export function resetMissionState(): void {
  activeMissionRef.current = null;
  completedMissionsRef.current = [];
  notify();
}
