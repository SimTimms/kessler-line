import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { registerDock, unregisterDock } from '../../context/DockablePartnerStore';
import {
  registerDriveSignature,
  unregisterDriveSignature,
} from '../../context/DriveSignatureRegistry';
import { gravityBodies } from '../../context/GravityRegistry';
import { shipPosRef } from '../../context/ShipPos';
import {
  SHIP_LABELS,
  GHOST_FLEET_RADIUS,
  GHOST_FLEET_SHIP_COUNT,
  GHOST_FLEET_NEPTUNE_SHIP_COUNT,
  GHOST_FLEET_NEPTUNE_ORBIT_ALTITUDE_MULTIPLIER,
  GHOST_FLEET_NEPTUNE_ORBIT_RATIO,
  GHOST_FLEET_NEPTUNE_ORBIT_BAND_MIN,
  GHOST_FLEET_NEPTUNE_ORBIT_BAND_MAX,
  GHOST_FLEET_NEPTUNE_SCATTER_BAND_MIN,
  GHOST_FLEET_NEPTUNE_SCATTER_BAND_MAX,
  GHOST_FLEET_NEAR_RENDER_DISTANCE,
  GHOST_FLEET_NEAR_MODEL_URL,
  GHOST_FLEET_NEAR_MODEL_TARGET_SIZE,
  GHOST_FLEET_NEAR_MODEL_SCALE_MULTIPLIER,
} from '../../config/ghostFleetConfig';
import { ASTEROID_DOCK_CONFIG } from '../../config/docks/asteroidDockConfig';
import {
  getPlanetPosition,
  getPlanetWorldRadius,
  getShipSpawnInPlanetOrbit,
} from '../../config/planetPosition';
import { getPlanet } from '../Planets/SolarSystem';
import {
  DEFAULT_PLANET_SURFACE_GRAVITY,
  ORBIT_ALTITUDE_MULTIPLIER,
} from '../../config/solarConfig';

interface GhostShipDef {
  id: string;
  label: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  orbit?: {
    bodyId: string;
    radius: number;
    angle: number;
    angularSpeed: number;
    yOffset: number;
  };
}

// Deterministic LCG so positions are consistent across reloads
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const _bodyPosition = new THREE.Vector3();
const _bodyVelocity = new THREE.Vector3();
const _seedShipPos = new THREE.Vector3();
const _seedRadial = new THREE.Vector3();
const _seedTangent = new THREE.Vector3();
const _seedSpawnPos = new THREE.Vector3();
const SPECKLED_SKY_ID = 'speckled-sky';
const SPECKLED_SKY_SPAWN_DISTANCE_FROM_PLAYER = 2_000;

function getBodyKinematics(
  bodyId: string,
  outPosition: THREE.Vector3,
  outVelocity: THREE.Vector3
): void {
  const body = gravityBodies.get(bodyId);
  if (body) {
    outPosition.copy(body.position);
    outVelocity.copy(body.velocity);
    return;
  }
  getPlanetPosition(bodyId, outPosition);
  outVelocity.set(0, 0, 0);
}

function getCircularOrbitAngularSpeed(bodyId: string, orbitRadius: number): number {
  const body = gravityBodies.get(bodyId);
  if (body) {
    return Math.sqrt(body.mu / Math.max(orbitRadius, 1) ** 3);
  }

  const worldRadius = getPlanetWorldRadius(bodyId);
  const planet = getPlanet(bodyId);
  const surfaceGravity = planet?.surfaceGravity ?? DEFAULT_PLANET_SURFACE_GRAVITY;
  const mu = surfaceGravity * worldRadius * worldRadius;
  return Math.sqrt(mu / Math.max(orbitRadius, 1) ** 3);
}

function updateOrbitingGhostShip(ship: GhostShipDef, delta: number): void {
  if (!ship.orbit) return;
  const orbit = ship.orbit;
  getBodyKinematics(orbit.bodyId, _bodyPosition, _bodyVelocity);

  orbit.angle += orbit.angularSpeed * delta;
  const cosAngle = Math.cos(orbit.angle);
  const sinAngle = Math.sin(orbit.angle);
  ship.position.set(
    _bodyPosition.x + cosAngle * orbit.radius,
    _bodyPosition.y + orbit.yOffset,
    _bodyPosition.z + sinAngle * orbit.radius
  );

  const tangentialSpeed = orbit.angularSpeed * orbit.radius;
  ship.velocity.set(
    _bodyVelocity.x + -sinAngle * tangentialSpeed,
    _bodyVelocity.y,
    _bodyVelocity.z + cosAngle * tangentialSpeed
  );
}

