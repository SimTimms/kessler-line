// ── Emergency Battery Store ──────────────────────────────────────────────────
// Module-level store following the CO2FilterStore pattern.
// Manages a single slot that gradually recharges ship power when installed.
// Tracks charge level of each individual battery (installed + spares in cargo).

import { cargo, reduceCargoItem, addCargoItem } from './Inventory';
import { power, setPower } from './ShipState';
import {
  EMERGENCY_BATTERY_ITEM_ID,
  EMERGENCY_BATTERY_CAPACITY,
  EMERGENCY_BATTERY_RECHARGE_RATE,
} from '../config/damageConfig';
import { playBatterySwitch } from '../sound/SoundManager';

// ── Internal state ───────────────────────────────────────────────────────────

/** null = empty slot (no battery installed). 0–CAPACITY = charge remaining. */
let installedBatteryLevel: number | null = null;

/** Charge levels of spare batteries in cargo (one entry per unit). */
let spareBatteryLevels: number[] = [];

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

/** Keep spareBatteryLevels in sync with the actual cargo count. */
function syncSparesWithCargo() {
  const cargoSlot = cargo.find((c) => c.name === EMERGENCY_BATTERY_ITEM_ID);
  const cargoCount = cargoSlot?.quantity ?? 0;
  if (cargoCount < spareBatteryLevels.length) {
    // Batteries removed (eject/trade) — drop the worst-charged entries
    const sorted = [...spareBatteryLevels].sort((a, b) => b - a);
    spareBatteryLevels = sorted.slice(0, cargoCount);
  } else if (cargoCount > spareBatteryLevels.length) {
    // New batteries acquired (trade/pickup) — assume full capacity
    while (spareBatteryLevels.length < cargoCount) {
      spareBatteryLevels.push(EMERGENCY_BATTERY_CAPACITY);
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getInstalledBatteryLevel(): number | null {
  return installedBatteryLevel;
}

export function subscribeEmergencyBattery(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Call each frame. Recharges ship power from the installed battery.
 * Stops when battery is depleted or power reaches 100.
 */
export function tickEmergencyBattery(delta: number): void {
  if (installedBatteryLevel === null || installedBatteryLevel <= 0) return;
  if (power >= 100) return;

  const recharge = Math.min(
    EMERGENCY_BATTERY_RECHARGE_RATE * delta,
    installedBatteryLevel,
    100 - power,
  );

  setPower(power + recharge);
  installedBatteryLevel -= recharge;

  syncSparesWithCargo();
  notify();
}

/**
 * Install the best spare battery from cargo into the slot.
 * If a battery is already installed, the old one goes back to spares/cargo.
 * Returns true on success, false if no spares available.
 */
export function installBatteryFromCargo(): boolean {
  syncSparesWithCargo();
  if (spareBatteryLevels.length === 0) return false;

  // Sort descending, pick best
  spareBatteryLevels.sort((a, b) => b - a);
  const bestLevel = spareBatteryLevels[0];

  if (installedBatteryLevel !== null) {
    // Swap: remove best spare, push old installed level back
    spareBatteryLevels = [...spareBatteryLevels.slice(1), installedBatteryLevel];
    // Cargo count stays the same (remove one, add one back)
    reduceCargoItem(EMERGENCY_BATTERY_ITEM_ID, 1);
    addCargoItem(EMERGENCY_BATTERY_ITEM_ID, 1);
  } else {
    // Empty slot — just consume one spare from cargo
    spareBatteryLevels = spareBatteryLevels.slice(1);
    reduceCargoItem(EMERGENCY_BATTERY_ITEM_ID, 1);
  }

  installedBatteryLevel = bestLevel;

  notify();
  playBatterySwitch();
  return true;
}

/**
 * Remove the installed battery and return it to cargo/spares.
 * Returns the removed battery's remaining level, or null if slot was empty.
 */
export function removeInstalledBattery(): number | null {
  if (installedBatteryLevel === null) return null;

  const removedLevel = installedBatteryLevel;
  spareBatteryLevels = [...spareBatteryLevels, removedLevel];
  addCargoItem(EMERGENCY_BATTERY_ITEM_ID, 1);
  installedBatteryLevel = null;

  notify();
  playBatterySwitch();
  return removedLevel;
}

/** Full reset for new-game init. Seeds 1 full emergency battery in cargo. */
export function resetEmergencyBattery(): void {
  installedBatteryLevel = null;
  spareBatteryLevels = [EMERGENCY_BATTERY_CAPACITY];
  addCargoItem(EMERGENCY_BATTERY_ITEM_ID, 1);
  notify();
}

// ── Save / Restore ───────────────────────────────────────────────────────────

/** Snapshot for save. */
export function captureEmergencyBatteryState(): {
  level: number | null;
  spares: number[];
} {
  return {
    level: installedBatteryLevel,
    spares: [...spareBatteryLevels],
  };
}

/** Restore from save data. Does NOT touch cargo (cargo restored separately). */
export function applyEmergencyBatteryState(
  level: number | null,
  spares: number[] = [],
): void {
  installedBatteryLevel = level;
  spareBatteryLevels = [...spares];
  notify();
}
