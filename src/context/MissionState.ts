/**
 * MissionState — module-level refs for mission tracking.
 *
 * Follows the same pattern as ShipState.ts / TutorialState.ts so that
 * SaveManager can read and write mission progress without going through React.
 */

export type MissionId = string;

export const activeMissionRef: { current: string[] } = { current: [] };
export const completedMissionsRef: { current: string[] } = { current: [] };
export const declinedMissionsRef: { current: string[] } = { current: [] };

const EVENT_NAME = 'MissionStateChanged';

function notify() {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function addActiveMission(missionId: string): void {
  if (!activeMissionRef.current.includes(missionId)) {
    activeMissionRef.current = [...activeMissionRef.current, missionId];
  }
  notify();
}

export function removeActiveMission(missionId: string): void {
  activeMissionRef.current = activeMissionRef.current.filter((id) => id !== missionId);
  notify();
}

export function setActiveMissions(missions: string[]): void {
  activeMissionRef.current = [...missions];
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

export function addDeclinedMission(missionId: string): void {
  if (!declinedMissionsRef.current.includes(missionId)) {
    declinedMissionsRef.current = [...declinedMissionsRef.current, missionId];
  }
  notify();
}

export function setDeclinedMissions(missions: string[]): void {
  declinedMissionsRef.current = [...missions];
  notify();
}

export function resetMissionState(): void {
  activeMissionRef.current = [];
  completedMissionsRef.current = [];
  declinedMissionsRef.current = [];
  notify();
}