function initializeGhostShipKinematics(ships: readonly GhostShipDef[]): void {
  for (const ship of ships) {
    if (!ship.orbit) {
      ship.velocity.set(0, 0, 0);
      continue;
    }
    updateOrbitingGhostShip(ship, 0);
  }
}

function seedSpeckledSkyNearPlayer(): void {
  const speckledSky = GHOST_FLEET.find((ship) => ship.id === SPECKLED_SKY_ID);
  if (!speckledSky?.orbit) return;

  const orbit = speckledSky.orbit;
  getBodyKinematics(orbit.bodyId, _bodyPosition, _bodyVelocity);
  _seedShipPos.copy(shipPosRef.current);
  _seedRadial.subVectors(_seedShipPos, _bodyPosition).setY(0);
  if (_seedRadial.lengthSq() < 1e-6) {
    _seedRadial.set(1, 0, 0);
  } else {
    _seedRadial.normalize();
  }
  _seedTangent.set(-_seedRadial.z, 0, _seedRadial.x).normalize();
  _seedSpawnPos
    .copy(_seedShipPos)
    .addScaledVector(_seedTangent, SPECKLED_SKY_SPAWN_DISTANCE_FROM_PLAYER);

  const nextRadius = _seedSpawnPos.clone().sub(_bodyPosition).length();
  orbit.radius = Math.max(nextRadius, 1);
  orbit.angle = Math.atan2(_seedSpawnPos.z - _bodyPosition.z, _seedSpawnPos.x - _bodyPosition.x);
  orbit.angularSpeed =
    Math.sign(orbit.angularSpeed || 1) * getCircularOrbitAngularSpeed(orbit.bodyId, orbit.radius);
  orbit.yOffset = _seedSpawnPos.y - _bodyPosition.y;
  updateOrbitingGhostShip(speckledSky, 0);
}

const NARRATIVE_SHIPS: GhostShipDef[] = [
  {
    id: 'speckled-sky',
    label: 'SPECKLED SKY',
    ...(() => {
      const worldRadius = getPlanetWorldRadius('Neptune');
      const altitude = worldRadius * ORBIT_ALTITUDE_MULTIPLIER * 1.75;
      const spawn = getShipSpawnInPlanetOrbit('Neptune', altitude);
      const neptunePosition = getPlanetPosition('Neptune');
      const spawnPosition = new THREE.Vector3(
        spawn.position[0],
        spawn.position[1],
        spawn.position[2]
      );
      const radial = spawnPosition.clone().sub(neptunePosition);
      const orbitRadius = Math.max(radial.length(), 1);
      const orbitAngle = Math.atan2(radial.z, radial.x);
      return {
        position: spawnPosition,
        velocity: new THREE.Vector3(),
        orbit: {
          bodyId: 'Neptune',
          radius: orbitRadius,
          angle: orbitAngle,
          angularSpeed: getCircularOrbitAngularSpeed('Neptune', orbitRadius),
          yOffset: radial.y,
        },
      };
    })(),
  },
];

function buildOuterGhostFleet(): GhostShipDef[] {
  const rand = seededRandom(42);
  const ships: GhostShipDef[] = [];
  for (let i = 0; i < GHOST_FLEET_SHIP_COUNT; i++) {
    const angle = rand() * Math.PI * 2;
    const r = -GHOST_FLEET_RADIUS + rand() * GHOST_FLEET_RADIUS; // spread across outer solar system
    ships.push({
      id: `ghost-outer-${i}`,
      label: SHIP_LABELS[i % SHIP_LABELS.length],
      position: new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r),
      velocity: new THREE.Vector3(),
    });
  }
  return [...NARRATIVE_SHIPS, ...ships];
}

