import type { MessagePlatform } from '../context/MessageStore';
import type { DialogueEffect } from '../narrative/dialogueEffects';

export type DockableResourceSlot = {
  amount: number;
  capacity: number;
};

export type DockCharacterRole =
  | 'dockmaster'
  | 'gangster'
  | 'merchant'
  | 'official'
  | 'drifter'
  | 'trader'
  | 'police';

export const DOCK_ROLE_LABELS: Record<DockCharacterRole, string> = {
  dockmaster: 'Dockmaster',
  gangster: 'Syndicate',
  merchant: 'Merchant',
  official: 'Port Official',
  drifter: 'Drifter',
  trader: 'Trader',
  police: 'Security',
};

export interface DockPlayerOption {
  id: string;
  label: string;
  text: string;
  nextTurnId: string | null;
  effects?: DialogueEffect[];
}

export interface DockDialogueTurn {
  id: string;
  npcText: string;
  playerOptions: DockPlayerOption[];
}

/** Branching dialogue tree — defined inline on each dock contact. */
export interface DockDialogueTree {
  id: string;
  openingTurnId: string;
  turns: Record<string, DockDialogueTurn>;
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
export interface DockConfig {
  /** Display name for this dock / station. */
  label: string;
  fuel?: DockableResourceSlot;
  o2?: DockableResourceSlot;
  power?: DockableResourceSlot;
  crew?: DockableResourceSlot;
  /** People the player can talk to while docked (interior comms). */
  contacts?: DockContact[];
  /** Side jobs / contracts posted at this dock. */
  jobBoard?: DockJob[];
}

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
