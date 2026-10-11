import type { MessagePlatform } from '../context/MessageStore';
import type { InventoryBlueprint } from './inventoryTypes';
import { activeMissionRef, completedMissionsRef } from '../context/MissionState';
import { getThread } from '../context/ChatStore';
import type { DockCharacterRole, DockDialogueTree } from '../types/dialogueTypes';
import type { DockConfig } from '../types/dialogueTypes';

export const DOCK_ROLE_LABELS: Record<DockCharacterRole, string> = {
  dockmaster: 'Dockmaster',
  'entente-cordiale-liaison': 'Liaison',
  'communications-chief': 'Communications Chief',
  gangster: 'Syndicate',
  merchant: 'Merchant',
  official: 'Port Official',
  'comms-officer': 'Comms Officer',
  drifter: 'Drifter',
  trader: 'Trader',
  police: 'Security',
  system: 'System',
  quartermaster: 'Quartermaster',
  'capitaine-de-fregate': 'Capitaine de fregate',
  'second-maitre': 'Second-maître',
};

/**
 * Which turn a finished conversation should reopen at, or null to leave it
 * closed. Evaluated against live mission state each time the panel opens.
 */
export function resolveDockDialogueReentry(tree: DockDialogueTree): string | null {
  for (const entry of tree.reentryTurns ?? []) {
    if (!tree.turns[entry.turnId]) continue;
    const activeOk = (entry.whileMissionActive ?? []).every((id) =>
      activeMissionRef.current.includes(id)
    );
    const completedOk = (entry.afterMissionCompleted ?? []).every((id) =>
      completedMissionsRef.current.includes(id)
    );
    if (activeOk && completedOk) return entry.turnId;
  }
  return null;
}

export function hasPendingDockDialogue(threadId: string, tree: DockDialogueTree): boolean {
  const thread = getThread(threadId);
  if (!thread) return false;
  if (thread.currentTurnId !== null) return false;
  return resolveDockDialogueReentry(tree) !== null;
}

/** A person aboard the docked structure, reachable via interior comms. */
export interface DockContact {
  id: string;
  name: string;
  role: DockCharacterRole;
  portrait: string;
  age?: number;
  birthplace?: string;
  company?: string;
  bio?: string;
  platform?: MessagePlatform;
  dialogue: DockDialogueTree;
  inventory?: InventoryBlueprint;
  unscrupulous?: boolean;
  missionId?: string[];
}

/** Optional job-board entry shown alongside dock contacts while docked. */
export interface DockJob {
  id: string;
  title: string;
  summary: string;
  dialogue?: DockDialogueTree;
}

/**
 * Per-dock configuration passed as a prop on `DockingBay`. Each bay carries its
 * own name, resources, crew, and interior comms contacts — no central registry.
 */
/** Landing pads hail and grant dock permission unless a dock overrides these. */
export const DEFAULT_DOCK_HAIL_ACCEPTANCE_CHANCE = 1;
export const DEFAULT_DOCK_REQUEST_ACCEPTANCE_CHANCE = 1;

/** Default dock transfer HUD backdrop when a dock omits `backgroundImage`. */
export const DEFAULT_DOCK_BACKGROUND_IMAGE = '/textures/station.jpg';

/** Runtime registration — `id` matches the bay's `stationId`. */
export type RegisteredDockConfig = DockConfig & { id: string };

export function dockContactThreadId(dockId: string, contactId: string): string {
  return `${dockId}::${contactId}`;
}

export function dockJobThreadId(dockId: string, jobId: string): string {
  return `${dockId}::job::${jobId}`;
}

export function parseDockThreadId(threadId: string): {
  dockId: string;
  contactId?: string;
  jobId?: string;
} | null {
  const jobMatch = /^(.+)::job::(.+)$/.exec(threadId);
  if (jobMatch) return { dockId: jobMatch[1], jobId: jobMatch[2] };
  const contactMatch = /^(.+)::(.+)$/.exec(threadId);
  if (contactMatch) return { dockId: contactMatch[1], contactId: contactMatch[2] };
  return null;
}
