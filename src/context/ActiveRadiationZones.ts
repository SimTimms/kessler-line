import type { RadiationZoneDef } from '../config/radiationConfig';
import {
  RADIATION_ZONES as MAIN_RADIATION_ZONES,
  RADIATION_HULL_DRAIN_RATE as MAIN_RADIATION_HULL_DRAIN_RATE,
} from '../config/radiationConfig';

/** Zones used by RadiationZones visuals and applyRadiationDamage — swap per scene (e.g. tutorial). */
export const activeRadiationZonesRef: { current: RadiationZoneDef[] } = {
  current: MAIN_RADIATION_ZONES,
};

/** Hull drain rate (HP/s per unit exposure) — swap with zones for tutorial tuning. */
export const activeRadiationHullDrainRateRef: { current: number } = {
  current: MAIN_RADIATION_HULL_DRAIN_RATE,
};
