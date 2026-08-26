import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PLANETS } from '../Planets/SolarSystemConfig';
import { SOLAR_SYSTEM_SCALE, SUN_WORLD_RADIUS } from '../../config/solarConfig';
import { shipPosRef } from '../../context/ShipPos';
import { orbitStatusRef, shipQuaternion, shipVelocity } from '../../context/ShipState';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { getPlanetPosition } from '../../config/planetPosition';
import { hasNavTarget, navTargetPosRef, navTargetIdRef } from '../../context/NavTarget';
import { getDriveSignatures } from '../../context/DriveSignatureRegistry';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { getMagneticTargets } from '../../context/MagneticRegistry';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { getRadioBroadcasts } from '../../context/RadioBroadcastRegistry';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { getCollidables, type CollidableEntry } from '../../context/CollisionRegistry';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { renderToSimulationSpace } from '../../context/FloatingOrigin';
import { beginPadScan } from '../../context/PadScanState';
import { selectedTargetName, selectedTargetPosition } from '../../context/TargetSelection';
import { SHIP_DIRECTION_MIN_SPEED } from '../../config/shipDirectionIndicatorConfig';
import { requestTrajectory, snapshotGravityBodies } from '../../workers/trajectoryWorkerClient';
import { getDockCaptureProfile } from '../../utils/dockingCapture';
import type { DockCaptureMode } from '../../config/dockCaptureConfig';
import { SHIP_DOCKING_PORT_LOCAL } from '../../config/shipConfig';
import { gravityBodies, type GravityBody } from '../../context/GravityRegistry';
import {
  DOCKING_ASSIST_RANGE,
  MAX_MARKERS_PER_GROUP,
  MINIMAP_TRAJECTORY_RESAMPLED_DT,
  MINIMAP_TRAJECTORY_RESAMPLED_STEPS,
  MINIMAP_TRAJECTORY_UPDATE_FRAMES,
  idealOrbitRadiusForBody,
  mergeMarkersByEntity,
  signedAngleDegXZ,
} from './minimapHelpers';
import type {
  DockingAssistData,
  Marker,
  MarkerKind,
  OrbitAssistData,
  PanCenter,
  UnifiedMarker,
  VectorWorld,
} from './minimapTypes';

type ScanEntry = {
  id: string;
  label: string;
  getPosition: (target: THREE.Vector3) => THREE.Vector3;
};

type NearestDock = {
  id: string;
  label: string;
  stationId: string | null;
  captureMode: Extract<DockCaptureMode, 'nose' | 'hover'>;
  x: number;
  z: number;
  relSpeedMps: number;
  idealSpeedMps: number;
  headingErrorDeg: number;
  portRelX: number;
  portRelForward: number;
};

type PathPoint = { x: number; z: number };

const _tmpA = new THREE.Vector3();
const _shipForward = new THREE.Vector3();
const _dockForward = new THREE.Vector3();
const _dockWorldPos = new THREE.Vector3();
const _dockVel = new THREE.Vector3();
const _dockQuat = new THREE.Quaternion();
const _identityQuat = new THREE.Quaternion();
const _portWorldPos = new THREE.Vector3();
const _shipInvQuat = new THREE.Quaternion();
const _dockInShipLocal = new THREE.Vector3();

function shipHeadingDegFromQuaternion(): number {
  _shipForward.set(0, 0, 1).applyQuaternion(shipQuaternion);
  return (Math.atan2(_shipForward.x, _shipForward.z) * 180) / Math.PI;
}

function pushSolarSystemMarkers(out: Marker[]): void {
  out.push({
    id: 'sun',
    label: 'Sun',
    x: 0,
    z: 0,
    kind: 'planet',
    color: '#fdb813',
    radiusWorld: SUN_WORLD_RADIUS,
  });

  for (const planet of PLANETS) {
    const dynamicPos = solarPlanetPositions[planet.name];
    const fallbackPos = getPlanetPosition(planet.name, _tmpA);
    const worldX = dynamicPos ? dynamicPos.x * SOLAR_SYSTEM_SCALE : fallbackPos.x;
    const worldZ = dynamicPos ? dynamicPos.z * SOLAR_SYSTEM_SCALE : fallbackPos.z;
    out.push({
      id: `planet-${planet.name}`,
      label: planet.name,
      x: worldX,
      z: worldZ,
      kind: 'planet',
      color: planet.name === 'Earth' ? '#3399ff' : planet.color,
      radiusWorld: planet.radius * SOLAR_SYSTEM_SCALE,
    });
  }
}

