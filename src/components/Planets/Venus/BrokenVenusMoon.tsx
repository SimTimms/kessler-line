import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../../../context/SolarSystemMinimap';
import { PLANETS, SOLAR_SYSTEM_SCALE } from '../SolarSystem';

// Moon orbits Venus once every ~35 real minutes
const MOON_ORBIT_SPEED = (2 * Math.PI) / 10100;
const DEBRIS_COUNT = 260;

// ── Seeded PRNG ────────────────────────────────────────────────────────────────
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

// ── Chunk geometry ────────────────────────────────────────────────────────────
// Uses a high-resolution SphereGeometry (indexed) so the intact hemisphere is
// perfectly smooth. Only vertices facing the fracture direction are displaced,
// creating a jagged broken face while the rest stays spherical.
function buildChunkGeometry(
  seed: number,
  radius: number,
  fractureSide: -1 | 1
): THREE.BufferGeometry {
  // 64×64 gives ~4k verts — enough for smooth curves with no visible facets
  const geo = new THREE.SphereGeometry(radius, 64, 64);
  const rng = mulberry32(seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len < 0.001) continue;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // Smooth blend: 0 on the intact side, ramps to 1 at the centre of the fracture face
    const dot = nx * fractureSide;
    const fractureFactor = Math.max(0, (dot - 0.1) / 0.9);

    // Intact side: micro-noise only (looks like gentle moon terrain)
    // Fracture side: heavy displacement that grows with fractureFactor
    const microNoise = (rng() - 0.5) * radius * 0.02;
    const fractureDisp = (rng() - 0.5) * radius * 0.2 * fractureFactor; // lower = less jagged fracture edge
    const disp = microNoise + fractureDisp;

    pos.setXYZ(i, x + nx * disp, y + ny * disp, z + nz * disp);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ── Procedural ice color map ──────────────────────────────────────────────────
// Frosty white-blue base with depth-blue zones, crystalline highlights, and
// subtle crack lines — like a Europa-style icy moon surface.
function buildIceColorMap(): THREE.CanvasTexture {
  const W = 2048,
    H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Frosty base
  ctx.fillStyle = '#c4edf5';
  ctx.fillRect(0, 0, W, H);

  let s = 44477;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  // Deeper blue zones — ice depth variation
  for (let i = 0; i < 9; i++) {
    const cx = rand() * W,
      cy = rand() * H,
      r = 90 + rand() * 210;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(30,120,155,${0.3 + rand() * 0.25})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // Bright crystalline/frosted patches
  for (let i = 0; i < 14; i++) {
    const cx = rand() * W,
      cy = rand() * H,
      r = 40 + rand() * 110;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(235,255,255,${0.45 + rand() * 0.3})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // Ice fracture / crack lines
  for (let i = 0; i < 28; i++) {
    let px = rand() * W,
      py = rand() * H;
    const segs = 4 + Math.floor(rand() * 5);
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let j = 0; j < segs; j++) {
      px += (rand() - 0.5) * 180;
      py += (rand() - 0.5) * 80;
      ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `rgba(20,70,110,${0.12 + rand() * 0.22})`;
    ctx.lineWidth = 0.5 + rand() * 2;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Procedural moon bump map ──────────────────────────────────────────────────
// Heavily cratered surface: overlapping impacts at four size scales.
// Mid-grey = flat; darker = depression; brighter = raised rim.
function buildMoonBumpMap(): THREE.CanvasTexture {
  const W = 2048,
    H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, W, H);

  let s = 98761;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  const drawCrater = (cx: number, cy: number, r: number, depth: number) => {
    // Bowl
    const bowl = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    bowl.addColorStop(
      0,
      `rgba(${Math.floor(128 - depth)},${Math.floor(128 - depth)},${Math.floor(128 - depth)},0.9)`
    );
    bowl.addColorStop(
      0.7,
      `rgba(${Math.floor(128 - depth * 0.4)},${Math.floor(128 - depth * 0.4)},${Math.floor(128 - depth * 0.4)},0.5)`
    );
    bowl.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = bowl;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Raised rim
    const rim = Math.floor(128 + depth * 0.6);
    ctx.strokeStyle = `rgba(${rim},${rim},${rim},0.7)`;
    ctx.lineWidth = Math.max(1, r * 0.13);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Mega basins
  for (let i = 0; i < 8; i++)
    drawCrater(rand() * W, rand() * H, 120 + rand() * 180, 30 + rand() * 20);
  // Large craters
  for (let i = 0; i < 60; i++)
    drawCrater(rand() * W, rand() * H, 40 + rand() * 80, 42 + rand() * 22);
  // Medium craters
  for (let i = 0; i < 300; i++)
    drawCrater(rand() * W, rand() * H, 10 + rand() * 35, 50 + rand() * 28);
  // Small craters
  for (let i = 0; i < 900; i++)
    drawCrater(rand() * W, rand() * H, 3 + rand() * 9, 52 + rand() * 30);
  // Micro pits
  for (let i = 0; i < 2500; i++)
    drawCrater(rand() * W, rand() * H, 1 + rand() * 3, 40 + rand() * 25);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Small debris rock geometry ────────────────────────────────────────────────
// Low-poly icosahedron with non-uniform scaling applied at instance level — the
// faceted look is intentional for small rock chunks.
function buildDebrisGeometry(radius: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  geo.computeVertexNormals();
  return geo;
}

// ── Per-debris tumble data ────────────────────────────────────────────────────
interface DebrisInstance {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  rotSpeed: THREE.Vector3;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BrokenVenusMoon() {
  const venus = PLANETS.find((p) => p.name === 'Venus');
  const venusLocalRadius = venus?.radius ?? 38.7;
  const venusWorldRadius = venusLocalRadius * SOLAR_SYSTEM_SCALE;

  // All sizes in world units
  const MOON_ORBIT_RADIUS = venusWorldRadius * 6.5;
  const CHUNK_RADIUS = venusWorldRadius * 0.21;
  const CHUNK_SEPARATION = CHUNK_RADIUS * 4.6; // distance from system center to each chunk
  const DEBRIS_SPREAD_X = CHUNK_RADIUS * 3.8;
  const DEBRIS_SPREAD_YZ = CHUNK_RADIUS * 1.4;

  const systemRef = useRef<THREE.Group>(null!);
  const orbitRef = useRef<THREE.Group>(null!);
  const chunkARef = useRef<THREE.Mesh>(null!);
  const chunkBRef = useRef<THREE.Mesh>(null!);
  const debrisRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const chunkAGeo = useMemo(() => buildChunkGeometry(1117, CHUNK_RADIUS, -1), [CHUNK_RADIUS]);
  const debrisGeo = useMemo(() => buildDebrisGeometry(CHUNK_RADIUS * 0.075), [CHUNK_RADIUS]);

  const iceColorMap = useMemo(() => buildIceColorMap(), []);
  const moonBumpMap = useMemo(() => buildMoonBumpMap(), []);

  const chunkMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: iceColorMap,
        bumpMap: moonBumpMap,
        bumpScale: 5.0,
        color: '#9de4ee', // turquoise-blue tint
        transmission: 0.62, // glass-like light transmission
        roughness: 0.38, // frosted (not mirror-clear)
        metalness: 0.0,
        ior: 1.31, // ice index of refraction
        thickness: CHUNK_RADIUS * 0.45,
        attenuationColor: new THREE.Color('#30b8cc'),
        attenuationDistance: CHUNK_RADIUS * 0.35,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [iceColorMap, moonBumpMap, CHUNK_RADIUS]
  );

  const debrisMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: iceColorMap,
        bumpMap: moonBumpMap,
        bumpScale: 4.0,
        color: '#9de4ee',
        transmission: 0.55,
        roughness: 0.42,
        metalness: 0.0,
        ior: 1.31,
        thickness: CHUNK_RADIUS * 0.06,
        attenuationColor: new THREE.Color('#30b8cc'),
        attenuationDistance: CHUNK_RADIUS * 0.1,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [iceColorMap, moonBumpMap, CHUNK_RADIUS]
  );

  const debrisInstances = useMemo<DebrisInstance[]>(() => {
    const rng = mulberry32(55447);
    const instances: DebrisInstance[] = [];

    for (let i = 0; i < DEBRIS_COUNT; i++) {
      // Elongated cloud spread along the X axis (the axis between the two chunks)
      const t = rng() * 2 - 1;
      const x = t * DEBRIS_SPREAD_X;
      const y = (rng() - 0.5) * DEBRIS_SPREAD_YZ * 2;
      const z = (rng() - 0.5) * DEBRIS_SPREAD_YZ * 2;

      const s = 0.45 + rng() * 1.3;
      instances.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2),
        scale: new THREE.Vector3(s, s * (0.55 + rng() * 0.8), s * (0.55 + rng() * 0.8)),
        rotSpeed: new THREE.Vector3(
          (rng() - 0.5) * 0.006,
          (rng() - 0.5) * 0.006,
          (rng() - 0.5) * 0.006
        ),
      });
    }
    return instances;
  }, [DEBRIS_SPREAD_X, DEBRIS_SPREAD_YZ]);

  // Initial placement of debris instances
  useEffect(() => {
    if (!debrisRef.current) return;
    debrisInstances.forEach((inst, i) => {
      dummy.position.copy(inst.position);
      dummy.rotation.copy(inst.rotation);
      dummy.scale.copy(inst.scale);
      dummy.updateMatrix();
      debrisRef.current.setMatrixAt(i, dummy.matrix);
    });
    debrisRef.current.instanceMatrix.needsUpdate = true;
  }, [debrisInstances, dummy]);

  useFrame((_, delta) => {
    // Track Venus position
    const venusPos = solarPlanetPositions['Venus'];
    if (venusPos) {
      systemRef.current.position.set(
        venusPos.x * SOLAR_SYSTEM_SCALE,
        0,
        venusPos.z * SOLAR_SYSTEM_SCALE
      );
    }

    // Orbit around Venus
    orbitRef.current.rotation.y += MOON_ORBIT_SPEED * delta;

    // Slowly tumble each chunk independently
    if (chunkARef.current) {
      chunkARef.current.rotation.x += 0.00045 * delta;
      chunkARef.current.rotation.y += 0.0007 * delta;
    }
    if (chunkBRef.current) {
      chunkBRef.current.rotation.y -= 0.00055 * delta;
      chunkBRef.current.rotation.z += 0.00038 * delta;
    }

    // Tumble debris
    if (debrisRef.current) {
      debrisInstances.forEach((inst, i) => {
        inst.rotation.x += inst.rotSpeed.x;
        inst.rotation.y += inst.rotSpeed.y;
        inst.rotation.z += inst.rotSpeed.z;
        dummy.position.copy(inst.position);
        dummy.rotation.copy(inst.rotation);
        dummy.scale.copy(inst.scale);
        dummy.updateMatrix();
        debrisRef.current.setMatrixAt(i, dummy.matrix);
      });
      debrisRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={systemRef}>
      <group ref={orbitRef}>
        <group position={[MOON_ORBIT_RADIUS, 0, 0]}>
          {/* Chunk A — left piece of the broken moon */}
          <mesh
            ref={chunkARef}
            geometry={chunkAGeo}
            material={chunkMaterial}
            position={[-CHUNK_SEPARATION, 0, 0]}
            rotation={[0, Math.PI, 0]}
          />

          {/* Debris field between and around the chunks */}
          <instancedMesh ref={debrisRef} args={[debrisGeo, debrisMaterial, DEBRIS_COUNT]} />
        </group>
      </group>
    </group>
  );
}
