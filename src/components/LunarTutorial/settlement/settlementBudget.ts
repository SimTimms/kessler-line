import * as THREE from 'three';
import {
  LUNAR_SETTLEMENT_COVERAGE_REFERENCE,
  LUNAR_SETTLEMENT_DOME_BUILDING_SHARE,
  LUNAR_SETTLEMENT_DOME_COUNT,
  LUNAR_SETTLEMENT_DOME_COUNT_MAX,
  LUNAR_SETTLEMENT_DOME_COUNT_MIN,
  LUNAR_SETTLEMENT_DOME_PARTICLE_SHARE,
  LUNAR_SETTLEMENT_MAX_BUILDINGS,
  LUNAR_SETTLEMENT_MAX_PARTICLES,
  LUNAR_SETTLEMENT_MAX_VEHICLES,
  LUNAR_SETTLEMENT_MIN_DOME_SEPARATION,
} from '../../../config/lunarLandscapeConfig';

export interface SettlementBudget {
  domeCount: number;
  maxDomeBuildings: number;
  maxRoadBuildings: number;
  maxDomeParticles: number;
  maxRoadParticles: number;
  maxVehicles: number;
  minDomeSeparation: number;
}

export function coverageToDomeCount(coverage: number): number {
  const ref = LUNAR_SETTLEMENT_COVERAGE_REFERENCE;
  const refCount = LUNAR_SETTLEMENT_DOME_COUNT;
  if (coverage <= ref) {
    const t = coverage / ref;
    return Math.round(THREE.MathUtils.lerp(LUNAR_SETTLEMENT_DOME_COUNT_MIN, refCount, t));
  }
  const t = (coverage - ref) / (1 - ref);
  return Math.round(
    THREE.MathUtils.lerp(refCount, LUNAR_SETTLEMENT_DOME_COUNT_MAX, Math.pow(t, 0.65))
  );
}

function minSeparationForDomeCount(baseSeparation: number, domeCount: number): number {
  const ref = LUNAR_SETTLEMENT_DOME_COUNT;
  return baseSeparation * Math.sqrt(ref / Math.max(domeCount, 1));
}

export function computeSettlementBudget(
  coverage: number,
  scale: number,
  domeCountOverride?: number
): SettlementBudget {
  const domeCount = domeCountOverride ?? coverageToDomeCount(coverage);
  return {
    domeCount,
    maxDomeBuildings: Math.floor(LUNAR_SETTLEMENT_MAX_BUILDINGS * LUNAR_SETTLEMENT_DOME_BUILDING_SHARE),
    maxRoadBuildings: Math.floor(
      LUNAR_SETTLEMENT_MAX_BUILDINGS * (1 - LUNAR_SETTLEMENT_DOME_BUILDING_SHARE)
    ),
    maxDomeParticles: Math.floor(LUNAR_SETTLEMENT_MAX_PARTICLES * LUNAR_SETTLEMENT_DOME_PARTICLE_SHARE),
    maxRoadParticles: Math.floor(
      LUNAR_SETTLEMENT_MAX_PARTICLES * (1 - LUNAR_SETTLEMENT_DOME_PARTICLE_SHARE)
    ),
    maxVehicles: LUNAR_SETTLEMENT_MAX_VEHICLES,
    minDomeSeparation:
      minSeparationForDomeCount(LUNAR_SETTLEMENT_MIN_DOME_SEPARATION * scale, domeCount) * scale,
  };
}

export function perDomeCap(total: number, domeCount: number): number {
  return Math.max(3, Math.floor(total / Math.max(domeCount, 1)));
}

export function perRoadCap(total: number, roadCount: number): number {
  return Math.max(2, Math.floor(total / Math.max(roadCount, 1)));
}
