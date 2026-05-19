import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Must match LunarLandscape.tsx SURFACE_Y
const SURFACE_Y = -920;
const DOME_RADIUS_BASE = 30;
const DOME_SCALE_MIN = 0.2; // outermost domes shrink to 20% of base
const VEHICLES_PER_ROAD = 3;
// Fraction of road length traveled per second
const VEHICLE_SPEED = 0.055;

// Habitat dome world positions [x, z]
// Inner cluster → middle ring → outer fringe, spreading radially
const DOME_POSITIONS: [number, number][] = [
  // Inner (~200–700 from origin)
  [80, 200],
  [-60, 380],
  [300, 300],
  [-250, 520],
  [460, 100],
  [-380, -180],
  [160, 620],
  [550, 420],
  // Middle (~700–1400)
  [-600, 700],
  [800, 200],
  [-100, 950],
  [600, 850],
  [-750, 200],
  [150, 1150],
  [-420, -580],
  [950, 550],
  // Far fringe (~1400–2200)
  [-850, 1300],
  [350, 1700],
  [1250, 350],
  [-1100, -350],
  [750, -950],
  [-150, 1900],
];

// Pairs of dome indices defining road connections
const ROADS: [number, number][] = [
  // Inner cluster
  [0, 1], [0, 2], [1, 3], [2, 4], [0, 5], [3, 6], [4, 7], [2, 7],
  // Inner → middle spokes
  [1, 8], [2, 9], [3, 10], [7, 11], [5, 12], [6, 13], [5, 14], [7, 15],
  // Middle cross-links
  [8, 10], [9, 11], [10, 13], [11, 15],
  // Middle → far spokes
  [8, 16], [13, 17], [9, 18], [12, 19], [14, 19], [15, 18], [20, 18],
  // Far arc
  [16, 17], [17, 21],
];

const TOTAL_VEHICLES = ROADS.length * VEHICLES_PER_ROAD;

// ---------------------------------------------------------------------------
// Per-dome radius — falls off from DOME_RADIUS_BASE to DOME_SCALE_MIN × base
// based on each dome's distance from the origin
// ---------------------------------------------------------------------------

const _domeDists = DOME_POSITIONS.map(([x, z]) => Math.sqrt(x * x + z * z));
const _minDist = Math.min(..._domeDists);
const _maxDist = Math.max(..._domeDists);

const DOME_RADII: number[] = _domeDists.map((dist) => {
  const t = (dist - _minDist) / (_maxDist - _minDist); // 0 = closest, 1 = furthest
  return DOME_RADIUS_BASE * (1 - t * (1 - DOME_SCALE_MIN));
});

// ---------------------------------------------------------------------------
// Building generation — deterministic per dome so layout never changes
// ---------------------------------------------------------------------------

interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  warm: boolean;
}

function generateBuildings(seed: number, domeRadius: number): Building[] {
  let s = seed;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };

  const scale = domeRadius / DOME_RADIUS_BASE;
  const target = Math.max(5, Math.floor((130 + Math.floor(rand() * 6)) * scale));
  const buildings: Building[] = [];
  const maxAttempts = target * 30;

  for (let attempt = 0; attempt < maxAttempts && buildings.length < target; attempt++) {
    const w = (4 + rand() * 4) * scale;
    const d = (4 + rand() * 4) * scale;
    const h = (4 + rand() * 4) * scale;
    const r = (20 + rand() * (DOME_RADIUS_BASE + 3)) * scale;
    const angle = rand() * Math.PI * 2;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const warm = rand() > 0.4;

    buildings.push({ x, z, w, d, h, warm });
  }

  return buildings;
}

// Computed once at module load — no React overhead
const DOME_BUILDINGS: Building[][] = DOME_POSITIONS.map(
  (_, di) => generateBuildings((di + 1) * 7919, DOME_RADII[di])
);

// ---------------------------------------------------------------------------
// Road-side building generation — deterministic strips along each road
// ---------------------------------------------------------------------------

interface RoadBuilding {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  warm: boolean;
}

function generateRoadBuildings(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  seed: number
): RoadBuilding[] {
  let s = seed;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };

  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.sqrt(dx * dx + dz * dz);
  const ux = dx / length;
  const uz = dz / length;
  const px = -uz;
  const pz = ux;

  const count = Math.max(3, Math.floor(length / 28));
  const buildings: RoadBuilding[] = [];

  for (let i = 0; i < count; i++) {
    const t = 0.15 + rand() * 0.7;
    const side = (rand() > 0.5 ? 1 : -1) * (9 + rand() * 7);

    const cx = ax + ux * (t * length) + px * side;
    const cz = az + uz * (t * length) + pz * side;

    const w = 3 + rand() * 5;
    const d = 3 + rand() * 5;
    const h = 2 + rand() * 6;

    buildings.push({ x: cx, z: cz, w, d, h, warm: rand() > 0.5 });
  }

  return buildings;
}

const ROAD_BUILDINGS: RoadBuilding[][] = ROADS.map(([ai, bi], ri) =>
  generateRoadBuildings(
    DOME_POSITIONS[ai][0],
    DOME_POSITIONS[ai][1],
    DOME_POSITIONS[bi][0],
    DOME_POSITIONS[bi][1],
    (ri + 1) * 6271
  )
);

// ---------------------------------------------------------------------------
// Static light particles — one point per window/lamp, never move
// ---------------------------------------------------------------------------

