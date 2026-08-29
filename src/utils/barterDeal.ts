import { getInventoryItemDef } from '../config/inventoryCatalog';
import { PLAYER_SALVAGED_BY } from '../config/inventoryTypes';
import {
  getItemQuantity,
  getOwnerUnitValue,
  inventoryTaggedQtyMap,
  listInventorySlots,
  transferInventoryItem,
  type InventoryOwnerRef,
} from '../context/InventoryStore';

/** Quantities offered from one side (itemId → qty). */
export type BarterSide = Record<string, number>;

export interface BarterDeal {
  /** Items the player gives to the contact. */
  playerGives: BarterSide;
  /** Items the contact gives to the player. */
  contactGives: BarterSide;
}

export type BarterEval =
  | { kind: 'empty' }
  | { kind: 'insult'; valueIn: number; valueOut: number; ratio: number }
  | { kind: 'accept'; valueIn: number; valueOut: number; ratio: number }
  | { kind: 'counter'; valueIn: number; valueOut: number; ratio: number; deal: BarterDeal };

export interface BarterRatioConfig {
  /** Accept when valueIn / valueOut >= this (contact POV). Default 1. */
  acceptRatio?: number;
  /** Insult when valueIn / valueOut < this. Default 0.4. */
  insultRatio?: number;
  /** Counter aims for this ratio. Default 1.15. */
  counterTargetRatio?: number;
}

const DEFAULT_ACCEPT = 1;
const DEFAULT_INSULT = 0.4;
const DEFAULT_COUNTER_TARGET = 1.15;

export function emptyBarterDeal(): BarterDeal {
  return { playerGives: {}, contactGives: {} };
}

export function cloneBarterDeal(deal: BarterDeal): BarterDeal {
  return {
    playerGives: { ...deal.playerGives },
    contactGives: { ...deal.contactGives },
  };
}

export function clampBarterSide(side: BarterSide, maxByItem: Record<string, number>): BarterSide {
  const next: BarterSide = {};
  for (const [itemId, qty] of Object.entries(side)) {
    const max = Math.max(0, Math.floor(maxByItem[itemId] ?? 0));
    const n = Math.max(0, Math.min(Math.round(qty), max));
    if (n > 0) next[itemId] = n;
  }
  return next;
}

export function clampBarterDeal(
  deal: BarterDeal,
  playerMax: Record<string, number>,
  contactMax: Record<string, number>
): BarterDeal {
  return {
    playerGives: clampBarterSide(deal.playerGives, playerMax),
    contactGives: clampBarterSide(deal.contactGives, contactMax),
  };
}

export function sumBarterSide(side: BarterSide): number {
  return Object.values(side).reduce((sum, qty) => sum + qty, 0);
}

export function isBarterDealEmpty(deal: BarterDeal): boolean {
  return sumBarterSide(deal.playerGives) <= 0 && sumBarterSide(deal.contactGives) <= 0;
}

export function formatBarterSide(side: BarterSide): string {
  const parts = Object.entries(side)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const label = getInventoryItemDef(itemId)?.label ?? itemId;
      return `${qty}× ${label}`;
    });
  return parts.length > 0 ? parts.join(', ') : 'nothing';
}

export function formatBarterDeal(deal: BarterDeal): string {
  return `You give ${formatBarterSide(deal.playerGives)} - They give ${formatBarterSide(deal.contactGives)}`;
}

/** Value of a side from a given owner's supply/demand POV. */
export function valueBarterSide(owner: InventoryOwnerRef, side: BarterSide): number {
  let total = 0;
  for (const [itemId, qty] of Object.entries(side)) {
    if (qty <= 0) continue;
    total += qty * getOwnerUnitValue(owner, itemId);
  }
  return total;
}

/**
 * Contact POV: valueIn = what they receive from player; valueOut = what they give.
 * Fair when valueIn / valueOut is high enough.
 */
