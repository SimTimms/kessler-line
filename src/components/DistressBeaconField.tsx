import { memo, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { cascadePhase } from '../context/CinematicState';
import { shipPosRef } from '../context/ShipPos';

const MAX_BEACONS = 50;

const SHIP_NAMES = [
  'ACHERON-2',
  'SABLE-WING',
  'STELLAROSA',
  'IKORA',
  'CETUS-3',
  'VESSEL YANTARA',
  'BRASK-ACTUAL',
  'STATION MINERVA',
  'OUTRIDER-7',
  'TRANSPORT-09',
  'MV HELION',
  'MV PALLOR',
  'DRIFT-3',
  'RELAY THETA',
  'SUPPLY-22',
  'TANKER-BRAVO',
  'THE LONG HAUL',
  'FERRY-14',
  'KASTOR',
  'MERIDIAN',
  'COLDFIRE',
  'VAGRANT III',
  'MV BELKA',
  'MV EREBUS',
  'TRANSIT-06',
  'HERALD-3',
  'MV JUNO',
  'ORION-7',
  'SHUTTLE-4',
  'CERULEAN',
  'MV SOLVANG',
  'TC NESTOR',
  'TC CYGNUS-4',
  'PL IRONSIDE',
  'WAYPOINT-9',
  'DEPOT-KAPPA',
  'MV LUCENT',
  'RELAY-11',
  'SIRIX STATION',
  'FREIGHTER-09',
];

type Beacon3D = {
  id: number;
  name: string;
  position: [number, number, number];
  phaseOffset: number; // unique per beacon so they don't all pulse in sync
};

// ── Single beacon in 3D space ──────────────────────────────────────────────────

const SingleDistressBeacon = memo(function SingleDistressBeacon({
  position,
  name,
  phaseOffset,
}: {
  position: [number, number, number];
  name: string;
  phaseOffset: number;
}) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const mat1Ref = useRef<THREE.MeshBasicMaterial>(null!);
  const mat2Ref = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phaseOffset;

    // Pulsing core
    const pulse = 1 + Math.sin(t * 2.8) * 0.28;
    coreRef.current.scale.setScalar(pulse);

    // Ring 1: expands out and fades over 2.2s period
    const r1 = (t * 0.45) % 1;
    ring1Ref.current.scale.setScalar(1 + r1 * 4.8);
    mat1Ref.current.opacity = 0.55 * (1 - r1);

    // Ring 2: same but half-period offset
    const r2 = ((t * 0.45) + 0.5) % 1;
    ring2Ref.current.scale.setScalar(1 + r2 * 4.8);
    mat2Ref.current.opacity = 0.55 * (1 - r2);
  });

  return (
    <group position={position}>
      {/* Core sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial
          color="#ff2020"
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Soft glow halo */}
      <mesh>
        <sphereGeometry args={[11, 16, 16]} />
        <meshBasicMaterial
          color="#ff2010"
          transparent
          opacity={0.09}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Expanding wireframe ring 1 */}
      <mesh ref={ring1Ref}>
        <sphereGeometry args={[7, 10, 10]} />
        <meshBasicMaterial
          ref={mat1Ref}
          color="#ff5040"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          wireframe
        />
      </mesh>

      {/* Expanding wireframe ring 2 (offset) */}
      <mesh ref={ring2Ref}>
        <sphereGeometry args={[7, 10, 10]} />
        <meshBasicMaterial
          ref={mat2Ref}
          color="#ff5040"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          wireframe
        />
      </mesh>

      {/* HTML label above the sphere */}
      <Html center position={[0, 22, 0]}>
        <div
          style={{
            padding: '3px 7px 4px 7px',
            background: 'rgba(18,3,3,0.82)',
            border: '1px solid rgba(255,45,45,0.38)',
            fontFamily: "'Space Grotesk', 'Orbitron', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
          }}
        >
          <span className="db-word">DISTRESS</span>
          <span className="db-name">{name}</span>
        </div>
      </Html>
    </group>
  );
});

// ── Field: manages spawning and holds all beacon instances ────────────────────

export default function DistressBeaconField() {
  const [beacons, setBeacons] = useState<Beacon3D[]>([]);
  const activeRef = useRef(false);
  const countRef = useRef(0);
  const nextIdRef = useRef(0);
  const timeoutRef = useRef(0);

  useEffect(() => {
    const spawnOne = () => {
      if (
        !activeRef.current ||
        cascadePhase.current !== 'during' ||
        countRef.current >= MAX_BEACONS
      )
        return;

      const name = SHIP_NAMES[Math.floor(Math.random() * SHIP_NAMES.length)];

      // Scatter randomly around the ship in a sphere, biased to be nearby-ish
      const ship = shipPosRef.current;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dist = 50000 + Math.random() * 50000;
      const pos: [number, number, number] = [
        ship.x + Math.sin(phi) * Math.cos(theta) * dist,
        ship.y + (Math.random() - 0.5) * dist * 0.35,
        ship.z + Math.sin(phi) * Math.sin(theta) * dist,
      ];

      setBeacons((prev) => [
        ...prev,
        { id: nextIdRef.current++, name, position: pos, phaseOffset: Math.random() * Math.PI * 2 },
      ]);
      countRef.current++;

      // Interval accelerates as panic builds: 2.5s → 0.4s
      const progress = countRef.current / MAX_BEACONS;
      const delay = Math.max(350, 2500 - progress * 2100 + (Math.random() - 0.5) * 500);
      timeoutRef.current = window.setTimeout(spawnOne, delay);
    };

    const poll = window.setInterval(() => {
      const phase = cascadePhase.current;
      if (phase === 'during' && !activeRef.current) {
        activeRef.current = true;
        spawnOne();
      } else if (phase === 'pre' && activeRef.current) {
        // Debug panel reset
        activeRef.current = false;
        window.clearTimeout(timeoutRef.current);
        countRef.current = 0;
        setBeacons([]);
      }
    }, 250);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      {beacons.map((b) => (
        <SingleDistressBeacon
          key={b.id}
          position={b.position}
          name={b.name}
          phaseOffset={b.phaseOffset}
        />
      ))}
    </>
  );
}
