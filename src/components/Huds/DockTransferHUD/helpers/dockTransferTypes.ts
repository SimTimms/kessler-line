/** Direction a resource transfer moves between the ship and the docked partner. */
export type TransferDirection = 'toPartner' | 'toShip';

/** A row in the station panel's contacts/jobs directory. */
export interface DirectoryContactItem {
  threadId: string;
  name: string;
  role: string;
  portrait?: string;
  missionFlag?: string;
}

/** Which derelict comms-log record the right column is showing, if any. */
export type SelectedLogEntry =
  | { kind: 'message'; id: string }
  | { kind: 'thread'; shipId: string }
  | { kind: 'dossier' };
