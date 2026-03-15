import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  MINIMAP_SCALE,
  SPACE_STATION_DEF,
  ASTEROID_DOCK_DEF,
  GREEN_PLANET_DEF,
  RADIO_BEACON_DEFS,
  type WorldObjectDef,
  RED_PLANET_DEF,
} from '../config/worldConfig';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { waypointPromptDef } from '../context/WaypointPrompt';
import { PLANETS, SOLAR_SYSTEM_SCALE } from './SolarSystem';
import { shipVelocity, shipQuaternion } from '../context/ShipState';
import { navTargetPosRef } from '../context/NavTarget';
import { neptuneNoFlyZoneActive } from '../context/CinematicState';

export type HoverInfo = { label: string; x: number; y: number };

interface MiniMapSceneProps {
  onHover: (info: HoverInfo | null) => void;
}

const NEPTUNE_NORMAL_COLOR = new THREE.Color('#00aaff');
const NEPTUNE_WARNING_COLOR = new THREE.Color('#ff2200');

// Derive planet minimap sizes from actual PLANETS data so relative sizing matches the scene.
// dotRadius = localRadius × SOLAR_SYSTEM_SCALE × MINIMAP_SCALE × 10 for visibility.
const SOLAR_PLANET_MINIMAP = PLANETS.map((p) => ({
  name: p.name,
  color: p.name === 'Earth' ? '#3399ff' : p.color,
  dotRadius: Math.max(p.radius * SOLAR_SYSTEM_SCALE * MINIMAP_SCALE * 10, 1.2),
  label: p.name,
  hasSaturnRings: p.name === 'Saturn',
}));

// ─── Orbit ring ────────────────────────────────────────────────────────────────
function OrbitRing({ radius, color }: { radius: number; color: string }) {
  const lineLoop = useMemo(() => {
    const segments = 128;
    const pts = new Float32Array(segments * 3);
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts[i * 3] = Math.cos(a) * radius;
      pts[i * 3 + 1] = -1001;
      pts[i * 3 + 2] = Math.sin(a) * radius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return new THREE.LineLoop(
      geo,
      new THREE.LineBasicMaterial({ color, opacity: 0.09, transparent: true }),
    );
  }, [radius, color]);

  return <primitive object={lineLoop} />;
}

// ─── Static world object dot ──────────────────────────────────────────────────
function Dot({
  def,
  onHover,
  onClick,
}: {
  def: WorldObjectDef;
  onHover: (info: HoverInfo | null) => void;
  onClick?: () => void;
}) {
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
      onClick={onClick}
    >
      <sphereGeometry args={[def.minimapRadius ?? 0.1, 8, 8]} />
      <meshBasicMaterial color={def.minimapColor} />
    </mesh>
  );
}

