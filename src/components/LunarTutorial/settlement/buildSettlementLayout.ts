import * as THREE from 'three';
import {
  LUNAR_SETTLEMENT_ROAD_SEGMENTS,
  LUNAR_SETTLEMENT_SEED,
  LUNAR_SETTLEMENT_SURFACE_LIFT,
  LUNAR_SETTLEMENT_VEHICLE_SPEED_BASE,
  LUNAR_SETTLEMENT_VEHICLE_SPEED_MAX,
  LUNAR_SETTLEMENT_VEHICLE_SPEED_MIN,
} from '../../../config/lunarLandscapeConfig';
import { computeSettlementBudget, perDomeCap, perRoadCap } from './settlementBudget';
import {
  domeInstanceMatrices,
  domeLightPoints,
  domeRadiusForFlatDistance,
  generateDomeBuildings,
  generateRoadBuildings,
} from './settlementBuildings';
import { buildRoadConnections, generateFlatDomePositions } from './settlementFlatLayout';
import { createRng } from './settlementRng';
import {
  buildGeodesicLine,
  coverageToAngularRadius,
  flatToSphere,
  maxFlatRadiusForCap,
} from './settlementSphere';
import type { DomeLayout, RoadLayout, SettlementLayout, VehicleSlot } from './settlementTypes';

export { coverageToAngularRadius, maxFlatRadiusForCap } from './settlementSphere';
export { coverageToDomeCount } from './settlementBudget';
export { generateFlatDomePositions, buildRoadConnections } from './settlementFlatLayout';

export const ROAD_LINE_SEGMENTS = LUNAR_SETTLEMENT_ROAD_SEGMENTS;

const _posA = new THREE.Vector3();
const _quat = new THREE.Quaternion();

function buildGeodesicSegmentBuffer(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number,
  moonRadius: number,
  surfaceLift: number
): Float32Array {
  const points = new Float32Array((segments + 1) * 3);
  buildGeodesicLine(start, end, segments, moonRadius, surfaceLift, points);
  const buf = new Float32Array(segments * 2 * 3);
  for (let i = 0; i < segments; i++) {
    const o = i * 6;
    const a = i * 3;
    const b = (i + 1) * 3;
    buf[o] = points[a];
    buf[o + 1] = points[a + 1];
    buf[o + 2] = points[a + 2];
    buf[o + 3] = points[b];
    buf[o + 4] = points[b + 1];
    buf[o + 5] = points[b + 2];
  }
  return buf;
}

export function buildSettlementLayout(
  moonRadius: number,
  coverage: number,
  scale: number,
  seed: number = LUNAR_SETTLEMENT_SEED,
  domeCountOverride?: number,
  surfaceLift: number = LUNAR_SETTLEMENT_SURFACE_LIFT
): SettlementLayout {
  const angularRadius = coverageToAngularRadius(coverage);
  const maxFlatRadius = maxFlatRadiusForCap(moonRadius, angularRadius) * 0.95;
  const budget = computeSettlementBudget(coverage, scale, domeCountOverride);

  const flatPositions = generateFlatDomePositions(
    budget.domeCount,
    maxFlatRadius,
    budget.minDomeSeparation,
    seed
  );

  const flatDists = flatPositions.map(([x, z]) => Math.hypot(x, z));
  const minFlatDist = Math.min(...flatDists, 0);
  const maxFlatDist = Math.max(...flatDists, 1);

  const domeBuildCap = perDomeCap(budget.maxDomeBuildings, flatPositions.length);
  const domeParticleCap = perDomeCap(budget.maxDomeParticles, flatPositions.length);

  const domes: DomeLayout[] = flatPositions.map(([fx, fz], i) => {
    flatToSphere(
      fx,
      fz,
      maxFlatRadius,
      moonRadius,
      angularRadius,
      surfaceLift,
      _posA,
      _quat
    );
    const quat = _quat.clone();
    const dist = Math.hypot(fx, fz);
    const radius = domeRadiusForFlatDistance(dist, minFlatDist, maxFlatDist, scale);
    const buildings = generateDomeBuildings((i + 1) * 7919, radius, domeBuildCap);
    return {
      position: _posA.clone(),
      quaternion: quat,
      radius,
      buildings,
      instanceMatrices: domeInstanceMatrices(buildings),
      lights: domeLightPoints(buildings, (i + 1) * 3571, domeParticleCap),
    };
  });

  const roadPairs = buildRoadConnections(flatPositions, seed + 9001);
  const roadBuildCap = perRoadCap(budget.maxRoadBuildings, Math.max(roadPairs.length, 1));
  const roadParticleCap = perRoadCap(budget.maxRoadParticles, Math.max(roadPairs.length, 1));
  const rand = createRng(seed + 4242);
  const vehiclesPerRoad = Math.max(
    1,
    Math.floor(budget.maxVehicles / Math.max(roadPairs.length, 1))
  );

  const roadLightPts: number[] = [];
  const roads: RoadLayout[] = roadPairs.map(([a, b], ri) => {
    const domeA = domes[a];
    const domeB = domes[b];
    const linePositions = buildGeodesicSegmentBuffer(
      domeA.position,
      domeB.position,
      ROAD_LINE_SEGMENTS,
      moonRadius,
      surfaceLift
    );
    const { buildings, lights } = generateRoadBuildings(
      domeA.position,
      domeB.position,
      moonRadius,
      surfaceLift,
      (ri + 1) * 6271,
      roadBuildCap
    );
    const trimmedLights = lights.slice(0, roadParticleCap * 3);
    roadLightPts.push(...trimmedLights);

    const vehicleSlots: VehicleSlot[] = [];
    for (let p = 0; p < vehiclesPerRoad; p++) {
      vehicleSlots.push({
        roadIndex: ri,
        phase: p / vehiclesPerRoad,
        speed:
          LUNAR_SETTLEMENT_VEHICLE_SPEED_BASE *
          THREE.MathUtils.lerp(
            LUNAR_SETTLEMENT_VEHICLE_SPEED_MIN,
            LUNAR_SETTLEMENT_VEHICLE_SPEED_MAX,
            rand()
          ),
        brightness: 0.65 + rand() * 0.35,
      });
    }

    return {
      domeA: a,
      domeB: b,
      linePositions,
      buildings,
      lights: new Float32Array(trimmedLights),
      vehicleSlots,
    };
  });

  return {
    moonRadius,
    coverage,
    angularRadius,
    maxFlatRadius,
    domes,
    roads,
    roadLights: new Float32Array(roadLightPts),
  };
}