export function evaluateBarterDeal(
  deal: BarterDeal,
  player: InventoryOwnerRef,
  contact: InventoryOwnerRef,
  config: BarterRatioConfig = {}
): BarterEval {
  if (isBarterDealEmpty(deal)) return { kind: 'empty' };

  const valueIn = valueBarterSide(contact, deal.playerGives);
  const valueOut = valueBarterSide(contact, deal.contactGives);
  const ratio =
    valueOut <= 0.0001 ? (valueIn > 0 ? Number.POSITIVE_INFINITY : 0) : valueIn / valueOut;

  const acceptRatio = config.acceptRatio ?? DEFAULT_ACCEPT;
  const insultRatio = config.insultRatio ?? DEFAULT_INSULT;

  // One-sided gift from player (contact gives nothing) — accept if they get anything useful.
  if (sumBarterSide(deal.contactGives) <= 0) {
    if (valueIn <= 0) return { kind: 'insult', valueIn, valueOut, ratio };
    return { kind: 'accept', valueIn, valueOut, ratio };
  }

  // Player asking for free goods — insult unless they put something real on the table.
  if (sumBarterSide(deal.playerGives) <= 0) {
    return { kind: 'insult', valueIn, valueOut, ratio };
  }

  if (ratio < insultRatio) return { kind: 'insult', valueIn, valueOut, ratio };
  if (ratio >= acceptRatio) return { kind: 'accept', valueIn, valueOut, ratio };

  return {
    kind: 'counter',
    valueIn,
    valueOut,
    ratio,
    deal: buildCounterDeal(
      deal,
      player,
      contact,
      config.counterTargetRatio ?? DEFAULT_COUNTER_TARGET
    ),
  };
}

/**
 * Nudge the deal toward a fairer ratio for the contact:
 * prefer reducing what they give, then asking for more of demanded player goods.
 */
export function buildCounterDeal(
  proposed: BarterDeal,
  player: InventoryOwnerRef,
  contact: InventoryOwnerRef,
  targetRatio: number
): BarterDeal {
  const deal = cloneBarterDeal(proposed);
  const playerAvail = inventoryQtyMap(player);

  for (let step = 0; step < 40; step++) {
    const valueIn = valueBarterSide(contact, deal.playerGives);
    const valueOut = valueBarterSide(contact, deal.contactGives);
    const ratio = valueOut <= 0.0001 ? Number.POSITIVE_INFINITY : valueIn / valueOut;
    if (ratio >= targetRatio) break;

    // 1) Trim the most valuable (to them) item they're giving.
    const giveEntry = Object.entries(deal.contactGives)
      .filter(([, qty]) => qty > 0)
      .sort(
        (a, b) => getOwnerUnitValue(contact, b[0]) * b[1] - getOwnerUnitValue(contact, a[0]) * a[1]
      )[0];
    if (giveEntry) {
      const [itemId, qty] = giveEntry;
      if (qty > 1) {
        deal.contactGives[itemId] = qty - 1;
      } else {
        delete deal.contactGives[itemId];
      }
      continue;
    }

    // 2) Ask for one more unit of the player's most demanded item they can spare.
    const askEntry = Object.keys(playerAvail)
      .map((itemId) => ({
        itemId,
        desire: getOwnerUnitValue(contact, itemId),
        have: deal.playerGives[itemId] ?? 0,
        max: playerAvail[itemId] ?? 0,
      }))
      .filter((row) => row.have < row.max)
      .sort((a, b) => b.desire - a.desire)[0];
    if (askEntry) {
      deal.playerGives[askEntry.itemId] = askEntry.have + 1;
      continue;
    }

    break;
  }

  return clampBarterDeal(deal, playerAvail, inventoryQtyMap(contact));
}

export function inventoryQtyMap(owner: InventoryOwnerRef): Record<string, number> {
  const map: Record<string, number> = {};
  for (const slot of listInventorySlots(owner)) {
    if (slot.quantity > 0) {
      map[slot.itemId] = (map[slot.itemId] ?? 0) + Math.floor(slot.quantity);
    }
  }
  return map;
}

export interface SalvageClaimConfig {
  /** Max fraction of tagged depot value the player may claim for accept. Default 0.5. */
  playerShareRatio?: number;
  /** When true, fair asks may still be refused. */
  unscrupulous?: boolean;
  /** Session stance — negative makes unscrupulous refuse more likely. */
  tradeStance?: number;
}

/**
 * Claim negotiation: player requests tagged salvage from the depot without offering goods.
 * Scores claim value against total tagged depot value.
 */
