/**
 * Retro-burn thruster particle FX for the AIScrapper.
 *
 * Rendered as a child of the scrapper's <group> so the emitter anchor
 * positions are in scrapper-local space — adjust SCRAPPER_EMITTER_A/B in
 * scrapperConfig.ts to align with the model nozzles.
 *
 * Particles are simulated in local space and transformed to world space using
 * scrapperWorldPos + scrapperWorldQuat (same pattern as ThrusterParticles).
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrapperWorldQuat, scrapperForwardFiring } from '../../context/CinematicState';

// ── Particle pool config ──────────────────────────────────────────────────────
const POOL_SIZE = 800;
const EMIT_RATE = 400; // particles/second per nozzle
const BASE_SPEED = 400;
const BASE_LIFETIME = 0.1;
const TAPER_STRENGTH = 10;
const PARTICLE_SIZE = 10;

// Retro-burn emit direction: +X — after the 180° flip, +X faces away from Venus.
const EMIT_DIR = new THREE.Vector3(1, 0, 0);
// Forward (cruise) emit direction: -X — exhausts trail behind the ship.
const EMIT_DIR_FWD = new THREE.Vector3(-1, 0, 0);

const _worldPos = new THREE.Vector3();
const _emitDir = new THREE.Vector3();
const _localPos = new THREE.Vector3();
const _invWorld = new THREE.Matrix4();

type Particle = {
  active: boolean;
  age: number;
  maxAge: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  ox: number;
  oy: number;
  oz: number;
  dx: number; // world-space emit direction (for taper)
  dy: number;
  dz: number;
};

function makePool(): Particle[] {
  return Array.from({ length: POOL_SIZE }, () => ({
    active: false,
    age: 0,
    maxAge: 0,
    px: 0,
    py: 0,
    pz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    ox: 0,
    oy: 0,
    oz: 0,
    dx: 0,
    dy: 0,
    dz: 0,
  }));
}

function spawn(
  pool: Particle[],
  slotRef: { current: number },
  spawnWorldPos: THREE.Vector3,
  dir: THREE.Vector3 = EMIT_DIR
) {
  // Rotate emit direction from local → world space using current ship orientation
  _emitDir.copy(dir).applyQuaternion(scrapperWorldQuat);

  const jx = _emitDir.x + (Math.random() - 0.5) * 0.15;
  const jy = _emitDir.y + (Math.random() - 0.5) * 0.15;
  const jz = _emitDir.z + (Math.random() - 0.5) * 0.15;
  const jLen = Math.sqrt(jx * jx + jy * jy + jz * jz);
  const speed = BASE_SPEED * (0.7 + Math.random() * 0.6);
  const lifetime = BASE_LIFETIME * (1.7 + Math.random() * 0.6);

  const idx = slotRef.current;
  slotRef.current = (idx + 1) % POOL_SIZE;
  const p = pool[idx];
  p.active = true;
  p.age = 0;
  p.maxAge = lifetime;
  // Spawn at the emitter's actual world position (accounts for parent group offsets).
  p.px = p.ox = spawnWorldPos.x;
  p.py = p.oy = spawnWorldPos.y;
  p.pz = p.oz = spawnWorldPos.z;
  // Store world-space emit direction for per-particle taper
  p.dx = _emitDir.x;
  p.dy = _emitDir.y;
  p.dz = _emitDir.z;
  // Velocities are already in world space (direction was rotated above)
  p.vx = (jx / jLen) * speed;
  p.vy = (jy / jLen) * speed;
  p.vz = (jz / jLen) * speed;
}

export default function ScrapperThrusterFX() {
  // Forward-thrust pool
  const fwdPointsRef = useRef<THREE.Points>(null!);
  const fwdGeoRef = useRef<THREE.BufferGeometry>(null!);
  const fwdPositionsB = useMemo(() => new Float32Array(POOL_SIZE * 3), []);
  const fwdColors = useMemo(() => new Float32Array(POOL_SIZE * 3), []);
  const fwdPool = useRef<Particle[]>(makePool());
  const fwdSlotRef = useRef(0);
  const fwdAccumB = useRef(0);

  const spriteTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.65)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);

  const tickPool = (
    particles: Particle[],
    pos: Float32Array,
    col: Float32Array,
    pointsRefLocal: { current: THREE.Points | null },
    geoRefLocal: { current: THREE.BufferGeometry | null },
    delta: number
  ) => {
    // Compute world → local matrix once per frame so particle positions are
    // written in parent-group space (not double-transformed world space).
    const pts = pointsRefLocal.current;
    if (pts) {
      pts.updateWorldMatrix(true, false);
      _invWorld.copy(pts.matrixWorld).invert();
    }

    for (let i = 0; i < POOL_SIZE; i++) {
      const p = particles[i];
      if (!p.active) {
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
        pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0;
        continue;
      }
      p.age += delta;
      if (p.age >= p.maxAge) {
        p.active = false;
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
        pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0;
        continue;
      }

      // Advance in world space
      p.px += p.vx * delta;
      p.py += p.vy * delta;
      p.pz += p.vz * delta;

      // Taper toward world-space emit axis (stored per-particle at spawn time)
      const t = p.age / p.maxAge;
      const relX = p.px - p.ox,
        relY = p.py - p.oy,
        relZ = p.pz - p.oz;
      const axDot = relX * p.dx + relY * p.dy + relZ * p.dz;
      const pull = TAPER_STRENGTH * t * delta;
      p.px -= (relX - p.dx * axDot) * pull;
      p.py -= (relY - p.dy * axDot) * pull;
      p.pz -= (relZ - p.dz * axDot) * pull;

      // Convert world-space position to local (parent-group) space so the
      // points mesh — which is a child of the scrapper group — renders correctly.
      if (pts) {
        _localPos.set(p.px, p.py, p.pz).applyMatrix4(_invWorld);
        pos[i * 3] = _localPos.x;
        pos[i * 3 + 1] = _localPos.y;
        pos[i * 3 + 2] = _localPos.z;
      } else {
        pos[i * 3] = p.px;
        pos[i * 3 + 1] = p.py;
        pos[i * 3 + 2] = p.pz;
      }

      // Color: white-hot → blue → purple
      const brightness = Math.pow(1 - t, 0.7);
      let r = brightness * Math.max(0, 1 - t * 2.5);
      let g = brightness * Math.max(0.45, 1 - t * 0.9);
      let b = brightness;

      col[i * 3] = r;
      col[i * 3 + 1] = g;
      col[i * 3 + 2] = b;
    }

    if (!geoRefLocal.current) return;
    (geoRefLocal.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geoRefLocal.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  };

  useFrame((_, delta) => {
    // ── Forward-thrust emit ───────────────────────────────────────────────────
    if (scrapperForwardFiring.current) {
      fwdAccumB.current += EMIT_RATE * delta;
      const countB = Math.floor(fwdAccumB.current);
      fwdAccumB.current -= countB;
      if (countB > 0 && fwdPointsRef.current) {
        // Read world position from the <points> object — inherits the parent
        // group's [0,0,±80] offset so no manual offset math is needed.
        fwdPointsRef.current.getWorldPosition(_worldPos);
        for (let i = 0; i < countB; i++)
          spawn(fwdPool.current, fwdSlotRef, _worldPos, EMIT_DIR_FWD);
      }
    } else {
      fwdAccumB.current = 0;
    }

    tickPool(fwdPool.current, fwdPositionsB, fwdColors, fwdPointsRef, fwdGeoRef, delta);
  });

  return (
    <>
      <points ref={fwdPointsRef} frustumCulled={false}>
        <bufferGeometry ref={fwdGeoRef}>
          <bufferAttribute attach="attributes-position" args={[fwdPositionsB, 3]} />
          <bufferAttribute attach="attributes-color" args={[fwdColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={PARTICLE_SIZE}
          map={spriteTexture}
          alphaMap={spriteTexture}
          vertexColors
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </>
  );
}
