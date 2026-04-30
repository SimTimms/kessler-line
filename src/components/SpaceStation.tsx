import { useGLTF } from '@react-three/drei';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import DockingBay from './WorldObjects/DockingBay';
import { registerCollidable, unregisterCollidable } from '../context/CollisionRegistry';

const _shipWorld = new THREE.Vector3();
const _shipLocal = new THREE.Vector3();
const _dockWorld = new THREE.Vector3();
const _dockLocal = new THREE.Vector3();

// ── Station model placement ───────────────────────────────────────────────────
const STATION_MODEL_SCALE = 0.1;
const STATION_MODEL_OFFSET: [number, number, number] = [0, 10.5, 7];

// ── Docking bay setup ────────────────────────────────────────────────────────
const TUTORIAL_DOCKING_STATION_ID = 'tutorial-space-station';
const DOCKING_BAY_ROTATION: [number, number, number] = [0, 0, 0];
const DOCKING_BAY_LOCAL_Y_OFFSET = -1.5;
const DOCKING_BAY_LOCAL_ORIGIN: [number, number, number] = [0, 0, 0];
const TUTORIAL_DOCKING_BAY_DIMENSIONS = new THREE.Vector3(2, 0.3, 0.1);

// ── Spotlight + emitter appearance ───────────────────────────────────────────
const SPOTLIGHT_COLOR = '#9ee9ff';
const SPOTLIGHT_INTENSITY = 50;
const SPOTLIGHT_DISTANCE = 1500;
const SPOTLIGHT_ANGLE = 0.28;
const SPOTLIGHT_PENUMBRA = 0.5;
const SPOTLIGHT_DECAY = 1.5;

const SPOTLIGHT_EMITTER_ROTATION: [number, number, number] = [Math.PI * 0.5, 0, 0];
const SPOTLIGHT_EMITTER_GEOMETRY: [number, number, number, number] = [0.3, 0.3, 0.22, 20];
const SPOTLIGHT_EMITTER_COLOR = '#0e2f3a';
const SPOTLIGHT_EMITTER_EMISSIVE_INTENSITY = 8;
const SPOTLIGHT_EMITTER_ROUGHNESS = 0.25;
const SPOTLIGHT_EMITTER_METALNESS = 0.2;

// ── Extra station-top collision box (debug/tuning aid) ──────────────────────
const STATION_TOP_COLLISION_ID = 'tutorial-space-station-top-collision';
const STATION_TOP_COLLISION_LOCAL_OFFSET: [number, number, number] = [0, 2.25, 8.8];
const STATION_TOP_COLLISION_SIZE: [number, number, number] = [6, 4, 17];
const STATION_TOP_COLLISION_HALF_EXTENTS = new THREE.Vector3(
  STATION_TOP_COLLISION_SIZE[0] * 0.5,
  STATION_TOP_COLLISION_SIZE[1] * 0.5,
  STATION_TOP_COLLISION_SIZE[2] * 0.5
);
const SHOW_STATION_TOP_COLLISION_DEBUG = true;

interface SpaceStationProps {
  /** Optional ship position ref; when provided, spotlight tracks this world-space point. */
  followTargetRef?: MutableRefObject<THREE.Vector3>;
  /** Spotlight emitter origin in station-local space (tune this to your tower tip). */
  spotlightLocalOrigin?: [number, number, number];
  enableTrackingSpotlight?: boolean;
  /** When set, keep docking bay center fixed at this world-space Y value. */
  dockingBayWorldY?: number | null;
}

