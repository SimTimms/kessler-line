// ── Air Canister Store ───────────────────────────────────────────────────────
// Module-level store following the CO2FilterStore pattern.
// Manages a single slot that gradually recharges ship air when installed.
// Tracks charge level of each individual air canister (installed + spares in cargo).

import { cargo, reduceCargoItem, addCargoItem } from './Inventory';
import { o2, setO2 } from './ShipState';
import {
  AIR_CANISTER_ITEM_ID,
  AIR_CANISTER_CAPACITY,
  AIR_CANISTER_RECHARGE_RATE,
} from '../config/damageConfig';

// ── Internal state ───────────────────────────────────────────────────────────

/** null = empty slot (no air canister installed). 0–CAPACITY = charge remaining. */
let installedAirCanisterLevel: number | null = null;

/** Charge levels of spare air canisters in cargo (one entry per unit). */
let spareAirCanisterLevels: number[] = [];

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

/** Keep spareAirCanisterLevels in sync with the actual cargo count. */
function syncSparesWithCargo() {
  const cargoSlot = cargo.find((c) => c.name === AIR_CANISTER_ITEM_ID);
  const cargoCount = cargoSlot?.quantity ?? 0;
  if (cargoCount < spareAirCanisterLevels.length) {
    // Canisters removed (eject/trade) — drop the worst-charged entries
    const sorted = [...spareAirCanisterLevels].sort((a, b) => b - a);
    spareAirCanisterLevels = sorted.slice(0, cargoCount);
  } else if (cargoCount > spareAirCanisterLevels.length) {
    // New canisters acquired (trade/pickup) — assume full capacity
    while (spareAirCanisterLevels.length < cargoCount) {
      spareAirCanisterLevels.push(AIR_CANISTER_CAPACITY);
    }
  }
}

export function getInstalledAirCanisterLevel(): number | null {
  return installedAirCanisterLevel;
}

export function subscribeAirCanister(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function tickAirCanister(delta: number): void {
  if (installedAirCanisterLevel === null || installedAirCanisterLevel <= 0) return;
  if (o2 >= 100) return;

  const recharge = Math.min(
    AIR_CANISTER_RECHARGE_RATE * delta,
    installedAirCanisterLevel,
    100 - o2
  );

  setO2(o2 + recharge);
  installedAirCanisterLevel -= recharge;

  syncSparesWithCargo();
  notify();
}

/**
 * Install the best spare air canister from cargo into the slot.
 * If an air canister is already installed, the old one goes back to spares/cargo.
 * Returns true on success, false if no spares available.
 */
export function installAirCanisterFromCargo(): boolean {
  syncSparesWithCargo();
  if (spareAirCanisterLevels.length === 0) return false;

  // Sort descending, pick best
  spareAirCanisterLevels.sort((a, b) => b - a);
  const bestLevel = spareAirCanisterLevels[0];

  if (installedAirCanisterLevel !== null) {
    // Swap: remove best spare, push old installed level back
    spareAirCanisterLevels = [...spareAirCanisterLevels.slice(1), installedAirCanisterLevel];
    // Cargo count stays the same (remove one, add one back)
    reduceCargoItem(AIR_CANISTER_ITEM_ID, 1);
    addCargoItem(AIR_CANISTER_ITEM_ID, 1);
  } else {
    // Empty slot — just consume one spare from cargo
    spareAirCanisterLevels = spareAirCanisterLevels.slice(1);
    reduceCargoItem(AIR_CANISTER_ITEM_ID, 1);
  }

  installedAirCanisterLevel = bestLevel;

  notify();
  return true;
}

/**
 * Remove the installed air canister and return it to cargo/spares.
 * Returns the removed air canister's remaining level, or null if slot was empty.
 */
export function removeInstalledAirCanister(): number | null {
  if (installedAirCanisterLevel === null) return null;

  const removedLevel = installedAirCanisterLevel;
  spareAirCanisterLevels = [...spareAirCanisterLevels, removedLevel];
  addCargoItem(AIR_CANISTER_ITEM_ID, 1);
  installedAirCanisterLevel = null;

  notify();
  return removedLevel;
}

/** Full reset for new-game init. Seeds 1 full air canister in cargo. */
export function resetAirCanister(): void {
  installedAirCanisterLevel = null;
  spareAirCanisterLevels = [AIR_CANISTER_CAPACITY];
  addCargoItem(AIR_CANISTER_ITEM_ID, 1);
  notify();
}

// ── Save / Restore ───────────────────────────────────────────────────────────

/** Snapshot for save. */
export function captureAirCanisterState(): {
  level: number | null;
  spares: number[];
} {
  return {
    level: installedAirCanisterLevel,
    spares: [...spareAirCanisterLevels],
  };
}

/** Restore from save data. Does NOT touch cargo (cargo restored separately). */
export function applyAirCanisterState(level: number | null, spares: number[] = []): void {
  installedAirCanisterLevel = level;
  spareAirCanisterLevels = [...spares];
  notify();
}