/** Drive / magnetic / radio contacts all share the same "in scanner range" rule. */
function pushScanGroup(
  out: Marker[],
  entries: readonly ScanEntry[],
  ship: THREE.Vector3,
  enabled: boolean,
  range: number,
  kind: MarkerKind,
  idPrefix: string
): void {
  const isRadio = kind === 'radio';
  for (const entry of entries.slice(0, MAX_MARKERS_PER_GROUP)) {
    entry.getPosition(_tmpA);
    renderToSimulationSpace(_tmpA, _tmpA);
    if (!enabled || _tmpA.distanceTo(ship) > range) continue;
    out.push({
      id: `${idPrefix}-${entry.id}`,
      label: entry.label,
      x: _tmpA.x,
      z: _tmpA.z,
      kind,
      inRange: true,
      entityId: entry.id,
      radioCapable: isRadio || undefined,
    });
  }
}

/** Physical / surface-impact colliders always render; returns their ids so proximity can skip them. */
function pushHardObjectMarkers(out: Marker[], collidables: CollidableEntry[]): Set<string> {
  const hardOverlayIds = new Set<string>();
  for (const col of collidables) {
    const hardObject = col.physicalCollision !== false || col.planetSurfaceImpact === true;
    if (!hardObject || col.scannerOnlyMinimap) continue;
    col.getWorldPosition(_tmpA);
    renderToSimulationSpace(_tmpA, _tmpA);
    hardOverlayIds.add(col.id);
    out.push({
      id: `hard-${col.id}`,
      label: col.label ?? col.id,
      x: _tmpA.x,
      z: _tmpA.z,
      kind: 'hard',
      entityId: col.id,
    });
  }
  return hardOverlayIds;
}

/** Pushes in-radio-range landing pads and returns the closest dock inside assist range. */
function collectDockingBays(
  out: Marker[],
  collidables: CollidableEntry[],
  ship: THREE.Vector3,
  nearestDockDistance: { current: number }
): NearestDock | null {
  _portWorldPos
    .set(SHIP_DOCKING_PORT_LOCAL[0], SHIP_DOCKING_PORT_LOCAL[1], SHIP_DOCKING_PORT_LOCAL[2])
    .applyQuaternion(shipQuaternion)
    .add(ship);
  _shipInvQuat.copy(shipQuaternion).invert();

  let nearestDock: NearestDock | null = null;
  for (const col of collidables) {
    if (!col.id.startsWith('docking-bay-')) continue;
    const profile = getDockCaptureProfile(col);
    if (profile.mode !== 'nose' && profile.mode !== 'hover') continue;
    col.getWorldPosition(_dockWorldPos);
    renderToSimulationSpace(_dockWorldPos, _dockWorldPos);
    const dx = _dockWorldPos.x - ship.x;
    const dz = _dockWorldPos.z - ship.z;
    const planarDist = Math.hypot(dx, dz);
    if (
      profile.mode === 'hover' &&
      radioRangeRef.current > 0 &&
      planarDist <= radioRangeRef.current
    ) {
      out.push({
        id: `landing-pad-${col.id}`,
        label: col.label ?? col.stationId ?? 'Landing Pad',
        x: _dockWorldPos.x,
        z: _dockWorldPos.z,
        kind: 'landingPad',
        inRange: true,
        entityId: col.stationId ?? col.id,
      });
    }
    if (planarDist > DOCKING_ASSIST_RANGE) continue;
    const dockWorldVel = col.getWorldVelocity
      ? col.getWorldVelocity(_dockVel)
      : _dockVel.set(0, 0, 0);
    const relSpeed = _tmpA.copy(shipVelocity).sub(dockWorldVel).length();
    const dockQuat = col.getWorldQuaternion ? col.getWorldQuaternion(_dockQuat) : _identityQuat;
    _shipForward.set(0, 0, 1).applyQuaternion(shipQuaternion);
    _dockForward.set(0, 0, 1).applyQuaternion(dockQuat);
    const headingErrorDeg = signedAngleDegXZ(_shipForward, _dockForward);
    const idealSpeedMps = Math.max(0.35, (profile.maxRelativeSpeed ?? 2) * 0.55);
    _dockInShipLocal.subVectors(_dockWorldPos, _portWorldPos).applyQuaternion(_shipInvQuat);
    // Flight nose is −local Z → positive forward when dock is ahead of the port.
    const portRelX = _dockInShipLocal.x;
    const portRelForward = -_dockInShipLocal.z;
    if (!nearestDock || planarDist < nearestDockDistance.current) {
      nearestDock = {
        id: col.id,
        label: col.label ?? col.stationId ?? col.id,
        stationId: col.stationId ?? null,
        captureMode: profile.mode,
        x: _dockWorldPos.x,
        z: _dockWorldPos.z,
        relSpeedMps: relSpeed,
        idealSpeedMps,
        headingErrorDeg,
        portRelX,
        portRelForward,
      };
      nearestDockDistance.current = planarDist;
    }
  }
  if (!nearestDock) {
    nearestDockDistance.current = Number.POSITIVE_INFINITY;
  }
  return nearestDock;
}

