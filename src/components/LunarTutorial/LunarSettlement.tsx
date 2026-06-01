import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  LUNAR_MOON_RADIUS,
  LUNAR_SETTLEMENT_COVERAGE,
  LUNAR_SETTLEMENT_SEED,
  LUNAR_SETTLEMENT_SURFACE_LIFT,
} from '../../config/lunarLandscapeConfig';
import { buildSettlementLayout } from './settlement/buildSettlementLayout';
import { sampleRoadPosition } from './settlement/sampleRoadPosition';

export {
  buildSettlementLayout,
  coverageToAngularRadius,
  coverageToDomeCount,
  generateFlatDomePositions,
  buildRoadConnections,
} from './settlement/buildSettlementLayout';
export type { SettlementLayout, DomeLayout, RoadLayout, VehicleSlot } from './settlement/settlementTypes';

const VEHICLE_HOVER = 3;

const _vehiclePos = new THREE.Vector3();

interface LunarSettlementProps {
  moonRadius?: number;
  coverage?: number;
  scale?: number;
  seed?: number;
  domeCount?: number;
}

export default function LunarSettlement({
  moonRadius = LUNAR_MOON_RADIUS,
  coverage = LUNAR_SETTLEMENT_COVERAGE,
  scale = 1,
  seed = LUNAR_SETTLEMENT_SEED,
  domeCount,
}: LunarSettlementProps) {
  const layout = useMemo(
    () => buildSettlementLayout(moonRadius, coverage, scale, seed, domeCount),
    [moonRadius, coverage, scale, seed, domeCount]
  );
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const vehicleSlots = useMemo(() => layout.roads.flatMap((r) => r.vehicleSlots), [layout]);

  const particlePositions = useMemo(
    () => new Float32Array(vehicleSlots.length * 3),
    [vehicleSlots.length]
  );

  const particleGeomRef = useRef<THREE.BufferGeometry>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const { domes, roads, moonRadius: r } = layoutRef.current;
    const lift = LUNAR_SETTLEMENT_SURFACE_LIFT;

    vehicleSlots.forEach((slot, vi) => {
      const road = roads[slot.roadIndex];
      const frac = (t * slot.speed + slot.phase) % 1;
      sampleRoadPosition(
        domes[road.domeA].position,
        domes[road.domeB].position,
        frac,
        r,
        lift,
        VEHICLE_HOVER * scale,
        _vehiclePos
      );
      particlePositions[vi * 3] = _vehiclePos.x;
      particlePositions[vi * 3 + 1] = _vehiclePos.y;
      particlePositions[vi * 3 + 2] = _vehiclePos.z;
    });

    const geom = particleGeomRef.current;
    if (geom) {
      const attr = geom.getAttribute('position') as THREE.BufferAttribute | null;
      if (attr) attr.needsUpdate = true;
    }
  });

  return (
    <group renderOrder={2}>
      {layout.domes.map((dome, i) => (
        <group key={i} position={dome.position} quaternion={dome.quaternion}>
          <mesh>
            <sphereGeometry args={[dome.radius, 12, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#000000"
              transparent
              opacity={0.9}
              roughness={0.5}
              metalness={1}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
            <ringGeometry args={[dome.radius * 1.27, dome.radius * 1.37, 48]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
          <points position={[0, 3, 0]}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[dome.lights, 3]} />
            </bufferGeometry>
            <pointsMaterial color="#ffffff" size={0.8 * scale} sizeAttenuation />
          </points>
        </group>
      ))}

      {layout.domes.map((dome, i) => (
        <instancedMesh
          key={`dome-inst-${i}`}
          args={[undefined, undefined, dome.buildings.length]}
          position={dome.position}
          quaternion={dome.quaternion}
          ref={(mesh) => {
            if (!mesh) return;
            dome.instanceMatrices.forEach((mat, j) => mesh.setMatrixAt(j, mat));
            mesh.instanceMatrix.needsUpdate = true;
          }}
        >
          <boxGeometry />
          <meshStandardMaterial color="#222222" roughness={0.8} metalness={0.1} />
        </instancedMesh>
      ))}

      {layout.roads.map((road, ri) =>
        road.buildings.map((b, bi) => (
          <mesh key={`r${ri}-${bi}`} position={b.position} quaternion={b.quaternion}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color="#1a1a1a"
              roughness={0.9}
              metalness={0.2}
              emissive={b.warm ? '#3a2000' : '#001530'}
              emissiveIntensity={0.4}
            />
          </mesh>
        ))
      )}

      {layout.roadLights.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[layout.roadLights, 3]} />
          </bufferGeometry>
          <pointsMaterial color="#ffe8a0" size={1.2 * scale} sizeAttenuation />
        </points>
      )}

      {layout.roads.map((road, ri) => (
        <lineSegments key={`road-${ri}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[road.linePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#000000" />
        </lineSegments>
      ))}

      {vehicleSlots.length > 0 && (
        <points>
          <bufferGeometry ref={particleGeomRef}>
            <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial color="#ffffff" size={1 * scale} sizeAttenuation />
        </points>
      )}
    </group>
  );
}
