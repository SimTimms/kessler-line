import type { SettlementDef, SettlementRuntime, SettlementStatus } from '../config/settlementConfig';
import {
  MINERAL_ASTEROID_HAIL_FOOD_DESPERATE_TREE_ID,
  MINERAL_ASTEROID_HAIL_FOOD_LOW_TREE_ID,
  MINERAL_ASTEROID_HAIL_FOOD_STARVING_TREE_ID,
  MINERAL_ASTEROID_HAIL_WATER_LOW_TREE_ID,
} from './broadcastDialogues';

export type SettlementNeed = 'food' | 'water' | 'air';

function resourceFraction(runtime: SettlementRuntime, key: SettlementNeed): number {
  const initial = runtime.def.resources[key];
  if (initial <= 0) return 0;
  return runtime[key] / initial;
}

function isResourceLow(runtime: SettlementRuntime, key: SettlementNeed): boolean {
  const frac = resourceFraction(runtime, key);
  return frac > 0 && frac <= runtime.def.simulation.lowResourceFraction;
}

export function getPrimarySettlementNeed(runtime: SettlementRuntime): SettlementNeed | null {
  if (runtime.status === 'dead') return null;

  const checks: SettlementNeed[] = ['food', 'water', 'air'];
  for (const key of checks) {
    if (runtime[key] <= 0) return key;
  }
  for (const key of checks) {
    if (isResourceLow(runtime, key)) return key;
  }
  return null;
}

function formatResourcePct(runtime: SettlementRuntime, key: SettlementNeed): string {
  return `${Math.round(resourceFraction(runtime, key) * 100)}%`;
}

export function getSettlementBroadcastLines(runtime: SettlementRuntime): string[] {
  const { def, status, population } = runtime;
  const label = def.label;
  const need = getPrimarySettlementNeed(runtime);

  if (status === 'dead') {
    return [
      `AUTOMATED BEACON — ${label}.`,
      'BIO-SIGNATURE ZERO. STATION SILENT.',
      'NO CREW RESPONSE. SIGNAL REPEATING.',
    ];
  }

  if (status === 'starving') {
    return [
      `EMERGENCY HAIL — ${label}.`,
      'STARVATION EVENT IN PROGRESS. CREW CASUALTIES REPORTED.',
      `POPULATION: ${population}. FOOD RESERVES: DEPLETED.`,
    ];
  }

  if (need === 'food' && (status === 'desperate' || runtime.food <= 0)) {
    return [
      `EMERGENCY HAIL — ${label}.`,
      'CRITICAL FOOD SHORTAGE. REQUESTING SUPPLY DROP.',
      `POPULATION: ${population}. FOOD RESERVES: DEPLETED.`,
    ];
  }

  if (need === 'food') {
    return [
      `HAIL — ${label}.`,
      'LOW FOOD RESERVES. REQUESTING SUPPLEMENTAL RATIONS.',
      `POPULATION: ${population}. FOOD: ${formatResourcePct(runtime, 'food')}.`,
    ];
  }

  if (need === 'water' && runtime.water <= 0) {
    return [
      `EMERGENCY HAIL — ${label}.`,
      'WATER RESERVES DEPLETED. REQUESTING EMERGENCY SUPPLY.',
      `POPULATION: ${population}. WATER: DEPLETED.`,
    ];
  }

  if (need === 'water') {
    return [
      `HAIL — ${label}.`,
      'LOW WATER RESERVES. REQUESTING SUPPLEMENTAL SUPPLY.',
      `POPULATION: ${population}. WATER: ${formatResourcePct(runtime, 'water')}.`,
    ];
  }

  if (need === 'air' && runtime.air <= 0) {
    return [
      `EMERGENCY HAIL — ${label}.`,
      'ATMOSPHERE CRITICAL. REQUESTING EMERGENCY O2 SUPPLY.',
      `POPULATION: ${population}. AIR: DEPLETED.`,
    ];
  }

  if (need === 'air') {
    return [
      `HAIL — ${label}.`,
      'LOW ATMOSPHERE RESERVES. REQUESTING SUPPLEMENTAL O2.',
      `POPULATION: ${population}. AIR: ${formatResourcePct(runtime, 'air')}.`,
    ];
  }

  return [
    `AUTOMATED BEACON — ${label}.`,
    `MINING COLONY ONLINE. FACTION: ${def.faction}.`,
    `POPULATION: ${population}. STATIONS: ${def.stationCount}.`,
  ];
}

