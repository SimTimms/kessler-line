export const EVENT_DOCK_PERMISSION_CHANGED = 'DockPermissionChanged';
export const EVENT_DOCK_PERMISSION_CANDIDATE_CHANGED = 'DockPermissionCandidateChanged';

export interface DockPermissionCandidate {
  stationId: string;
  dockEntryId: string;
  label: string;
}

const grantedDockPermissions = new Set<string>();
let activeDockPermissionCandidate: DockPermissionCandidate | null = null;

function emitPermissionChanged(stationId: string, granted: boolean): void {
  window.dispatchEvent(
    new CustomEvent(EVENT_DOCK_PERMISSION_CHANGED, {
      detail: { stationId, granted },
    })
  );
}

function emitCandidateChanged(candidate: DockPermissionCandidate | null): void {
  window.dispatchEvent(
    new CustomEvent(EVENT_DOCK_PERMISSION_CANDIDATE_CHANGED, {
      detail: { candidate },
    })
  );
}

export function getDockPermissionCandidate(): DockPermissionCandidate | null {
  return activeDockPermissionCandidate;
}

export function setDockPermissionCandidate(candidate: DockPermissionCandidate | null): void {
  const prev = activeDockPermissionCandidate;
  const unchanged =
    prev?.stationId === candidate?.stationId &&
    prev?.dockEntryId === candidate?.dockEntryId &&
    prev?.label === candidate?.label;
  if (unchanged) return;
  activeDockPermissionCandidate = candidate;
  emitCandidateChanged(candidate);
}

export function hasDockPermission(stationId: string | null | undefined): boolean {
  if (!stationId) return false;
  return grantedDockPermissions.has(stationId);
}

export function grantDockPermission(stationId: string): void {
  if (grantedDockPermissions.has(stationId)) return;
  grantedDockPermissions.add(stationId);
  emitPermissionChanged(stationId, true);
}

export function revokeDockPermission(stationId: string): void {
  if (!grantedDockPermissions.has(stationId)) return;
  grantedDockPermissions.delete(stationId);
  emitPermissionChanged(stationId, false);
}

export function clearAllDockPermissions(): void {
  if (grantedDockPermissions.size === 0) return;
  const revoked = Array.from(grantedDockPermissions);
  grantedDockPermissions.clear();
  for (const stationId of revoked) {
    emitPermissionChanged(stationId, false);
  }
}