function pushProximityMarkers(
  out: Marker[],
  collidables: CollidableEntry[],
  ship: THREE.Vector3,
  hardOverlayIds: Set<string>,
  proximityOn: boolean
): void {
  for (const col of collidables) {
    if (
      !proximityOn ||
      !col.label ||
      hardOverlayIds.has(col.id) ||
      col.id.startsWith('docking-bay-')
    ) {
      continue;
    }
    col.getWorldPosition(_tmpA);
    renderToSimulationSpace(_tmpA, _tmpA);
    if (_tmpA.distanceTo(ship) > proximityScanRangeRef.current) continue;
    out.push({
      id: `prox-${col.id}`,
      label: col.label,
      x: _tmpA.x,
      z: _tmpA.z,
      kind: 'proximity',
      inRange: true,
      entityId: col.id,
    });
  }
}

/** Selected target wins over the nav beacon for the blue guidance cue. */
function resolveTargetPoint(): PathPoint | null {
  if (selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01) {
    return { x: selectedTargetPosition.x, z: selectedTargetPosition.z };
  }
  if (hasNavTarget()) {
    return { x: navTargetPosRef.current.x, z: navTargetPosRef.current.z };
  }
  return null;
}

function isShipInsidePlanetSoi(ship: THREE.Vector3): boolean {
  for (const [id, body] of gravityBodies) {
    if (id === 'Sun') continue;
    const dist = Math.hypot(ship.x - body.position.x, ship.z - body.position.z);
    if (dist > body.surfaceRadius && dist < body.soiRadius) return true;
  }
  return false;
}

/** Prefer the body the orbit tracker already locked onto, else strongest pull inside SOI. */
function findPrimaryGravityBody(
  ship: THREE.Vector3
): { id: string; body: GravityBody } | null {
  const statusId = orbitStatusRef.current.bodyId;
  if (statusId && statusId !== 'Sun') {
    const statusBody = gravityBodies.get(statusId);
    if (statusBody) {
      const dist = Math.hypot(statusBody.position.x - ship.x, statusBody.position.z - ship.z);
      if (dist > statusBody.surfaceRadius && dist < statusBody.soiRadius) {
        return { id: statusId, body: statusBody };
      }
    }
  }

  let primaryId: string | null = null;
  let primaryBody: GravityBody | null = null;
  let primaryAccel = 0;
  for (const [id, body] of gravityBodies) {
    if (id === 'Sun') continue;
    const dx = body.position.x - ship.x;
    const dz = body.position.z - ship.z;
    const dist2 = dx * dx + dz * dz;
    const dist = Math.sqrt(dist2);
    if (dist > body.surfaceRadius && dist < body.soiRadius) {
      const accel = body.mu / dist2;
      if (accel > primaryAccel) {
        primaryAccel = accel;
        primaryId = id;
        primaryBody = body;
      }
    }
  }
  return primaryBody && primaryId ? { id: primaryId, body: primaryBody } : null;
}

