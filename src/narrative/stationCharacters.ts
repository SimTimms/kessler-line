// Back-compat re-exports — dock contacts and dialogue trees now live inline on each
// DockingBay's `dock` prop (see config/dockConfig.ts and config/docks/).

export type { DockContact as StationCharacter, DockCharacterRole as CharacterRole } from '../config/dockConfig';
export { DOCK_ROLE_LABELS as ROLE_LABELS } from '../config/dockConfig';
import { getDockContacts } from '../context/DockablePartnerStore';

export { getDockContact as getCharacter } from '../context/DockablePartnerStore';

export function getStationResidents(stationId: string | null) {
  if (!stationId) return [];
  return getDockContacts(stationId);
}