// ─── Orbiting beacon dot ───────────────────────────────────────────────────────
function BeaconDot({
  def,
  onHover,
}: {
  def: WorldObjectDef;
  onHover: (info: HoverInfo | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [x, , z] = def.minimapScenePos ?? [
    def.position[0] * MINIMAP_SCALE,
    0,
    def.position[2] * MINIMAP_SCALE,
  ];

  useFrame(({ clock }) => {
    if (!meshRef.current || !def.orbit) return;
    const planetPos = solarPlanetPositions[def.orbit.planetName];
    if (!planetPos) return;
    const angle = (def.orbit.phase ?? 0) + clock.getElapsedTime() * def.orbit.speed;
    const orbitX = Math.cos(angle) * def.orbit.radius;
    const orbitZ = Math.sin(angle) * def.orbit.radius;
    meshRef.current.position.set(
      planetPos.x * SOLAR_SYSTEM_SCALE * MINIMAP_SCALE + orbitX * MINIMAP_SCALE,
      0,
      planetPos.z * SOLAR_SYSTEM_SCALE * MINIMAP_SCALE + orbitZ * MINIMAP_SCALE,
    );
  });

  return (
    <mesh
      ref={meshRef}
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

// ─── Static game-world planet (not part of solar system orbit) ────────────────
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

// ─── Orbiting solar-system planet dot ─────────────────────────────────────────
type PlanetEntry = (typeof SOLAR_PLANET_MINIMAP)[number];

function SolarPlanetDot({
  entry,
  onHover,
}: {
  entry: PlanetEntry;
  onHover: (info: HoverInfo | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const isNeptune = entry.name === 'Neptune';

  const RAILGUN_RANGE_MINIMAP = 20000 * MINIMAP_SCALE; // 20 000 world units → minimap units

  // Warning ring for Neptune — dashed loop that pulses red when no-fly is active
  const warningRing = useMemo(() => {
    if (!isNeptune) return null;
    const r = entry.dotRadius * 2.5;
    const segments = 64;
    const pts = new Float32Array(segments * 3);
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts[i * 3] = Math.cos(a) * r;
      pts[i * 3 + 1] = 0;
      pts[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const mat = new THREE.LineDashedMaterial({
      color: NEPTUNE_WARNING_COLOR,
      dashSize: r * 0.3,
      gapSize: r * 0.15,
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    const loop = new THREE.LineLoop(geo, mat);
    loop.computeLineDistances();
    return loop;
  }, [isNeptune, entry.dotRadius]);

  // Railgun range ring — always visible, red dashed, radius = 20 000 world units
  const railgunRing = useMemo(() => {
    if (!isNeptune) return null;
    const r = RAILGUN_RANGE_MINIMAP;
    const segments = 128;
    const pts = new Float32Array(segments * 3);
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts[i * 3] = Math.cos(a) * r;
      pts[i * 3 + 1] = 0;
      pts[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const mat = new THREE.LineDashedMaterial({
      color: NEPTUNE_WARNING_COLOR,
      dashSize: r * 0.08,
      gapSize: r * 0.04,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
    });
    const loop = new THREE.LineLoop(geo, mat);
    loop.computeLineDistances();
    return loop;
  }, [isNeptune, RAILGUN_RANGE_MINIMAP]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pos = solarPlanetPositions[entry.name];
    if (pos) {
      groupRef.current.position.set(
        pos.x * SOLAR_SYSTEM_SCALE * MINIMAP_SCALE,
        -1000,
        pos.z * SOLAR_SYSTEM_SCALE * MINIMAP_SCALE,
      );
    }
    if (isNeptune && matRef.current && warningRing) {
      const warning = neptuneNoFlyZoneActive.current;
      matRef.current.color.copy(warning ? NEPTUNE_WARNING_COLOR : NEPTUNE_NORMAL_COLOR);
      matRef.current.opacity = warning ? 0.85 : 0.7;
      const ringMat = warningRing.material as THREE.LineDashedMaterial;
      ringMat.opacity = warning ? 0.5 + 0.4 * Math.sin(clock.getElapsedTime() * 4) : 0;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        onPointerEnter={(e) =>
          onHover({ label: entry.label, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
        }
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[entry.dotRadius, 12, 12]} />
        <meshBasicMaterial
          ref={matRef}
          color={isNeptune ? NEPTUNE_NORMAL_COLOR : entry.color}
          transparent={isNeptune}
          opacity={isNeptune ? 0.7 : 1}
        />
      </mesh>
      {entry.hasSaturnRings && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[entry.dotRadius * 1.7, entry.dotRadius * 2.6, 32]} />
          <meshBasicMaterial color="#e4d191" opacity={0.35} transparent side={THREE.DoubleSide} />
        </mesh>
      )}
      {warningRing && <primitive object={warningRing} />}
      {railgunRing && <primitive object={railgunRing} />}
    </group>
  );
}

// ─── Nav target marker ────────────────────────────────────────────────────────
function NavTargetMarker() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.position.set(
      navTargetPosRef.current.x * MINIMAP_SCALE,
      0.02,
      navTargetPosRef.current.z * MINIMAP_SCALE,
    );
    meshRef.current.rotation.y = clock.getElapsedTime() * 1.2;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.22, 0.06, 0.22]} />
      <meshBasicMaterial color="#ff9900" opacity={0.75} transparent />
    </mesh>
  );
}

// ─── Ship indicator: arrow + velocity vector + nav line ───────────────────────
const _shipFwd = new THREE.Vector3();

function ShipIndicator({ onHover }: { onHover: (info: HoverInfo | null) => void }) {
  const arrowRef = useRef<THREE.Mesh>(null!);

  // Flat arrowhead in XZ plane pointing +Z
  const arrowGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      0, 0, 0.5,       // tip
      -0.22, 0, -0.28, // left rear
      0.22, 0, -0.28,  // right rear
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setIndex([0, 1, 2]);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Velocity vector line object (updated each frame)
  const velLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#44ff88' }));
  }, []);

  // Nav target line object (updated each frame)
  const navLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    return new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: '#ff9900', opacity: 0.5, transparent: true }),
    );
  }, []);

  useFrame(() => {
    const sx = minimapShipPosition.x * MINIMAP_SCALE;
    const sz = minimapShipPosition.z * MINIMAP_SCALE;

    // Arrow heading
    if (arrowRef.current) {
      arrowRef.current.position.set(sx, 0.05, sz);
      _shipFwd.set(0, 0, 1).applyQuaternion(shipQuaternion);
      arrowRef.current.rotation.y = Math.atan2(_shipFwd.x, _shipFwd.z);
    }

    // Velocity line: scaled so typical speeds are visible (not literal scale)
    velLine.position.set(sx, 0.03, sz);
    const spd = shipVelocity.length();
    const velAttr = velLine.geometry.attributes.position as THREE.BufferAttribute;
    velAttr.setXYZ(0, 0, 0, 0);
    if (spd > 0.01) {
      const displayLen = Math.min(spd * 0.12, 4.0);
      velAttr.setXYZ(
        1,
        (shipVelocity.x / spd) * displayLen,
        0,
        (shipVelocity.z / spd) * displayLen,
      );
    } else {
      velAttr.setXYZ(1, 0, 0, 0);
    }
    velAttr.needsUpdate = true;

    // Nav target line: from ship to waypoint
    navLine.position.set(sx, 0.01, sz);
    const navAttr = navLine.geometry.attributes.position as THREE.BufferAttribute;
    navAttr.setXYZ(0, 0, 0, 0);
    navAttr.setXYZ(
      1,
      navTargetPosRef.current.x * MINIMAP_SCALE - sx,
      0,
      navTargetPosRef.current.z * MINIMAP_SCALE - sz,
    );
    navAttr.needsUpdate = true;
  });

  return (
    <>
      {/* Nav target line (rendered below velocity so velocity reads on top) */}
      <primitive object={navLine} />
      {/* Velocity vector */}
      <primitive object={velLine} />
      {/* Ship arrowhead */}
      <mesh
        ref={arrowRef}
        geometry={arrowGeo}
        onPointerEnter={(e) =>
          onHover({ label: 'Your Ship', x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
        }
        onPointerLeave={() => onHover(null)}
      >
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

// ─── Camera follow ─────────────────────────────────────────────────────────────
function CameraFollow() {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x = minimapShipPosition.x * MINIMAP_SCALE;
    camera.position.z = minimapShipPosition.z * MINIMAP_SCALE;
  });
  return null;
}

// ─── Scene root ────────────────────────────────────────────────────────────────
export default function MiniMapScene({ onHover }: MiniMapSceneProps) {
  return (
    <>
      <CameraFollow />
      {/* Faint orbit rings for all 8 planets */}
      {PLANETS.map((p) => (
        <OrbitRing
          key={p.name}
          radius={p.orbitRadius * SOLAR_SYSTEM_SCALE * MINIMAP_SCALE}
          color={p.name === 'Earth' ? '#3399ff' : p.color}
        />
      ))}

      {/* Sun at solar system center */}
      <mesh
        position={[0, -1000, 0]}
        onPointerEnter={(e) =>
          onHover({ label: 'Sun', x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
        }
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[3.5, 16, 16]} />
        <meshBasicMaterial color="#FDB813" />
      </mesh>

      {/* Orbiting solar-system planets */}
      {SOLAR_PLANET_MINIMAP.map((entry) => (
        <SolarPlanetDot key={entry.name} entry={entry} onHover={onHover} />
      ))}

      {/* Static game-world objects */}
      <Dot def={SPACE_STATION_DEF} onHover={onHover} />
      <Dot
        def={ASTEROID_DOCK_DEF}
        onHover={onHover}
        onClick={() => {
          waypointPromptDef.current = ASTEROID_DOCK_DEF;
        }}
      />
      <Planet def={GREEN_PLANET_DEF} onHover={onHover} />
      <Planet def={RED_PLANET_DEF} onHover={onHover} />

      {RADIO_BEACON_DEFS.map((def) => (
        <BeaconDot key={def.id} def={def} onHover={onHover} />
      ))}

      {/* Nav waypoint marker */}
      <NavTargetMarker />

      {/* Ship with heading arrow, velocity vector, nav line */}
      <ShipIndicator onHover={onHover} />
    </>
  );
}
