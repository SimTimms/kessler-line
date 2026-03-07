import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { registerCollidable, unregisterCollidable } from '../context/CollisionRegistry';

// Seeded pseudo-random (mulberry32) — same pattern as AsteroidBelt
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type DebrisGeoType =
  | 'hull'       // flat wide box — hull plating
  | 'strut'      // tall thin box — structural strut
  | 'container'  // box — cargo/storage container
  | 'solar'      // very flat wide box — solar panel fragment
  | 'engine'     // cylinder-ish (box) — engine casing
  | 'meteorite'  // icosahedron — rocky chunk
  | 'water'      // cylinder — water/coolant tank
  | 'coolant'    // sphere — coolant pod
  | 'o2'         // cylinder — O2 canister
  | 'fuel';      // sphere — fuel pod

export interface DebrisEntry {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  isMagnetic: boolean;
  label: string;
  geoType: DebrisGeoType;
  rotSpeed: THREE.Vector3;
  /** Bounding sphere radius used for collision */
  radius: number;
}

const DEBRIS_DEFS: Array<{ geoType: DebrisGeoType; label: string; isMagnetic: boolean; count: number }> = [
  { geoType: 'hull',      label: 'Hull Fragment',   isMagnetic: true,  count: 8 },
  { geoType: 'strut',     label: 'Steel Strut',     isMagnetic: true,  count: 6 },
  { geoType: 'container', label: 'Metal Container', isMagnetic: true,  count: 5 },
  { geoType: 'solar',     label: 'Solar Panel',     isMagnetic: true,  count: 5 },
  { geoType: 'engine',    label: 'Engine Casing',   isMagnetic: true,  count: 4 },
  { geoType: 'meteorite', label: 'Meteorite',       isMagnetic: false, count: 8 },
  { geoType: 'water',     label: 'Water Tank',      isMagnetic: false, count: 5 },
  { geoType: 'coolant',   label: 'Coolant Pod',     isMagnetic: false, count: 4 },
  { geoType: 'o2',        label: 'O2 Tank',         isMagnetic: false, count: 5 },
  { geoType: 'fuel',      label: 'Fuel Pod',        isMagnetic: false, count: 4 },
];

function generateDebrisData(): DebrisEntry[] {
  const rng = mulberry32(9417);
  const entries: DebrisEntry[] = [];
  let idx = 0;

  for (const def of DEBRIS_DEFS) {
    for (let i = 0; i < def.count; i++) {
      // Spherical distribution around origin, 1500–7500 units out
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const dist = 1500 + rng() * 6000;

      const x = dist * Math.sin(phi) * Math.cos(theta);
      rng(); // consume slot (keeps downstream positions stable)
      const y = 0;
      const z = dist * Math.sin(phi) * Math.sin(theta);

      const base = 4 + rng() * 14; // base scale 4–18 units
      let sx = base, sy = base, sz = base;

      // Shape-specific proportions
      if (def.geoType === 'hull')   { sx *= 2.8; sy *= 0.25; sz *= 1.6; }
      if (def.geoType === 'strut')  { sx *= 0.25; sy *= 3.5; sz *= 0.25; }
      if (def.geoType === 'solar')  { sx *= 3.2; sy *= 0.08; sz *= 2.0; }
      if (def.geoType === 'water')  { sx *= 0.6; sy *= 1.8; sz *= 0.6; }
      if (def.geoType === 'o2')     { sx *= 0.4; sy *= 2.2; sz *= 0.4; }

      const radius = Math.max(sx, sy, sz) * 0.55;

      entries.push({
        id: `debris-${idx++}`,
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(
          rng() * Math.PI * 2,
          rng() * Math.PI * 2,
          rng() * Math.PI * 2,
        ),
        scale: new THREE.Vector3(sx, sy, sz),
        isMagnetic: def.isMagnetic,
        label: def.label,
        geoType: def.geoType,
        rotSpeed: new THREE.Vector3(
          (rng() - 0.5) * 0.18,
          (rng() - 0.5) * 0.18,
          (rng() - 0.5) * 0.18,
        ),
        radius,
      });
    }
  }
  return entries;
}

/** All debris entries — positions are static world-space; exported for MagneticHUD. */
export const debrisEntries: DebrisEntry[] = generateDebrisData();

// ─── Shared geometries ────────────────────────────────────────────────────────
const BOX_GEO    = new THREE.BoxGeometry(1, 1, 1);
const ICOSA_GEO  = new THREE.IcosahedronGeometry(1, 1);
const SPHERE_GEO = new THREE.SphereGeometry(1, 8, 6);
const CYL_GEO    = new THREE.CylinderGeometry(0.45, 0.45, 1, 10);