function buildNeptuneGhostFleet(): GhostShipDef[] {
  const rand = seededRandom(84);
  const neptunePosition = getPlanetPosition('Neptune');
  const neptuneWorldRadius = getPlanetWorldRadius('Neptune');
  const altitudeAboveSurface =
    neptuneWorldRadius * ORBIT_ALTITUDE_MULTIPLIER * GHOST_FLEET_NEPTUNE_ORBIT_ALTITUDE_MULTIPLIER;
  const neptuneSpawnLikeOrbitRadius = neptuneWorldRadius + altitudeAboveSurface;
  const mainOrbitCount = Math.floor(
    GHOST_FLEET_NEPTUNE_SHIP_COUNT * GHOST_FLEET_NEPTUNE_ORBIT_RATIO
  );
  const ships: GhostShipDef[] = [];
  for (let i = 0; i < GHOST_FLEET_NEPTUNE_SHIP_COUNT; i++) {
    const angle = rand() * Math.PI * 2;
    const isMainOrbitShip = i < mainOrbitCount;
    const bandMin = isMainOrbitShip
      ? GHOST_FLEET_NEPTUNE_ORBIT_BAND_MIN
      : GHOST_FLEET_NEPTUNE_SCATTER_BAND_MIN;
    const bandMax = isMainOrbitShip
      ? GHOST_FLEET_NEPTUNE_ORBIT_BAND_MAX
      : GHOST_FLEET_NEPTUNE_SCATTER_BAND_MAX;
    const r = neptuneSpawnLikeOrbitRadius * (bandMin + rand() * (bandMax - bandMin));
    const orbitalDirection = rand() > 0.2 ? 1 : -1;
    ships.push({
      id: `ghost-neptune-${i}`,
      label: SHIP_LABELS[i % SHIP_LABELS.length],
      position: new THREE.Vector3(
        neptunePosition.x + Math.cos(angle) * r,
        neptunePosition.y,
        neptunePosition.z + Math.sin(angle) * r
      ),
      velocity: new THREE.Vector3(),
      orbit: {
        bodyId: 'Neptune',
        radius: r,
        angle,
        angularSpeed: getCircularOrbitAngularSpeed('Neptune', r) * orbitalDirection,
        yOffset: 0,
      },
    });
  }
  return ships;
}

// Built once at module load; positions are stable for the lifetime of the session
const GHOST_FLEET: readonly GhostShipDef[] = [
  ...buildOuterGhostFleet(),
  ...buildNeptuneGhostFleet(),
];
initializeGhostShipKinematics(GHOST_FLEET);
const NEAR_RENDER_DISTANCE_SQ = GHOST_FLEET_NEAR_RENDER_DISTANCE * GHOST_FLEET_NEAR_RENDER_DISTANCE;

interface GhostFleetShipModelProps {
  ship: GhostShipDef;
  sourceModel: THREE.Group;
}

interface GhostColliderDef {
  idSuffix: string;
  localOffset: THREE.Vector3;
  halfExtents: THREE.Vector3;
  dockingBay?: boolean;
}

function maxAxisIndex(v: THREE.Vector3): 0 | 1 | 2 {
  if (v.x >= v.y && v.x >= v.z) return 0;
  if (v.y >= v.z) return 1;
  return 2;
}

