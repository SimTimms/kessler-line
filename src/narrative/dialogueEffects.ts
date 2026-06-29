// Dialogue effects engine. Player choices in a station dialogue tree can carry
// `effects` — state changes applied when the option is chosen. Negative outcomes
// (theft, hull damage) are chance-based: each effect rolls its optional `chance`
// (0–1; omitted = always fires). applyDialogueEffects() mutates the existing game
// stores and returns human-readable outcome lines for the conversation to show.

import { cargo, setCargo, reduceCargoItem, type CargoItem } from '../context/Inventory';
import { fuel, o2, power, setFuel, setO2, setPower, damageHull } from '../context/ShipState';
import { addMessage, type MessagePlatform } from '../context/MessageStore';

type ShipResource = 'fuel' | 'o2' | 'power';

export type DialogueEffect =
  /** Add (positive) or remove (negative) a ship resource, clamped to 0–100. */
  | { type: 'transferResource'; resource: ShipResource; amount: number; chance?: number; resultText?: string; failText?: string }
  /** Add cargo to the hold. */
  | { type: 'giveCargo'; item: string; qty: number; chance?: number; resultText?: string; failText?: string }
  /** Remove a named cargo item from the hold. */
  | { type: 'takeCargo'; item: string; qty: number; chance?: number; resultText?: string; failText?: string }
  /** Steal from a random cargo line (defaults to the largest stack). */
  | { type: 'stealCargo'; qty?: number; chance?: number; resultText?: string; failText?: string }
  /** Apply hull damage. */
  | { type: 'damageHull'; amount: number; chance?: number; resultText?: string; failText?: string }
  /** Drop an inbox message / share a piece of information. */
  | { type: 'shareInfo'; from?: string; subject?: string; text: string; platform?: MessagePlatform; chance?: number; resultText?: string; failText?: string };

export interface EffectOutcome {
  /** True if the effect's chance roll succeeded and the state change was applied. */
  fired: boolean;
  /** Line to surface in the conversation, or null to stay silent. */
  text: string | null;
}

const SHIP_RESOURCE_SETTERS: Record<ShipResource, (v: number) => void> = {
  fuel: setFuel,
  o2: setO2,
  power: setPower,
};
const SHIP_RESOURCE_VALUES: Record<ShipResource, () => number> = {
  fuel: () => fuel,
  o2: () => o2,
  power: () => power,
};

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function addCargo(item: string, qty: number): void {
  const existing = cargo.find((c) => c.name === item);
  const next: CargoItem[] = existing
    ? cargo.map((c) => (c.name === item ? { ...c, quantity: c.quantity + qty } : c))
    : [...cargo, { name: item, quantity: qty }];
  setCargo(next);
}

/** Apply one effect, returning whether it fired and an optional outcome line. */
function applyOne(effect: DialogueEffect): EffectOutcome {
  const chance = effect.chance ?? 1;
  if (Math.random() > chance) {
    return { fired: false, text: effect.failText ?? null };
  }

  switch (effect.type) {
    case 'transferResource': {
      const current = SHIP_RESOURCE_VALUES[effect.resource]();
      SHIP_RESOURCE_SETTERS[effect.resource](clamp100(current + effect.amount));
      const verb = effect.amount >= 0 ? 'topped up' : 'drew down';
      return {
        fired: true,
        text: effect.resultText ?? `${effect.resource.toUpperCase()} ${verb} by ${Math.abs(effect.amount)}.`,
      };
    }
    case 'giveCargo': {
      addCargo(effect.item, effect.qty);
      return { fired: true, text: effect.resultText ?? `Received ${effect.qty}× ${effect.item}.` };
    }
    case 'takeCargo': {
      reduceCargoItem(effect.item, effect.qty);
      return { fired: true, text: effect.resultText ?? `Handed over ${effect.qty}× ${effect.item}.` };
    }
    case 'stealCargo': {
      if (cargo.length === 0) {
        return { fired: false, text: effect.failText ?? null };
      }
      // Hit the largest stack so the loss is felt.
      const target = cargo.reduce((a, b) => (b.quantity > a.quantity ? b : a));
      const qty = Math.min(effect.qty ?? target.quantity, target.quantity);
      reduceCargoItem(target.name, qty);
      return { fired: true, text: effect.resultText ?? `${qty}× ${target.name} went missing from the hold.` };
    }
    case 'damageHull': {
      damageHull(effect.amount);
      return { fired: true, text: effect.resultText ?? `Hull took ${effect.amount} damage.` };
    }
    case 'shareInfo': {
      addMessage({
        id: `station-info-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        from: effect.from ?? 'Port Records',
        subject: effect.subject ?? 'Shared intel',
        body: effect.text,
        platform: effect.platform ?? 'REACH',
      });
      return { fired: true, text: effect.resultText ?? 'Logged to your inbox.' };
    }
    default:
      return { fired: false, text: null };
  }
}

/** Apply a list of effects in order, returning the outcomes for display. */
export function applyDialogueEffects(effects: DialogueEffect[] | undefined): EffectOutcome[] {
  if (!effects || effects.length === 0) return [];
  return effects.map(applyOne);
}