export function SpaceStation({
  followTargetRef,
  spotlightLocalOrigin = [0, 60, 0],
  enableTrackingSpotlight = false,
  dockingBayWorldY = null,
}: SpaceStationProps) {
  const gltf = useGLTF('/capital-station.glb') as unknown as { scene: THREE.Group };
  const stationRef = useRef<THREE.Group>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const spotTargetRef = useRef<THREE.Object3D>(null);
  const dockingBayAnchorRef = useRef<THREE.Group>(null);
  const topCollisionRef = useRef<THREE.Mesh>(null);

  const dockingLocalFromSpotlight: [number, number, number] = [
    spotlightLocalOrigin[0],
    spotlightLocalOrigin[1] + DOCKING_BAY_LOCAL_Y_OFFSET,
    spotlightLocalOrigin[2],
  ];

  useEffect(() => {
    if (!enableTrackingSpotlight || !spotRef.current || !spotTargetRef.current) return;
    spotRef.current.target = spotTargetRef.current;
  }, [enableTrackingSpotlight]);

  useEffect(() => {
    registerCollidable({
      id: STATION_TOP_COLLISION_ID,
      stationId: TUTORIAL_DOCKING_STATION_ID,
      getWorldPosition: (target) => {
        if (topCollisionRef.current) topCollisionRef.current.getWorldPosition(target);
        return target;
      },
      getWorldQuaternion: (target) => {
        if (topCollisionRef.current) topCollisionRef.current.getWorldQuaternion(target);
        return target;
      },
      shape: { type: 'box', halfExtents: STATION_TOP_COLLISION_HALF_EXTENTS },
      getObject3D: () => topCollisionRef.current,
    });
    return () => {
      unregisterCollidable(STATION_TOP_COLLISION_ID);
    };
  }, []);

  useFrame(() => {
    const station = stationRef.current;
    if (!station) return;

    if (enableTrackingSpotlight && followTargetRef?.current && spotTargetRef.current) {
      // Convert ship world position into station-local space so the spotlight target
      // stays valid while the station group is transformed by parent wrappers.
      _shipWorld.copy(followTargetRef.current);
      _shipLocal.copy(_shipWorld);
      station.worldToLocal(_shipLocal);
      spotTargetRef.current.position.copy(_shipLocal);
      spotTargetRef.current.updateMatrixWorld();
    }

    if (dockingBayWorldY !== null && dockingBayAnchorRef.current) {
      // Keep bay X/Z tied to station-local origin point, but pin world Y.
      _dockWorld.set(...dockingLocalFromSpotlight);
      station.localToWorld(_dockWorld);
      _dockWorld.y = dockingBayWorldY;
      _dockLocal.copy(_dockWorld);
      station.worldToLocal(_dockLocal);
      dockingBayAnchorRef.current.position.copy(_dockLocal);
    }
  });
  const dockingBayPosition =
    dockingBayWorldY === null
      ? new THREE.Vector3(...dockingLocalFromSpotlight)
      : new THREE.Vector3(...DOCKING_BAY_LOCAL_ORIGIN);

  return (
    <group ref={stationRef}>
      <primitive object={gltf.scene} scale={STATION_MODEL_SCALE} position={STATION_MODEL_OFFSET} />
      <group ref={dockingBayWorldY !== null ? dockingBayAnchorRef : undefined}>
        <DockingBay
          stationId={TUTORIAL_DOCKING_STATION_ID}
          dimensions={TUTORIAL_DOCKING_BAY_DIMENSIONS}
          position={dockingBayPosition}
          rotation={DOCKING_BAY_ROTATION}
        />
        <mesh
          ref={topCollisionRef}
          position={[
            dockingBayPosition.x + STATION_TOP_COLLISION_LOCAL_OFFSET[0],
            dockingBayPosition.y + STATION_TOP_COLLISION_LOCAL_OFFSET[1],
            dockingBayPosition.z + STATION_TOP_COLLISION_LOCAL_OFFSET[2],
          ]}
          visible={SHOW_STATION_TOP_COLLISION_DEBUG}
        >
          <boxGeometry args={STATION_TOP_COLLISION_SIZE} />
          <meshBasicMaterial color="#ff66cc" transparent opacity={0} depthWrite={false} wireframe />
        </mesh>
      </group>
      {enableTrackingSpotlight && (
        <>
          <spotLight
            ref={spotRef}
            position={spotlightLocalOrigin}
            color={SPOTLIGHT_COLOR}
            intensity={SPOTLIGHT_INTENSITY}
            distance={SPOTLIGHT_DISTANCE}
            angle={SPOTLIGHT_ANGLE}
            penumbra={SPOTLIGHT_PENUMBRA}
            decay={SPOTLIGHT_DECAY}
            castShadow={false}
          />
          <mesh position={spotlightLocalOrigin} rotation={SPOTLIGHT_EMITTER_ROTATION}>
            <cylinderGeometry args={SPOTLIGHT_EMITTER_GEOMETRY} />
            <meshStandardMaterial
              color={SPOTLIGHT_EMITTER_COLOR}
              emissive={SPOTLIGHT_COLOR}
              emissiveIntensity={SPOTLIGHT_EMITTER_EMISSIVE_INTENSITY}
              roughness={SPOTLIGHT_EMITTER_ROUGHNESS}
              metalness={SPOTLIGHT_EMITTER_METALNESS}
              toneMapped={false}
            />
          </mesh>
          <object3D ref={spotTargetRef} />
        </>
      )}
    </group>
  );
}
