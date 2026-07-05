// Dialogue trees are defined inline on each dock's `contacts` / `jobBoard` entries.
// See config/docks/ for examples.

export type {
  DockDialogueTree as StationDialogueTree,
  DockDialogueTurn as StationDialogueTurn,
  DockPlayerOption as StationPlayerOption,
} from '../config/dockConfig';

export { DOCKMASTER_DIALOGUE } from '../config/docks/spaceStationDockConfig';

/** @deprecated Trees are inline on dock contacts — kept for any legacy id lookups. */
export function getStationDialogueTree(_id: string) {
  return undefined;
}