export function getSettlementDialogueTreeId(runtime: SettlementRuntime): string | undefined {
  if (runtime.status === 'dead') return undefined;

  const need = getPrimarySettlementNeed(runtime);
  const { status } = runtime;

  if (need === 'food') {
    if (status === 'starving') return MINERAL_ASTEROID_HAIL_FOOD_STARVING_TREE_ID;
    if (status === 'desperate' || runtime.food <= 0) return MINERAL_ASTEROID_HAIL_FOOD_DESPERATE_TREE_ID;
    return MINERAL_ASTEROID_HAIL_FOOD_LOW_TREE_ID;
  }

  if (need === 'water') return MINERAL_ASTEROID_HAIL_WATER_LOW_TREE_ID;

  return runtime.def.dialogueTreeId;
}

export function getSettlementHailPreview(
  runtime: SettlementRuntime
): { header: string; body: string } | undefined {
  if (runtime.status === 'dead') return undefined;

  const need = getPrimarySettlementNeed(runtime);
  const label = runtime.def.label;

  if (runtime.status === 'starving') {
    return {
      header: 'INCOMING HAIL — CRITICAL',
      body: `${label}: Starvation in progress. Crew casualties mounting. We need food immediately.`,
    };
  }

  if (need === 'food' && (runtime.status === 'desperate' || runtime.food <= 0)) {
    return {
      header: 'INCOMING HAIL — URGENT',
      body: `${label}: Food reserves depleted. Requesting emergency rations.`,
    };
  }

  if (need === 'food') {
    return {
      header: 'INCOMING HAIL',
      body: `${label}: Running low on food. Can you spare rations?`,
    };
  }

  if (need === 'water') {
    return {
      header: 'INCOMING HAIL',
      body: `${label}: Water reserves critical. Requesting supplemental supply.`,
    };
  }

  if (need === 'air') {
    return {
      header: 'INCOMING HAIL',
      body: `${label}: Atmosphere reserves low. Requesting O2 supply.`,
    };
  }

  return {
    header: 'INCOMING HAIL',
    body: label,
  };
}

export function recomputeSettlementStatus(runtime: SettlementRuntime): SettlementStatus {
  const { simulation } = runtime.def;

  if (runtime.population <= 0) {
    runtime.status = 'dead';
    return runtime.status;
  }

  if (runtime.food <= 0 && runtime.starvationElapsedSec >= simulation.starvationGraceSec) {
    runtime.status = 'starving';
    return runtime.status;
  }

  if (
    runtime.food <= 0 ||
    runtime.water <= 0 ||
    runtime.air <= 0
  ) {
    runtime.status = 'desperate';
    return runtime.status;
  }

  const lowFood = isResourceLow(runtime, 'food');
  const lowWater = isResourceLow(runtime, 'water');
  const lowAir = isResourceLow(runtime, 'air');

  if (lowFood || lowWater || lowAir) {
    runtime.status = 'strained';
    return runtime.status;
  }

  runtime.status = 'stable';
  return runtime.status;
}

export function createSettlementRuntime(def: SettlementDef): SettlementRuntime {
  const runtime: SettlementRuntime = {
    def,
    food: def.resources.food,
    water: def.resources.water,
    air: def.resources.air,
    population: def.population,
    violence: def.violence,
    status: 'stable',
    starvationElapsedSec: 0,
    tickAccumulatorSec: 0,
  };
  recomputeSettlementStatus(runtime);
  return runtime;
}