function buildOrbitAssist(
  primaryId: string,
  primaryBody: GravityBody,
  ship: THREE.Vector3,
  predictedPath: PathPoint[]
): OrbitAssistData {
  const idealR = idealOrbitRadiusForBody(primaryBody);
  const relX = ship.x - primaryBody.position.x;
  const relZ = ship.z - primaryBody.position.z;
  const r = Math.hypot(relX, relZ);
  const rx = relX / Math.max(r, 1e-6);
  const rz = relZ / Math.max(r, 1e-6);
  const relVx = shipVelocity.x - primaryBody.velocity.x;
  const relVz = shipVelocity.z - primaryBody.velocity.z;
  const tangSpeed = Math.abs(-rz * relVx + rx * relVz);
  const circSpeed = Math.sqrt(primaryBody.mu / Math.max(idealR, 1));
  const requiredSpeed = Math.sqrt(primaryBody.mu / Math.max(r, 1));
  const tx = -rz;
  const tz = rx;
  const tangentSign = relVx * tx + relVz * tz >= 0 ? 1 : -1;
  const target = resolveTargetPoint();

  const status = orbitStatusRef.current;
  const surfaceR =
    status.bodyId === primaryId && status.surfaceRadius > 0
      ? status.surfaceRadius
      : primaryBody.surfaceRadius;
  const periAlt =
    status.bodyId === primaryId && status.periapsis > 0
      ? Math.max(0, status.periapsis - surfaceR)
      : Math.max(0, r - surfaceR);
  const apoAlt =
    status.bodyId === primaryId && status.apoapsis > 0
      ? Math.max(0, status.apoapsis - surfaceR)
      : Math.max(0, r - surfaceR);

  return {
    bodyId: primaryId,
    bodyLabel: primaryId.toUpperCase(),
    bodyX: primaryBody.position.x,
    bodyZ: primaryBody.position.z,
    shipX: ship.x,
    shipZ: ship.z,
    surfaceRadius: primaryBody.surfaceRadius,
    idealOrbitRadius: idealR,
    soiRadius: primaryBody.soiRadius,
    altitude: Math.max(0, r - primaryBody.surfaceRadius),
    periAlt,
    apoAlt,
    tangSpeedMps: tangSpeed,
    circSpeedMps: circSpeed,
    requiredSpeedMps: requiredSpeed,
    requiredDirX: tx * tangentSign,
    requiredDirZ: tz * tangentSign,
    targetX: target?.x ?? null,
    targetZ: target?.z ?? null,
    isOrbiting: status.bodyId === primaryId && status.isOrbiting,
    shipHeadingDeg: shipHeadingDegFromQuaternion(),
    predictedPath,
  };
}

function buildDockingAssist(
  nearestDock: NearestDock,
  ship: THREE.Vector3,
  shipHeadingDeg: number
): DockingAssistData {
  const lateralX = nearestDock.x - ship.x;
  const lateralZ = nearestDock.z - ship.z;
  const distanceToCenter =
    nearestDock.captureMode === 'nose'
      ? Math.hypot(nearestDock.portRelX, nearestDock.portRelForward)
      : Math.hypot(lateralX, lateralZ);
  return {
    dockId: nearestDock.id,
    dockLabel: nearestDock.label,
    stationId: nearestDock.stationId,
    captureMode: nearestDock.captureMode,
    shipX: ship.x,
    shipZ: ship.z,
    dockX: nearestDock.x,
    dockZ: nearestDock.z,
    distanceToCenter,
    lateralX,
    lateralZ,
    portRelX: nearestDock.portRelX,
    portRelForward: nearestDock.portRelForward,
    relSpeedMps: nearestDock.relSpeedMps,
    idealSpeedMps: nearestDock.idealSpeedMps,
    headingErrorDeg: nearestDock.headingErrorDeg,
    shipHeadingDeg,
  };
}

/**
 * Drives every per-frame minimap readout: contact markers, nav / trajectory vectors,
 * and the docking or orbit assist takeover state.
 */
