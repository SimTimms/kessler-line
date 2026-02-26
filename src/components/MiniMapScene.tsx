import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  MINIMAP_SCALE,
  SPACE_STATION_DEF,
  NEPTUNE_DEF,
  RADIO_BEACON_DEFS,
  type WorldObjectDef,
} from '../config/worldConfig';
import { minimapShipPosition } from '../context/MinimapShipPosition';

export type HoverInfo = { label: string; x: number; y: number };

interface MiniMapSceneProps {
  onHover: (info: HoverInfo | null) => void;
}

function Dot({ def, onHover }: { def: WorldObjectDef; onHover: (info: HoverInfo | null) => void }) {
  const [x, , z] = def.minimapScenePos ??
    [def.position[0] * MINIMAP_SCALE, 0, def.position[2] * MINIMAP_SCALE];
  return (
    <mesh
      position={[x, 0, z]}
      onPointerEnter={(e) => onHover({ label: def.label, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })}
      onPointerLeave={() => onHover(null)}
    >
      <sphereGeometry args={[def.minimapRadius ?? 0.3, 8, 8]} />
      <meshBasicMaterial color={def.minimapColor} />
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
      minimapShipPosition.z * MINIMAP_SCALE,
    );
  });

  return (
    <>
      <Dot def={SPACE_STATION_DEF} onHover={onHover} />
      <Dot def={NEPTUNE_DEF} onHover={onHover} />
      {RADIO_BEACON_DEFS.map((def) => (
        <Dot key={def.id} def={def} onHover={onHover} />
      ))}
      <mesh
        ref={shipDotRef}
        onPointerEnter={(e) => onHover({ label: 'Your Ship', x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })}
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  );
}