export function evaluateSalvageClaimDeal(
  deal: BarterDeal,
  depot: InventoryOwnerRef,
  config: SalvageClaimConfig = {}
): BarterEval {
  if (sumBarterSide(deal.contactGives) <= 0) return { kind: 'empty' };

  const taggedMax = inventoryTaggedQtyMap(depot, PLAYER_SALVAGED_BY);
  const claim = clampBarterSide(deal.contactGives, taggedMax);
  if (sumBarterSide(claim) <= 0) return { kind: 'empty' };

  let taggedTotalValue = 0;
  for (const [itemId, qty] of Object.entries(taggedMax)) {
    taggedTotalValue += qty * getOwnerUnitValue(depot, itemId);
  }
  if (taggedTotalValue <= 0.0001) return { kind: 'empty' };

  const claimValue = valueBarterSide(depot, claim);
  const fraction = claimValue / taggedTotalValue;
  const playerShare = config.playerShareRatio ?? 0.5;

  if (config.unscrupulous) {
    const stance = config.tradeStance ?? 0;
    const refuseChance =
      0.35 + Math.max(0, -stance) * 0.12 + Math.max(0, fraction - playerShare) * 0.55;
    if (Math.random() < Math.min(0.92, refuseChance)) {
      return { kind: 'insult', valueIn: 0, valueOut: claimValue, ratio: 0 };
    }
  }

  if (fraction <= playerShare + 0.001) {
    return { kind: 'accept', valueIn: 0, valueOut: claimValue, ratio: fraction };
  }

  // Soft over-ask → counter down to the fair share.
  if (fraction <= playerShare * 1.45) {
    return {
      kind: 'counter',
      valueIn: 0,
      valueOut: claimValue,
      ratio: fraction,
      deal: {
        playerGives: {},
        contactGives: scaleClaimToShare(claim, depot, taggedTotalValue, playerShare),
      },
    };
  }

  return { kind: 'insult', valueIn: 0, valueOut: claimValue, ratio: fraction };
}

/** Shrink a claim until its value is at most `share` of taggedTotalValue. */
function scaleClaimToShare(
  claim: BarterSide,
  depot: InventoryOwnerRef,
  taggedTotalValue: number,
  share: number
): BarterSide {
  const next: BarterSide = { ...claim };
  const target = taggedTotalValue * share;
  for (let step = 0; step < 80; step++) {
    const value = valueBarterSide(depot, next);
    if (value <= target + 0.0001) break;
    const entry = Object.entries(next)
      .filter(([, qty]) => qty > 0)
      .sort(
        (a, b) => getOwnerUnitValue(depot, b[0]) * b[1] - getOwnerUnitValue(depot, a[0]) * a[1]
      )[0];
    if (!entry) break;
    const [itemId, qty] = entry;
    if (qty > 1) next[itemId] = qty - 1;
    else delete next[itemId];
  }
  return next;
}

/** Transfer tagged claim stacks from depot → player. */
export function commitSalvageClaimDeal(
  deal: BarterDeal,
  player: InventoryOwnerRef,
  depot: InventoryOwnerRef
): { ok: true } | { ok: false; reason: string } {
  const claim = deal.contactGives;
  for (const [itemId, qty] of Object.entries(claim)) {
    if (qty > getItemQuantity(depot, itemId, { salvagedBy: PLAYER_SALVAGED_BY })) {
      return { ok: false, reason: `Depot no longer has enough tagged ${itemId}.` };
    }
  }
  for (const [itemId, qty] of Object.entries(claim)) {
    if (qty > 0) {
      transferInventoryItem(depot, player, itemId, qty, {
        salvagedBy: PLAYER_SALVAGED_BY,
        setSalvagedBy: PLAYER_SALVAGED_BY,
      });
    }
  }
  return { ok: true };
}

/**
 * Execute a mutual deal. Returns false if either side can't cover their offer.
 * Transfer only happens when this succeeds — call only after both parties agree.
 */
export function commitBarterDeal(
  deal: BarterDeal,
  player: InventoryOwnerRef,
  contact: InventoryOwnerRef
): { ok: true } | { ok: false; reason: string } {
  for (const [itemId, qty] of Object.entries(deal.playerGives)) {
    if (qty > getItemQuantity(player, itemId)) {
      return { ok: false, reason: `You no longer have enough ${itemId}.` };
    }
  }
  for (const [itemId, qty] of Object.entries(deal.contactGives)) {
    if (qty > getItemQuantity(contact, itemId)) {
      return { ok: false, reason: `They no longer have enough ${itemId}.` };
    }
  }

  for (const [itemId, qty] of Object.entries(deal.playerGives)) {
    if (qty > 0) transferInventoryItem(player, contact, itemId, qty);
  }
  for (const [itemId, qty] of Object.entries(deal.contactGives)) {
    if (qty > 0) transferInventoryItem(contact, player, itemId, qty);
  }
  return { ok: true };
}
