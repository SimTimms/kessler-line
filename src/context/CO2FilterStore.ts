import { cargo, reduceCargoItem, addCargoItem } from './Inventory';
import {
  CO2_FILTER_DRAIN_RATE,
  CO2_FILTER_ITEM_ID,
  CO2_NO_FILTER_DEATH_SECONDS,
} from '../config/damageConfig';

// ── Internal state ───────────────────────────────────────────────────────────

/** null = empty slot (no filter installed). */
let installedFilterLevel: number | null = 100;
let spareFilterLevels: number[] = [100, 100];
let co2DeathFired = false;
/** Accumulated seconds without a working filter. */
let noFilterElapsed = 0;

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getCO2FilterLevel(): number | null {
  return installedFilterLevel;
}

export function getSpareFilterLevels(): number[] {
  return spareFilterLevels;
}

export function getSpareFilterCount(): number {
  return spareFilterLevels.length;
}

export function getNoFilterElapsed(): number {
  return noFilterElapsed;
}

export function subscribeCO2Filter(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Call each frame. Degrades the installed filter, syncs spare count with
 * cargo, and fires the O2Depleted death event when the no-filter timer expires.
 */
export function tickCO2Filter(delta: number): void {
  const prevLevel = installedFilterLevel;
  const prevElapsed = noFilterElapsed;

  // Degrade installed filter
  if (installedFilterLevel !== null && installedFilterLevel > 0) {
    installedFilterLevel = Math.max(0, installedFilterLevel - CO2_FILTER_DRAIN_RATE * delta);
  }

  // Sync spares with cargo count (handles eject/trade)
  const cargoSlot = cargo.find((c) => c.name === CO2_FILTER_ITEM_ID);
  const cargoCount = cargoSlot?.quantity ?? 0;
  if (cargoCount < spareFilterLevels.length) {
    // Remove worst (lowest condition) entries to match cargo count
    const sorted = [...spareFilterLevels].sort((a, b) => b - a); // best first
    spareFilterLevels = sorted.slice(0, cargoCount);
  }

  // No-filter / exhausted-filter death timer
  if (installedFilterLevel === null || installedFilterLevel <= 0) {
    noFilterElapsed += delta;
    if (noFilterElapsed >= CO2_NO_FILTER_DEATH_SECONDS && !co2DeathFired) {
      window.dispatchEvent(new Event('O2Depleted'));
      co2DeathFired = true;
    }
  } else {
    noFilterElapsed = 0;
  }

  if (installedFilterLevel !== prevLevel || noFilterElapsed !== prevElapsed) {
    notify();
  }
}

/**
 * Install the best spare filter from cargo into the slot.
 * If a filter is already installed, the old one goes back to spares/cargo.
 * Returns true on success, false if no spares available.
 */
export function installFilterFromCargo(): boolean {
  if (spareFilterLevels.length === 0) return false;

  // Sort descending, pick best
  spareFilterLevels.sort((a, b) => b - a);
  const bestLevel = spareFilterLevels[0];

  if (installedFilterLevel !== null) {
    // Swap: remove best spare, push old installed level back
    spareFilterLevels = [...spareFilterLevels.slice(1), installedFilterLevel];
    // Cargo count stays the same (remove one, add one back)
    reduceCargoItem(CO2_FILTER_ITEM_ID, 1);
    addCargoItem(CO2_FILTER_ITEM_ID, 1);
  } else {
    // Empty slot → just consume one spare from cargo
    spareFilterLevels = spareFilterLevels.slice(1);
    reduceCargoItem(CO2_FILTER_ITEM_ID, 1);
  }

  installedFilterLevel = bestLevel;
  noFilterElapsed = 0;
  co2DeathFired = false;

  notify();
  return true;
}

/**
 * Remove the installed filter and return it to cargo/spares.
 * Returns the removed filter's level, or null if the slot was already empty.
 */
export function removeInstalledFilter(): number | null {
  if (installedFilterLevel === null) return null;

  const removedLevel = installedFilterLevel;
  spareFilterLevels = [...spareFilterLevels, removedLevel];
  addCargoItem(CO2_FILTER_ITEM_ID, 1);
  installedFilterLevel = null;

  notify();
  return removedLevel;
}

/** Full reset for new-game init. Seeds initial cargo with 2 spare filters. */
export function resetCO2Filter(): void {
  installedFilterLevel = 100;
  spareFilterLevels = [100, 100];
  co2DeathFired = false;
  noFilterElapsed = 0;
  addCargoItem(CO2_FILTER_ITEM_ID, 2);
  notify();
}

/** Restore from save data. Does NOT touch cargo (cargo restored separately). */
export function applyCO2FilterState(
  level: number | null,
  spares: number[],
  elapsed = 0,
): void {
  installedFilterLevel = level;
  spareFilterLevels = [...spares];
  noFilterElapsed = elapsed;
  co2DeathFired = level !== null ? level <= 0 : elapsed >= CO2_NO_FILTER_DEATH_SECONDS;
  notify();
}

/** Snapshot for save. */
export function captureCO2FilterState(): {
  level: number | null;
  spares: number[];
  noFilterElapsed: number;
} {
  return {
    level: installedFilterLevel,
    spares: [...spareFilterLevels],
    noFilterElapsed,
  };
}
