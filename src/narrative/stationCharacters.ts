// Station-resident NPCs the player can talk to while docked.
// Each character has a dossier (name, age, place of birth, employer) and is
// linked to a dialogue tree in stationDialogues.ts. STATION_RESIDENTS maps a
// dockable stationId (the value carried on the `ShipDocked` event) to the
// characters aboard that station.

import type { MessagePlatform } from '../context/MessageStore';

export type CharacterRole = 'dockmaster' | 'gangster' | 'merchant' | 'official' | 'drifter';

export interface StationCharacter {
  id: string;
  name: string;
  age: number;
  /** Place of birth — shown in the dossier. */
  birthplace: string;
  /** Employer, if any. Independents leave this undefined. */
  company?: string;
  role: CharacterRole;
  /** Portrait image path. Placeholder art for now; swap for final portraits later. */
  portrait: string;
  /** Short backstory blurb shown on the dossier view. */
  bio?: string;
  /** Comms colour skin for the dialogue panel (REACH cyan, HERALD amber, …). */
  platform?: MessagePlatform;
  /** Links to a tree in STATION_DIALOGUE_TREES. */
  dialogueTreeId: string;
}

export const ROLE_LABELS: Record<CharacterRole, string> = {
  dockmaster: 'Dockmaster',
  gangster: 'Syndicate',
  merchant: 'Merchant',
  official: 'Port Official',
  drifter: 'Drifter',
};

export const STATION_CHARACTERS: Record<string, StationCharacter> = {
  'dockmaster-korr': {
    id: 'dockmaster-korr',
    name: 'Vance Korr',
    age: 54,
    birthplace: 'Ceres, Belt',
    company: 'Helix Port Authority',
    role: 'dockmaster',
    portrait: '/Image_0.jpg',
    bio: 'Thirty years running approach control out of the Belt. Seen every kind of \
hauler limp into a cradle. Runs a tight cycle and remembers a favour — and a slight.',
    platform: 'HERALD',
    dialogueTreeId: 'dockmaster',
  },
};

/** Dockable stationId → character ids aboard. Re-key freely as new docks are added. */
export const STATION_RESIDENTS: Record<string, string[]> = {
  'space-station': ['dockmaster-korr'],
};

export function getStationResidents(stationId: string | null): StationCharacter[] {
  if (!stationId) return [];
  const ids = STATION_RESIDENTS[stationId] ?? [];
  return ids.map((id) => STATION_CHARACTERS[id]).filter((c): c is StationCharacter => !!c);
}

export function getCharacter(id: string): StationCharacter | undefined {
  return STATION_CHARACTERS[id];
}