export function useMinimapTelemetry({
  showSolarSystem,
  followShip,
  setPanCenter,
  zoomHalfSpan,
}: {
  showSolarSystem: boolean;
  followShip: boolean;
  setPanCenter: (center: PanCenter) => void;
  zoomHalfSpan: number;
}) {
  const [markers, setMarkers] = useState<(Marker | UnifiedMarker)[]>([]);
  const [vectorWorld, setVectorWorld] = useState<VectorWorld>({
    nav: null,
    velocityPath: [],
    shipX: 0,
    shipZ: 0,
  });
  const [shipHeadingDeg, setShipHeadingDeg] = useState(0);
  const [dockingAssist, setDockingAssist] = useState<DockingAssistData | null>(null);
  const [orbitAssist, setOrbitAssist] = useState<OrbitAssistData | null>(null);

  const nearestDockDistance = useRef(Number.POSITIVE_INFINITY);
  /** Fires pad scan once when docking assist first engages (or switches pads). */
  const lastPadScanDockIdRef = useRef<string | null>(null);
  const trajectoryFrameCounterRef = useRef(0);
  const trajectoryCacheRef = useRef<PathPoint[]>([]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const ship = shipPosRef.current;
      if (followShip) {
        setPanCenter({ x: ship.x, z: ship.z });
      }
      const heading = shipHeadingDegFromQuaternion();
      setShipHeadingDeg(heading);

      const next: Marker[] = [];
      if (showSolarSystem) pushSolarSystemMarkers(next);

      next.push({
        id: 'ship',
        label: 'Your Ship',
        x: ship.x,
        z: ship.z,
        kind: 'ship',
      });

      if (hasNavTarget()) {
        next.push({
          id: 'nav-target',
          label: `Nav Target (${navTargetIdRef.current})`,
          x: navTargetPosRef.current.x,
          z: navTargetPosRef.current.z,
          kind: 'nav',
        });
      }

      // Gravity turns the predicted path into a curve, so only run the worker inside a planet SOI.
      const velLen = Math.hypot(shipVelocity.x, shipVelocity.z);
      const isShipMovingForTrajectory =
        velLen > SHIP_DIRECTION_MIN_SPEED && isShipInsidePlanetSoi(ship);
      trajectoryFrameCounterRef.current += 1;
      if (isShipMovingForTrajectory) {
        if (
          trajectoryCacheRef.current.length === 0 ||
          trajectoryFrameCounterRef.current % MINIMAP_TRAJECTORY_UPDATE_FRAMES === 0
        ) {
          requestTrajectory(
            'minimap',
            ship.x,
            ship.z,
            shipVelocity.x,
            shipVelocity.z,
            snapshotGravityBodies(),
            {
              steps: MINIMAP_TRAJECTORY_RESAMPLED_STEPS,
              dt: MINIMAP_TRAJECTORY_RESAMPLED_DT,
              detectOrbitClosure: true,
              trackApsides: false,
              adaptiveDt: true,
            },
            (result) => {
              const { positions, activeSteps } = result;
              const pts: PathPoint[] = new Array(activeSteps);
              for (let i = 0; i < activeSteps; i++) {
                pts[i] = { x: positions[i * 2], z: positions[i * 2 + 1] };
              }
              trajectoryCacheRef.current = pts;
            }
          );
        }
      } else {
        trajectoryCacheRef.current = [];
      }

      setVectorWorld({
        nav: resolveTargetPoint(),
        velocityPath: isShipMovingForTrajectory ? trajectoryCacheRef.current : [],
        shipX: ship.x,
        shipZ: ship.z,
      });

      pushScanGroup(
        next,
        getDriveSignatures(),
        ship,
        driveSignatureOnRef.current && driveSignatureRangeRef.current > 0,
        driveSignatureRangeRef.current,
        'drive',
        'drive'
      );
      pushScanGroup(
        next,
        getMagneticTargets(),
        ship,
        magneticOnRef.current && magneticScanRangeRef.current > 0,
        magneticScanRangeRef.current,
        'mag',
        'mag'
      );
      pushScanGroup(
        next,
        getRadioBroadcasts(),
        ship,
        radioOnRef.current && radioRangeRef.current > 0,
        radioRangeRef.current,
        'radio',
        'radio'
      );

      const collidables = getCollidables().slice(0, MAX_MARKERS_PER_GROUP);
      const hardOverlayIds = pushHardObjectMarkers(next, collidables);
      const nearestDock = collectDockingBays(next, collidables, ship, nearestDockDistance);
      pushProximityMarkers(
        next,
        collidables,
        ship,
        hardOverlayIds,
        proximityScanOnRef.current && proximityScanRangeRef.current > 0
      );

      setMarkers(mergeMarkersByEntity(next));

      if (nearestDock) {
        if (
          nearestDock.captureMode === 'hover' &&
          lastPadScanDockIdRef.current !== nearestDock.id
        ) {
          lastPadScanDockIdRef.current = nearestDock.id;
          beginPadScan(nearestDock.id);
        } else if (nearestDock.captureMode !== 'hover') {
          lastPadScanDockIdRef.current = null;
        }
        setDockingAssist(buildDockingAssist(nearestDock, ship, heading));
        setOrbitAssist(null);
      } else {
        lastPadScanDockIdRef.current = null;
        setDockingAssist(null);

        const primary = findPrimaryGravityBody(ship);
        if (primary) {
          // Always anchor ORB path at current ship position.
          const predictedPath = [{ x: ship.x, z: ship.z }, ...trajectoryCacheRef.current];
          setOrbitAssist(buildOrbitAssist(primary.id, primary.body, ship, predictedPath));
        } else {
          setOrbitAssist(null);
        }
      }

      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [followShip, showSolarSystem, zoomHalfSpan, setPanCenter]);

  return { markers, vectorWorld, shipHeadingDeg, dockingAssist, orbitAssist };
}
