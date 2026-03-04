import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  MINIMAP_SCALE,
  SPACE_STATION_DEF,
  GREEN_PLANET_DEF,
  RADIO_BEACON_DEFS,
  type WorldObjectDef,
  RED_PLANET_DEF,
} from '../config/worldConfig';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';

export type HoverInfo = { label: string; x: number; y: number };

interface MiniMapSceneProps {
  onHover: (info: HoverInfo | null) => void;
}

function Dot({ def, onHover }: { def: WorldObjectDef; onHover: (info: HoverInfo | null) => void }) {
  const [x, , z] = def.minimapScenePos ?? [
    def.position[0] * MINIMAP_SCALE,
    0,
    def.position[2] * MINIMAP_SCALE,
  ];
  return (
    <mesh
      position={[x, 0, z]}
      onPointerEnter={(e) =>
        onHover({ label: def.label, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
      }
      onPointerLeave={() => onHover(null)}
    >
      <sphereGeometry args={[def.minimapRadius ?? 0.1, 8, 8]} />
      <meshBasicMaterial color={def.minimapColor} />
    </mesh>
  );
}

function Planet({
  def,
  onHover,
}: {
  def: WorldObjectDef;
  onHover: (info: HoverInfo | null) => void;
}) {
  const [x, , z] = def.minimapScenePos ?? [
    def.position[0] * MINIMAP_SCALE,
    0,
    def.position[2] * MINIMAP_SCALE,
  ];
  return (
    <mesh
      position={[x, -1000, z]}
      onPointerEnter={(e) =>
        onHover({ label: def.label, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
      }
      onPointerLeave={() => onHover(null)}
    >
      <sphereGeometry args={[def.minimapRadius ?? 0.3, 32, 32]} />
      <meshBasicMaterial color={def.minimapColor} />
    </mesh>
  );
}

// ─── Solar system planet dots ──────────────────────────────────────────────────
// Dot sizes are proportional to rendered world radius / 600 (MINIMAP_SCALE denominator)

const SOLAR_PLANET_MINIMAP = [
  { name: 'Mercury', color: '#b5a7a7', dotRadius: 0.11, label: 'Mercury' },
  { name: 'Venus',   color: '#e8cda0', dotRadius: 0.15, label: 'Venus'   },
  { name: 'Earth',   color: '#2277ff', dotRadius: 0.15, label: 'Earth'   },
  { name: 'Mars',    color: '#c1440e', dotRadius: 0.12, label: 'Mars'    },
  { name: 'Jupiter', color: '#c88b3a', dotRadius: 0.40, label: 'Jupiter' },
  { name: 'Saturn',  color: '#e4d191', dotRadius: 0.38, label: 'Saturn'  },
  { name: 'Uranus',  color: '#7de8e8', dotRadius: 0.27, label: 'Uranus'  },
  { name: 'Neptune', color: '#aabbff', dotRadius: 0.26, label: 'Neptune' },
] as const;

type PlanetEntry = (typeof SOLAR_PLANET_MINIMAP)[number];

function SolarPlanetDot({
  entry,
  onHover,
}: {
  entry: PlanetEntry;
  onHover: (info: HoverInfo | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const pos = solarPlanetPositions[entry.name];
    if (pos) {
      meshRef.current.position.set(
        pos.x * MINIMAP_SCALE,
        -1000,
        pos.z * MINIMAP_SCALE,
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerEnter={(e) =>
        onHover({ label: entry.label, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
      }
      onPointerLeave={() => onHover(null)}
    >
      <sphereGeometry args={[entry.dotRadius, 8, 8]} />
      <meshBasicMaterial color={entry.color} />
    </mesh>
  );
}

export default function MiniMapScene({ onHover }: MiniMapSceneProps) {
  const shipDotRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (!shipDotRef.current) return;
    shipDotRef.current.position.set(
      minimapShipPosition.x * MINIMAP_SCALE,
      0,
      minimapShipPosition.z * MINIMAP_SCALE
    );
  });

  return (
    <>
      <Dot def={SPACE_STATION_DEF} onHover={onHover} />
      <Planet def={GREEN_PLANET_DEF} onHover={onHover} />
      <Planet def={RED_PLANET_DEF} onHover={onHover} />

      {/* Sun — static at minimap centre (world [0,−3000,0] → x=0, z=0) */}
      <mesh
        position={[0, -1000, 0]}
        onPointerEnter={(e) =>
          onHover({ label: 'Sun', x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
        }
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshBasicMaterial color="#FDB813" />
      </mesh>

      {/* Orbiting solar-system planets */}
      {SOLAR_PLANET_MINIMAP.map((entry) => (
        <SolarPlanetDot key={entry.name} entry={entry} onHover={onHover} />
      ))}

      {RADIO_BEACON_DEFS.map((def) => (
        <Dot key={def.id} def={def} onHover={onHover} />
      ))}
      <mesh
        ref={shipDotRef}
        onPointerEnter={(e) =>
          onHover({ label: 'Your Ship', x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
        }
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  );
}