function GhostFleetShipModel({ ship, sourceModel }: GhostFleetShipModelProps) {
  const [isNearby, setIsNearby] = useState(false);
  const isNearbyRef = useRef(false);
  const groupRef = useRef<THREE.Group | null>(null);
  const colliderAnchorRefs = useRef(new Map<string, THREE.Object3D | null>());
  const ghostDockId = useMemo(() => `ghost-rendezvous-${ship.id}`, [ship.id]);
  const { model, scale, colliderDefs } = useMemo(() => {
    const clone = sourceModel.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    // Some GLBs have an authoring pivot far from visible geometry.
    // Recenter so ship.position, target marker, and mesh stay aligned.
    clone.position.sub(center);
    const longestAxis = Math.max(size.x, size.y, size.z, 0.0001);
    const normalizedScale =
      (GHOST_FLEET_NEAR_MODEL_TARGET_SIZE / longestAxis) * GHOST_FLEET_NEAR_MODEL_SCALE_MULTIPLIER;
    const scaledSize = size.clone().multiplyScalar(normalizedScale);
    const axisLen = (axis: 0 | 1 | 2): number =>
      axis === 0 ? scaledSize.x : axis === 1 ? scaledSize.y : scaledSize.z;
    const majorAxis = maxAxisIndex(scaledSize);
    const [minorAxisA, minorAxisB] = ([0, 1, 2] as const).filter((axis) => axis !== majorAxis) as [
      0 | 1 | 2,
      0 | 1 | 2,
    ];
    const majorLen = axisLen(majorAxis);
    const minorLenA = axisLen(minorAxisA);
    const minorLenB = axisLen(minorAxisB);

    const makeVec = (major: number, minorA: number, minorB: number): THREE.Vector3 => {
      const vals: [number, number, number] = [0, 0, 0];
      vals[majorAxis] = major;
      vals[minorAxisA] = minorA;
      vals[minorAxisB] = minorB;
      return new THREE.Vector3(vals[0], vals[1], vals[2]);
    };

    const centerMajor = majorLen * 0.5;
    const podMajor = majorLen * 0.25;
    const podOffset = majorLen * 0.34;

    const defs: GhostColliderDef[] = [
      {
        idSuffix: 'hull-center',
        localOffset: makeVec(0, 0, 0),
        halfExtents: makeVec(centerMajor * 0.5, minorLenA * 0.28, minorLenB * 0.28),
      },
      {
        idSuffix: 'hull-front',
        localOffset: makeVec(podOffset, 0, 0),
        halfExtents: makeVec(podMajor * 0.5, minorLenA * 0.18, minorLenB * 0.18),
      },
      {
        idSuffix: 'hull-rear',
        localOffset: makeVec(-podOffset, 0, 0),
        halfExtents: makeVec(podMajor * 0.5, minorLenA * 0.18, minorLenB * 0.18),
      },
      {
        idSuffix: 'dock',
        // Large-ship interior bay: fly into this volume to dock.
        localOffset: makeVec(0, 0, 0),
        halfExtents: makeVec(majorLen * 0.2, minorLenA * 0.2, minorLenB * 0.2),
        dockingBay: true,
      },
    ];

    return {
      model: clone,
      scale: normalizedScale,
      colliderDefs: defs,
    };
  }, [sourceModel]);
  const distanceBuffer = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).castShadow = true;
    });
  }, [model]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(ship.position);
    }
    const distSq = distanceBuffer.copy(shipPosRef.current).sub(ship.position).lengthSq();
    const nextIsNearby = distSq <= NEAR_RENDER_DISTANCE_SQ;
    if (nextIsNearby !== isNearbyRef.current) {
      isNearbyRef.current = nextIsNearby;
      setIsNearby(nextIsNearby);
    }
  });

  useEffect(() => {
    if (!isNearby || !groupRef.current) return;
    registerDock({
      id: ghostDockId,
      ...ASTEROID_DOCK_CONFIG,
      label: `${ship.label} Bay`,
    });
    const registeredIds: string[] = [];
    for (const def of colliderDefs) {
      const anchor = colliderAnchorRefs.current.get(def.idSuffix);
      if (!anchor) continue;
      const id = def.dockingBay
        ? `docking-bay-rendezvous-${ship.id}`
        : `ghost-hull-${ship.id}-${def.idSuffix}`;
      registerCollidable({
        id,
        stationId: ghostDockId,
        label: `${ship.label} (${def.idSuffix})`,
        getWorldPosition: (target) => {
          anchor.getWorldPosition(target);
          return target;
        },
        getWorldQuaternion: (target) => {
          anchor.getWorldQuaternion(target);
          return target;
        },
        getWorldVelocity: (target) => target.copy(ship.velocity),
        shape: { type: 'box', halfExtents: def.halfExtents.clone() },
        getObject3D: () => anchor,
        // Large-ship mode: hull colliders are debug/scanner only; docking is
        // handled by entering the interior docking-bay volume.
        physicalCollision: false,
      });
      registeredIds.push(id);
    }
    return () => {
      for (const id of registeredIds) unregisterCollidable(id);
      unregisterDock(ghostDockId);
    };
  }, [colliderDefs, ghostDockId, isNearby, ship.id, ship.label]);

  if (!isNearby) return null;

  return (
    <group ref={groupRef} position={ship.position}>
      <primitive object={model} scale={scale} />
      {colliderDefs.map((def) => (
        <object3D
          key={def.idSuffix}
          position={[def.localOffset.x, def.localOffset.y, def.localOffset.z]}
          ref={(el) => {
            colliderAnchorRefs.current.set(def.idSuffix, el);
          }}
        />
      ))}
    </group>
  );
}

export default function GhostFleet() {
  const gltf = useGLTF(GHOST_FLEET_NEAR_MODEL_URL) as unknown as { scene: THREE.Group };
  const hasSeededSpeckledSkyRef = useRef(false);

  useFrame((_, delta) => {
    if (!hasSeededSpeckledSkyRef.current) {
      // Wait until the player ship has a real runtime position before placing
      // Speckled Sky relative to it. The initial ref can still be a bootstrap value.
      const shipPos = shipPosRef.current;
      if (shipPos.lengthSq() > 1) {
        seedSpeckledSkyNearPlayer();
        hasSeededSpeckledSkyRef.current = true;
      }
    }

    for (const ship of GHOST_FLEET) {
      if (!ship.orbit) {
        ship.velocity.set(0, 0, 0);
        continue;
      }
      updateOrbitingGhostShip(ship, delta);
    }
  });

  useEffect(() => {
    for (const ship of GHOST_FLEET) {
      const pos = ship.position;
      registerDriveSignature({
        id: ship.id,
        label: ship.label,
        getPosition: (target) => target.copy(pos),
        getVelocity: (target) => target.copy(ship.velocity),
      });
    }
    return () => {
      for (const ship of GHOST_FLEET) {
        unregisterDriveSignature(ship.id);
      }
    };
  }, []);

  return (
    <>
      {GHOST_FLEET.map((ship) => (
        <GhostFleetShipModel key={ship.id} ship={ship} sourceModel={gltf.scene} />
      ))}
    </>
  );
}

useGLTF.preload(GHOST_FLEET_NEAR_MODEL_URL);
