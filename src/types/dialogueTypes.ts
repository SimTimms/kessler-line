import type { MessagePlatform } from '../context/MessageStore';
import type { DialogueEffect } from '../narrative/dialogueEffects';
import type { InventoryBlueprint } from '../config/inventoryTypes';
import type { DockContact } from '../config/dockConfig';

export interface DockJob {
  id: string;
  title: string;
  summary: string;
  dialogue?: DockDialogueTree;
}

export type DockTradeResourceKind = 'fuel' | 'o2' | 'power' | 'crew';

export type DockableResourceSlot = {
  amount: number;
  capacity: number;
};

export type DockCharacterRole =
  | 'dockmaster'
  | 'entente-cordiale-liaison'
  | 'communications-chief'
  | 'gangster'
  | 'merchant'
  | 'official'
  | 'comms-officer'
  | 'drifter'
  | 'trader'
  | 'system'
  | 'quartermaster'
  | 'capitaine-de-fregate'
  | 'second-maitre'
  | 'police';

export interface DockConfig {
  label: string;
  hailAcceptanceChance?: number;
  dockRequestAcceptanceChance?: number;
  backgroundImage?: string;
  inventoryOwnerId?: string;
  fuel?: DockableResourceSlot;
  o2?: DockableResourceSlot;
  power?: DockableResourceSlot;
  crew?: DockableResourceSlot;
  inventory?: InventoryBlueprint;
  contacts?: DockContact[];
  jobBoard?: DockJob[];
}

export interface DockTradeTurnConfig {
  cargoBarter?: boolean;
  allowAskingWithoutOffer?: boolean;
  contactOffersAll?: boolean;
  salvageClaim?: boolean;
  playerShareRatio?: number;
  acceptRatio?: number;
  insultRatio?: number;
  counterTargetRatio?: number;
  acceptThreshold: number;
  insultThreshold: number;
  counterMultiplier: number;
  acceptPenaltyPerNegativeStance: number;
  insultPenaltyPerNegativeStance: number;
  insultReliefPerPositiveStance: number;
  minimumInsultThreshold: number;
  weights?: Partial<Record<DockTradeResourceKind, number>>;
  panelStatusOpen: string;
  panelStatusCleared: string;
  panelStatusEmptyOffer: string;
  panelStatusInsult: string;
  panelStatusAccepted: string;
  panelStatusCounter: string;
  panelStatusSuccess: string;
  panelStatusCounterDeclined: string;
  npcInsultText: string;
  npcAcceptText: string;
  npcCounterText: string;
  npcCompleteText: string;
  npcCounterDeclinedAckText: string;
  onCompleteEffects?: DialogueEffect[];
  playerOfferText: string;
  playerAcceptText: string;
  playerCounterAcceptText: string;
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
  audio?: string;
}

export interface DockDialogueReentry {
  turnId: string;
  whileMissionActive?: string[];
  afterMissionCompleted?: string[];
}

export interface DockDialogueTree {
  id: string;
  openingTurnId: string;
  reentryTurns?: DockDialogueReentry[];
  turns: Record<string, DockDialogueTurn>;
}

export interface DialogueTree {
  id: string;
  captainName: string;
  vesselName: string;
  openingTurnId: string;
  audioFile?: string;
  kind?: 'radio' | 'inbox' | 'broadcast';
  from?: string;
  subject?: string;
  platform?: MessagePlatform;
  senderLocationId?: string;
  audioVoice?: string;
  turns: Record<string, DialogueTurn>;
}

export interface PlayerOption {
  id: string;
  label: string;
  text: string;
  nextTurnId: string | null;
  deliveryNote?: string;
}

export interface DialogueTurn {
  id: string;
  npcText: string;
  playerOptions: PlayerOption[];
}

