import type { SettlementRuntime } from '../config/settlementConfig';
import { SETTLEMENT_BY_ID, SETTLEMENT_BY_OBJECT_ID } from '../config/settlementConfig';
import {
  createSettlementRuntime,
  recomputeSettlementStatus,
  getSettlementBroadcastLines,
  getSettlementDialogueTreeId,
} from '../narrative/settlementRadio';
import {
  clearRadioBroadcastSettlementPatches,
  patchRadioBroadcastSettlement,
} from './RadioBroadcastRegistry';
import { dismissIncomingHail } from './IncomingHailState';

const runtimes = new Map<string, SettlementRuntime>();
const objectIdToSettlementId = new Map<string, string>();

let tickRaf = 0;
let lastTickTime = 0;

function bindSettlementToRadio(runtime: SettlementRuntime): void {
  patchRadioBroadcastSettlement(runtime.def.objectId, {
    getDialogue: () => getSettlementBroadcastLines(runtime),
    getDialogueTreeId: () => getSettlementDialogueTreeId(runtime),
    isHailEnabled: () => runtime.status !== 'dead',
  });
}

function applyConsumptionTick(runtime: SettlementRuntime): void {
  const { consumption, simulation } = runtime.def;
  const pop = runtime.population;

  runtime.food = Math.max(0, runtime.food - pop * consumption.foodPerPerson);
  runtime.water = Math.max(0, runtime.water - pop * consumption.waterPerPerson);
  runtime.air = Math.max(0, runtime.air - pop * consumption.airPerPerson);

  if (runtime.food <= 0) {
    runtime.starvationElapsedSec += simulation.tickIntervalSec;
    if (runtime.starvationElapsedSec >= simulation.starvationGraceSec) {
      runtime.population = Math.max(
        0,
        runtime.population - simulation.starvationDeathsPerTick
      );
    }
  } else {
    runtime.starvationElapsedSec = 0;
  }

  const prevStatus = runtime.status;
  recomputeSettlementStatus(runtime);

  if (runtime.status === 'desperate' || runtime.status === 'starving') {
    runtime.violence = Math.min(100, runtime.violence + 1);
  } else if (runtime.status === 'strained') {
    runtime.violence = Math.min(100, runtime.violence + 0.25);
  }

  if (runtime.status !== prevStatus) {
    if (runtime.status === 'dead') {
      dismissIncomingHail(runtime.def.objectId);
    }
    window.dispatchEvent(
      new CustomEvent('SettlementUpdated', { detail: { id: runtime.def.id, status: runtime.status } })
    );
  }
}

function tickAllSettlements(deltaSec: number): void {
  for (const runtime of runtimes.values()) {
    if (runtime.status === 'dead') continue;

    runtime.tickAccumulatorSec += deltaSec;
    const interval = runtime.def.simulation.tickIntervalSec;

    while (runtime.tickAccumulatorSec >= interval) {
      runtime.tickAccumulatorSec -= interval;
      applyConsumptionTick(runtime);
    }
  }
}

function ensureTickLoop(): void {
  if (tickRaf) return;
  lastTickTime = performance.now();

  const step = () => {
    const now = performance.now();
    const deltaSec = (now - lastTickTime) / 1000;
    lastTickTime = now;

    if (runtimes.size > 0) {
      tickAllSettlements(deltaSec);
    }

    tickRaf = requestAnimationFrame(step);
  };

  tickRaf = requestAnimationFrame(step);
}

function stopTickLoopIfEmpty(): void {
  if (runtimes.size === 0 && tickRaf) {
    cancelAnimationFrame(tickRaf);
    tickRaf = 0;
  }
}

export function registerSettlement(settlementId: string): void {
  const def = SETTLEMENT_BY_ID[settlementId];
  if (!def || runtimes.has(settlementId)) return;

  const runtime = createSettlementRuntime(def);
  runtimes.set(settlementId, runtime);
  objectIdToSettlementId.set(def.objectId, settlementId);
  bindSettlementToRadio(runtime);
  ensureTickLoop();
}

export function registerSettlementForObject(objectId: string): void {
  const def = SETTLEMENT_BY_OBJECT_ID[objectId];
  if (!def) return;
  registerSettlement(def.id);
}

export function unregisterSettlement(settlementId: string): void {
  const runtime = runtimes.get(settlementId);
  if (!runtime) return;

  runtimes.delete(settlementId);
  objectIdToSettlementId.delete(runtime.def.objectId);
  clearRadioBroadcastSettlementPatches(runtime.def.objectId);
  stopTickLoopIfEmpty();
}

export function unregisterSettlementForObject(objectId: string): void {
  const settlementId = objectIdToSettlementId.get(objectId);
  if (settlementId) unregisterSettlement(settlementId);
}

export function getSettlementRuntime(settlementId: string): SettlementRuntime | undefined {
  return runtimes.get(settlementId);
}

export function getSettlementByObjectId(objectId: string): SettlementRuntime | undefined {
  const settlementId = objectIdToSettlementId.get(objectId);
  if (!settlementId) return undefined;
  return runtimes.get(settlementId);
}

export function resetSettlement(settlementId: string): void {
  const def = SETTLEMENT_BY_ID[settlementId];
  if (!def) return;

  const runtime = createSettlementRuntime(def);
  runtimes.set(settlementId, runtime);
  objectIdToSettlementId.set(def.objectId, settlementId);
  bindSettlementToRadio(runtime);
  ensureTickLoop();
}

export function resetAllSettlements(): void {
  for (const settlementId of [...runtimes.keys()]) {
    resetSettlement(settlementId);
  }
}