const DOME_LIGHTS: Float32Array[] = DOME_BUILDINGS.map((buildings, di) => {
  let s = (di + 1) * 3571;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
  const pts: number[] = [];
  for (const b of buildings) {
    const count = 1 + Math.floor(rand() * 2);
    for (let k = 0; k < count; k++) {
      pts.push(b.x + (rand() - 0.5) * b.w * 0.5);
      pts.push(0.8 + rand() * b.h * 0.55);
      pts.push(b.z + (rand() - 0.5) * b.d * 0.5);
    }
  }
  return new Float32Array(pts);
});

// Per-dome instance matrices — one Matrix4 per building, computed once
const _dummy = new THREE.Object3D();
const DOME_INSTANCE_MATRICES: THREE.Matrix4[][] = DOME_BUILDINGS.map((buildings) =>
  buildings.map((b) => {
    _dummy.position.set(b.x, b.h / 2, b.z);
    _dummy.scale.set(b.w, b.h, b.d);
    _dummy.updateMatrix();
    return _dummy.matrix.clone();
  })
);

// Road-side lights in world space
const ROAD_LIGHTS: Float32Array = (() => {
  const pts: number[] = [];
  ROAD_BUILDINGS.forEach((buildings, ri) => {
    let s = (ri + 1) * 4831;
    const rand = () => {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };
    for (const b of buildings) {
      const count = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < count; k++) {
        pts.push(b.x + (rand() - 0.5) * b.w * 0.5);
        pts.push(SURFACE_Y + 0.8 + rand() * b.h * 0.55);
        pts.push(b.z + (rand() - 0.5) * b.d * 0.5);
      }
    }
  });
  return new Float32Array(pts);
})();

export default function LunarSettlement() {
  const particleGeomRef = useRef<THREE.BufferGeometry>(null);

  const particlePositions = useMemo(() => new Float32Array(TOTAL_VEHICLES * 3), []);

  const roadLinePositions = useMemo(() => {
    const buf = new Float32Array(ROADS.length * 2 * 3);
    let i = 0;
    for (const [ai, bi] of ROADS) {
      buf[i++] = DOME_POSITIONS[ai][0];
      buf[i++] = SURFACE_Y + 2;
      buf[i++] = DOME_POSITIONS[ai][1];
      buf[i++] = DOME_POSITIONS[bi][0];
      buf[i++] = SURFACE_Y + 2;
      buf[i++] = DOME_POSITIONS[bi][1];
    }
    return buf;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    let vi = 0;
    for (const [ai, bi] of ROADS) {
      const ax = DOME_POSITIONS[ai][0], az = DOME_POSITIONS[ai][1];
      const bx = DOME_POSITIONS[bi][0], bz = DOME_POSITIONS[bi][1];
      for (let p = 0; p < VEHICLES_PER_ROAD; p++) {
        const frac = (t * VEHICLE_SPEED + Math.random() * 0.001 + p / VEHICLES_PER_ROAD) % 1.0;
        particlePositions[vi * 3]     = ax + (bx - ax) * frac;
        particlePositions[vi * 3 + 1] = SURFACE_Y + 3;
        particlePositions[vi * 3 + 2] = az + (bz - az) * frac;
        vi++;
      }
    }
    if (particleGeomRef.current) {
      const posAttr = particleGeomRef.current.getAttribute('position') as THREE.BufferAttribute | null;
      if (posAttr) posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Habitat domes */}
      {DOME_POSITIONS.map(([x, z], i) => {
        const r = DOME_RADII[i];
        return (
          <group key={i} position={[x, SURFACE_Y, z]}>
            {/* Upper hemisphere dome shell */}
            <mesh>
              <sphereGeometry args={[r, 12, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial
                color="#000000"
                transparent
                opacity={0.9}
                roughness={0.5}
                metalness={1}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Glowing base ring at dome perimeter */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
              <ringGeometry args={[r * 1.27, r * 1.37, 48]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
            {/* Interior buildings — single instanced draw call per dome */}
            <instancedMesh
              args={[undefined, undefined, DOME_BUILDINGS[i].length]}
              ref={(mesh) => {
                if (!mesh) return;
                DOME_INSTANCE_MATRICES[i].forEach((mat, j) => mesh.setMatrixAt(j, mat));
                mesh.instanceMatrix.needsUpdate = true;
              }}
            >
              <boxGeometry />
              <meshStandardMaterial color="#222222" roughness={0.8} metalness={0.1} />
            </instancedMesh>
            {/* Static light particles among dome buildings */}
            <points position={[0, 3, 0]}>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[DOME_LIGHTS[i], 3]} />
              </bufferGeometry>
              <pointsMaterial color="#ffffff" size={0.8} sizeAttenuation />
            </points>
          </group>
        );
      })}

      {/* Road-side buildings */}
      {ROAD_BUILDINGS.map((buildings, ri) =>
        buildings.map((b, bi) => (
          <mesh key={`r${ri}-${bi}`} position={[b.x, SURFACE_Y + b.h / 2, b.z]}>
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

      {/* Static light particles among road-side buildings */}
      <points position={[0, 6, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ROAD_LIGHTS, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffe8a0" size={1.2} sizeAttenuation />
      </points>

      {/* Road light strips between domes */}
      <lineSegments position={[0, 10, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[roadLinePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#000000" />
      </lineSegments>

      {/* Animated vehicle particles travelling along each road */}
      <points position={[0, 10, 0]}>
        <bufferGeometry ref={particleGeomRef}>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#FFFFFF" size={1} sizeAttenuation />
      </points>
    </group>
  );
}
