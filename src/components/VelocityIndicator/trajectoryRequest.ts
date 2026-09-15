import { TRAJ_UPDATE_INTERVAL } from '../../config/trajectoryConfig';
import { gravityBodies, type GravityBody } from '../../context/GravityRegistry';
import { shipPosRef } from '../../context/ShipPos';
import { trajectoryApsisRef } from '../../context/ShipState';
import type { TrajectorySimResult } from '../../maths/trajectoryTypes';
import { requestTrajectory, snapshotGravityBodies } from '../../workers/trajectoryWorkerClient';
import { shipVelocity } from '../Ship/Spaceship';
import { redrawApsisLabels } from './apsisMarkers';
import { SHIP_TRAJECTORY_CONFIG, TRAJ_STEPS } from './constants';
import type { IndicatorObjects } from './indicatorObjects';
import { drawOrbitGuideLabel, rebuildOrbitGuideCircle } from './orbitGuide';
import { trajectoryCache } from './trajectoryCache';

/** Starts at the interval so the very first frame sends a request. */
let framesSinceRequest = TRAJ_UPDATE_INTERVAL;

/** True once every TRAJ_UPDATE_INTERVAL frames (~20 Hz at 60 fps). */
export function isTrajectoryRequestDue(): boolean {
  framesSinceRequest++;
  if (framesSinceRequest < TRAJ_UPDATE_INTERVAL) return false;
  framesSinceRequest = 0;
  return true;
}

/** Sends the ship's current state to the worker. The reply is applied when it arrives. */
export function requestShipTrajectory(objects: IndicatorObjects) {
  const ship = shipPosRef.current;
  const requestedX = ship.x;
  const requestedZ = ship.z;

  requestTrajectory(
    'ship',
    ship.x,
    ship.z,
    shipVelocity.x,
    shipVelocity.z,
    snapshotGravityBodies(),
    SHIP_TRAJECTORY_CONFIG,
    (result) => applyTrajectoryResult(objects, result, requestedX, requestedZ)
  );
}

/** Everything that happens when the worker replies. */
function applyTrajectoryResult(
  objects: IndicatorObjects,
  result: TrajectorySimResult,
  requestedX: number,
  requestedZ: number
) {
  copyShipRelativePoints(objects.posArr, result, requestedX, requestedZ);

  const bodyId = result.primaryBodyId;
  const body = bodyId ? (gravityBodies.get(bodyId) ?? null) : null;
  const isPlanet = bodyId !== null && bodyId !== 'Sun';

  updateTrajectoryCache(result, body, isPlanet);
  publishTrajectoryApsides(result, body);
  redrawApsisLabels(objects, result, body, isPlanet);

  if (body) rebuildOrbitGuideCircle(objects, body, shipPosRef.current);
  drawOrbitGuideLabel(objects);
}

/**
 * Converts the worker's absolute XZ pairs into ship-relative XYZ triples.
 * For a closed orbit, points past the closure repeat the orbit from the start.
 */
function copyShipRelativePoints(
  target: Float32Array,
  result: TrajectorySimResult,
  originX: number,
  originZ: number
) {
  const { positions, orbitClosedAt } = result;

  for (let i = 0; i < TRAJ_STEPS; i++) {
    target[i * 3] = positions[i * 2] - originX;
    target[i * 3 + 1] = 0;
    target[i * 3 + 2] = positions[i * 2 + 1] - originZ;
  }

  if (orbitClosedAt < 0) return;
  for (let i = orbitClosedAt + 1; i < TRAJ_STEPS; i++) {
    const source = i - (orbitClosedAt + 1);
    target[i * 3] = target[source * 3];
    target[i * 3 + 1] = target[source * 3 + 1];
    target[i * 3 + 2] = target[source * 3 + 2];
  }
}

function updateTrajectoryCache(
  result: TrajectorySimResult,
  body: GravityBody | null,
  isPlanet: boolean
) {
  trajectoryCache.primaryBody = body;
  trajectoryCache.primaryIsPlanet = isPlanet;
  trajectoryCache.periStep = result.periStep;
  trajectoryCache.apoStep = result.apoStep;
  trajectoryCache.orbitClosedAt = result.orbitClosedAt;
}

/** Shares the apsides with other systems via trajectoryApsisRef (read by the NavHUD orbit metrics). */
function publishTrajectoryApsides(result: TrajectorySimResult, body: GravityBody | null) {
  const { periStep, apoStep, periDist, apoDist, orbitClosedAt } = result;
  const apsides = trajectoryApsisRef.current;

  apsides.periapsis = body && periStep >= 0 && periDist < Infinity ? periDist : 0;
  apsides.apoapsis = body && apoStep >= 0 && orbitClosedAt >= 0 ? apoDist : 0;
  apsides.surfaceRadius = body?.surfaceRadius ?? 0;
}