function getGeometry(geoType: DebrisGeoType): THREE.BufferGeometry {
  if (geoType === 'meteorite')               return ICOSA_GEO;
  if (geoType === 'coolant' || geoType === 'fuel') return SPHERE_GEO;
  if (geoType === 'water' || geoType === 'o2' || geoType === 'engine') return CYL_GEO;
  return BOX_GEO;
}

// ─── Shared materials ─────────────────────────────────────────────────────────
const MAT_HULL      = new THREE.MeshStandardMaterial({ color: '#7a7a7a', metalness: 0.92, roughness: 0.28 });
const MAT_STRUT     = new THREE.MeshStandardMaterial({ color: '#505050', metalness: 0.97, roughness: 0.18 });
const MAT_CONTAINER = new THREE.MeshStandardMaterial({ color: '#6e5f3a', metalness: 0.85, roughness: 0.35 });
const MAT_SOLAR     = new THREE.MeshStandardMaterial({ color: '#1a2d4e', metalness: 0.7,  roughness: 0.45, emissive: '#001140', emissiveIntensity: 0.4 });
const MAT_ENGINE    = new THREE.MeshStandardMaterial({ color: '#3a3a3a', metalness: 0.95, roughness: 0.22 });
const MAT_ROCKY     = new THREE.MeshStandardMaterial({ color: '#3d2e1c', roughness: 0.92, metalness: 0.04 });
const MAT_WATER     = new THREE.MeshStandardMaterial({ color: '#2255aa', roughness: 0.25, metalness: 0.12, transparent: true, opacity: 0.82 });
const MAT_COOLANT   = new THREE.MeshStandardMaterial({ color: '#00ddbb', roughness: 0.18, metalness: 0.1,  emissive: '#004433', emissiveIntensity: 0.55, transparent: true, opacity: 0.78 });
const MAT_O2        = new THREE.MeshStandardMaterial({ color: '#c8d8f0', roughness: 0.22, metalness: 0.55 });
const MAT_FUEL      = new THREE.MeshStandardMaterial({ color: '#ff6600', roughness: 0.32, metalness: 0.18, emissive: '#330a00', emissiveIntensity: 0.45 });

function getMaterial(geoType: DebrisGeoType): THREE.Material {
  switch (geoType) {
    case 'strut':     return MAT_STRUT;
    case 'container': return MAT_CONTAINER;
    case 'solar':     return MAT_SOLAR;
    case 'engine':    return MAT_ENGINE;
    case 'meteorite': return MAT_ROCKY;
    case 'water':     return MAT_WATER;
    case 'coolant':   return MAT_COOLANT;
    case 'o2':        return MAT_O2;
    case 'fuel':      return MAT_FUEL;
    default:          return MAT_HULL;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SpaceDebris() {
  const meshRefs = useRef<Array<THREE.Mesh | null>>(
    new Array(debrisEntries.length).fill(null),
  );

  // Register sphere colliders for each debris piece
  useEffect(() => {
    debrisEntries.forEach((entry, i) => {
      registerCollidable({
        id: entry.id,
        getWorldPosition: (target) => target.copy(entry.position),
        shape: { type: 'sphere', radius: entry.radius },
        getObject3D: () => meshRefs.current[i],
      });
    });
    return () => {
      debrisEntries.forEach((entry) => unregisterCollidable(entry.id));
    };
  }, []);

  // Slow tumble rotation each frame
  useFrame((_, delta) => {
    const refs = meshRefs.current;
    for (let i = 0; i < refs.length; i++) {
      const mesh = refs[i];
      if (!mesh) continue;
      const { rotSpeed } = debrisEntries[i];
      mesh.rotation.x += rotSpeed.x * delta;
      mesh.rotation.y += rotSpeed.y * delta;
      mesh.rotation.z += rotSpeed.z * delta;
    }
  });

  return (
    <group>
      {debrisEntries.map((entry, i) => (
        <mesh
          key={entry.id}
          ref={(el) => { meshRefs.current[i] = el; }}
          position={entry.position}
          rotation={entry.rotation}
          scale={entry.scale}
          geometry={getGeometry(entry.geoType)}
          material={getMaterial(entry.geoType)}
          castShadow={false}
          receiveShadow={false}
        />
      ))}
    </group>
  );
}
