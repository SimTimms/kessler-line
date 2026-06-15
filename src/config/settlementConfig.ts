/** Static definitions for tracked settlements keyed by settlement id. */

export type SettlementStatus =
  | 'stable'
  | 'strained'
  | 'desperate'
  | 'starving'
  | 'dead';

export interface SettlementResourcePools {
  food: number;
  water: number;
  air: number;
}

export interface SettlementConsumptionRates {
  /** Units consumed per person per simulation tick. */
  foodPerPerson: number;
  waterPerPerson: number;
  airPerPerson: number;
}

export interface SettlementSimulationConfig {
  /** Real seconds between resource consumption ticks. */
  tickIntervalSec: number;
  /** Fraction of initial pool (0–1) below which a resource counts as low. */
  lowResourceFraction: number;
  /** Seconds with zero food before population decline begins. */
  starvationGraceSec: number;
  /** Population lost each tick while starving. */
  starvationDeathsPerTick: number;
}

export interface SettlementDef {
  id: string;
  /** Scannable / radio broadcast object id this settlement is attached to. */
  objectId: string;
  label: string;
  faction: string;
  stationCount: number;
  population: number;
  /** 0–100 stress / unrest level. */
  violence: number;
  resources: SettlementResourcePools;
  consumption: SettlementConsumptionRates;
  simulation: SettlementSimulationConfig;
  /** Fallback hail dialogue when no urgent need is active. */
  dialogueTreeId?: string;
}

export interface SettlementRuntime {
  def: SettlementDef;
  food: number;
  water: number;
  air: number;
  population: number;
  violence: number;
  status: SettlementStatus;
  starvationElapsedSec: number;
  tickAccumulatorSec: number;
}

export const SETTLEMENT_DEFS: SettlementDef[] = [
  {
    id: 'mineral-asteroid-settlement',
    objectId: 'mineral-asteroid',
    label: 'AST-47718',
    faction: 'Outer Belt Independents',
    stationCount: 1,
    population: 48,
    violence: 12,
    resources: { food: 100, water: 120, air: 200 },
    consumption: {
      foodPerPerson: 0.25,
      waterPerPerson: 0.18,
      airPerPerson: 0.08,
    },
    simulation: {
      tickIntervalSec: 8,
      lowResourceFraction: 0.25,
      starvationGraceSec: 45,
      starvationDeathsPerTick: 2,
    },
    dialogueTreeId: 'mineral-asteroid-hail',
  },
];

export const SETTLEMENT_BY_ID = Object.fromEntries(
  SETTLEMENT_DEFS.map((def) => [def.id, def])
) as Record<string, SettlementDef>;

export const SETTLEMENT_BY_OBJECT_ID = Object.fromEntries(
  SETTLEMENT_DEFS.map((def) => [def.objectId, def])
) as Record<string, SettlementDef>;

export const MINERAL_ASTEROID_SETTLEMENT_ID = 'mineral-asteroid-settlement';
