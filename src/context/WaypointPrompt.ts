import type { WorldObjectDef } from '../config/worldConfig';

/** Set this before dispatching 'open-minimap' to show a waypoint confirmation in the minimap. */
export const waypointPromptDef: { current: WorldObjectDef | null } = { current: null };
