import type { SettlementRuntime, SettlementStatus } from '../config/settlementConfig';

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  stable: 'OPERATIONAL',
  strained: 'STRAINED',
  desperate: 'DESPERATE',
  starving: 'STARVATION EVENT',
  dead: 'DEAD',
};

export interface SettlementInfoSnapshot {
  label: string;
  faction: string;
  stationCount: number;
  population: number;
  initialPopulation: number;
  violence: number;
  foodPct: number;
  waterPct: number;
  airPct: number;
  status: SettlementStatus;
  statusLabel: string;
}

function resourcePct(runtime: SettlementRuntime, key: 'food' | 'water' | 'air'): number {
  const initial = runtime.def.resources[key];
  if (initial <= 0) return 0;
  return Math.round((runtime[key] / initial) * 100);
}

export function getSettlementInfoSnapshot(runtime: SettlementRuntime): SettlementInfoSnapshot {
  const { def, status, population, violence } = runtime;
  return {
    label: def.label,
    faction: def.faction,
    stationCount: def.stationCount,
    population,
    initialPopulation: def.population,
    violence: Math.round(violence),
    foodPct: resourcePct(runtime, 'food'),
    waterPct: resourcePct(runtime, 'water'),
    airPct: resourcePct(runtime, 'air'),
    status,
    statusLabel: SETTLEMENT_STATUS_LABELS[status],
  };
}

function resourceLevelClass(pct: number): string {
  if (pct <= 0) return 'critical';
  if (pct <= 25) return 'low';
  return 'ok';
}

export function getSettlementResourceLevelClass(pct: number): string {
  return resourceLevelClass(pct);
}
