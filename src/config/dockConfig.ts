import type { MessagePlatform } from '../context/MessageStore';
import type { DialogueEffect } from '../narrative/dialogueEffects';
import type { InventoryBlueprint } from './inventoryTypes';

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

export type DockTradeResourceKind = 'fuel' | 'o2' | 'power' | 'crew';

export const DOCK_ROLE_LABELS: Record<DockCharacterRole, string> = {
  dockmaster: 'Dockmaster',
  gangster: 'Syndicate',
  merchant: 'Merchant',
  official: 'Port Official',
  drifter: 'Drifter',
  trader: 'Trader',
  police: 'Security',
};

export interface DockTradeTurnConfig {
  /**
   * Two-sided cargo barter (player offer ↔ contact offer).
   * When true, the negotiation panel uses inventories instead of fuel/O2/power/crew.
   */
  cargoBarter?: boolean;
  /**
   * Allow contact->player cargo handoff without any player offer.
   * Intended for mission item pickup flows.
   */
  allowAskingWithoutOffer?: boolean;
  /**
   * Claim negotiation over player-tagged salvage in the dock depot.
   * Allows requesting goods without offering first; pulls from dock inventory
   * (via inventoryOwnerId) rather than the contact's personal hold.
   */
  salvageClaim?: boolean;
  /**
   * Max fraction of tagged depot value the player may claim for an accept
   * (salvageClaim). Default 0.5.
   */
  playerShareRatio?: number;
  /** Contact accepts when value received / value given >= this (cargo barter). Default 1. */
  acceptRatio?: number;
  /** Contact insults when value ratio falls below this (cargo barter). Default 0.4. */
  insultRatio?: number;
  /** Contact counters aiming for this value ratio (cargo barter). Default 1.15. */
  counterTargetRatio?: number;
  /** Weighted offer score needed for direct acceptance. */
  acceptThreshold: number;
  /** Offers below this score are treated as insulting lowballs. */
  insultThreshold: number;
  /** Counteroffer multiplier applied to a non-insulting low offer. */
  counterMultiplier: number;
  /** Accept threshold increase per negative stance point. */
  acceptPenaltyPerNegativeStance: number;
  /** Insult threshold increase per negative stance point. */
  insultPenaltyPerNegativeStance: number;
  /** Insult threshold decrease per positive stance point. */
  insultReliefPerPositiveStance: number;
  /** Floor for insult threshold after stance adjustments. */
  minimumInsultThreshold: number;
  /** Per-resource weighting used to score offers. */
  weights?: Partial<Record<DockTradeResourceKind, number>>;
  /** Status line shown when the panel opens. */
  panelStatusOpen: string;
  /** Status line shown when user clears offer. */
  panelStatusCleared: string;
  /** Status line shown for empty offers. */
  panelStatusEmptyOffer: string;
  /** Status line shown when NPC is insulted. */
  panelStatusInsult: string;
  /** Status line shown for accepted offers pending confirmation. */
  panelStatusAccepted: string;
  /** Status line shown when NPC sends a counter. Use `{offer}` token. */
  panelStatusCounter: string;
  /** Status line shown after successful transfer. Use `{offer}` token. */
  panelStatusSuccess: string;
  /** Status line shown when player declines a counteroffer. */
  panelStatusCounterDeclined: string;
  /** NPC line when offer is insulting. */
  npcInsultText: string;
  /** NPC line when offer is accepted. */
  npcAcceptText: string;
  /** NPC line when countering. Use `{offer}` token. */
  npcCounterText: string;
  /** NPC line after transfer completes. */
  npcCompleteText: string;
  /** NPC line after player declines counteroffer. */
  npcCounterDeclinedAckText: string;
  /** Player line when submitting an offer. Use `{offer}` token. */
  playerOfferText: string;
  /** Player line when accepting a direct acceptance. Use `{offer}` token. */
  playerAcceptText: string;
  /** Player line when accepting a counteroffer. Use `{offer}` token. */
  playerCounterAcceptText: string;
  /** Player line when declining a counteroffer. */
  playerCounterDeclineText: string;
}

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
  trade?: DockTradeTurnConfig;
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
  /** Personal hold used for barter / supply-demand with this contact. */
  inventory?: InventoryBlueprint;
  /**
   * When true, claim negotiations are likelier to refuse / hold tagged salvage
   * even when the ask is within a fair share.
   */
  unscrupulous?: boolean;
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
  /**
   * Public URL for the dock transfer HUD background (e.g. `/station.jpg`).
   * Falls back to `/station.jpg` when omitted.
   */
  backgroundImage?: string;
  /**
   * Optional shared inventory bag id. When set, this dock reads/writes
   * `dock:${inventoryOwnerId}` instead of `dock:${id}` so multiple pads can
   * share one depot.
   */
  inventoryOwnerId?: string;
  fuel?: DockableResourceSlot;
  o2?: DockableResourceSlot;
  power?: DockableResourceSlot;
  crew?: DockableResourceSlot;
  /** Shared dock depot / warehouse inventory (separate from contacts). */
  inventory?: InventoryBlueprint;
  /** People the player can talk to while docked (interior comms). */
  contacts?: DockContact[];
  /** Side jobs / contracts posted at this dock. */
  jobBoard?: DockJob[];
}

/** Default dock transfer HUD backdrop when a dock omits `backgroundImage`. */
export const DEFAULT_DOCK_BACKGROUND_IMAGE = '/station.jpg';

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
