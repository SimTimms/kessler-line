import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';
import {
  BREAKUP_ARC_AFTERGLOW,
  BREAKUP_ARC_AFTERGLOW_RATE,
  BREAKUP_ARC_BURST_COUNT,
  BREAKUP_ARC_COLOR,
  BREAKUP_ARC_CORE_COLOR,
  BREAKUP_ARC_FLICKER_RATE,
  BREAKUP_ARC_LIFETIME_MAX,
  BREAKUP_ARC_LIFETIME_MIN,
  BREAKUP_ARC_MAX_PARTICLES,
  BREAKUP_ARC_SIZE,
  BREAKUP_ARC_SPEED_MAX,
  BREAKUP_ARC_SPEED_MIN,
  BREAKUP_ARC_SPREAD_RADIUS,
  BREAKUP_GAS_COLOR,
  BREAKUP_GAS_DRAG,
  BREAKUP_GAS_LIFETIME_MAX,
  BREAKUP_GAS_LIFETIME_MIN,
  BREAKUP_GAS_MAX_PARTICLES,
  BREAKUP_GAS_OPACITY,
  BREAKUP_GAS_PER_BURST,
  BREAKUP_GAS_SIZE,
  BREAKUP_GAS_SPEED_MAX,
  BREAKUP_GAS_SPEED_MIN,
  BREAKUP_GAS_SPREAD_RADIUS,
  BREAKUP_PLATE_COLOR,
  BREAKUP_PLATE_DRAG,
  BREAKUP_PLATE_LIFETIME_MAX,
  BREAKUP_PLATE_LIFETIME_MIN,
  BREAKUP_PLATE_MAX,
  BREAKUP_PLATE_METALNESS,
  BREAKUP_PLATE_PER_BURST,
  BREAKUP_PLATE_ROUGHNESS,
  BREAKUP_PLATE_SCALE_L_MAX,
  BREAKUP_PLATE_SCALE_L_MIN,
  BREAKUP_PLATE_SCALE_T,
  BREAKUP_PLATE_SCALE_W_MAX,
  BREAKUP_PLATE_SCALE_W_MIN,
  BREAKUP_PLATE_SPEED_MAX,
  BREAKUP_PLATE_SPEED_MIN,
  BREAKUP_PLATE_SPREAD_RADIUS,
  BREAKUP_PLATE_TUMBLE_MAX,
  BREAKUP_PLATE_TUMBLE_MIN,
  EVENT_VESSEL_BREAKUP,
} from '../../config/combatConfig';

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
  /** Per-particle phase for irregular arc flicker. */
  phase: number;
  flickerRate: number;
};

type PlateChunk = {
  active: boolean;
  age: number;
  maxAge: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  /** Euler orientation (radians). */
  rx: number;
  ry: number;
  rz: number;
  /** Angular velocity (rad/s). */
  wx: number;
  wy: number;
  wz: number;
  sx: number;
  sy: number;
  sz: number;
};

type BreakupDetail = {
  point: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
};

type Afterglow = {
  origin: THREE.Vector3;
  baseVel: THREE.Vector3;
  age: number;
  accum: number;
};

const _anchor = new THREE.Vector3();
const _gasColor = new THREE.Color();
const _arcColor = new THREE.Color();
const _arcCore = new THREE.Color();
const _dir = new THREE.Vector3();
const _plateDummy = new THREE.Object3D();
const _plateEuler = new THREE.Euler();
/** Park idle pool slots far from the ship so oversized sprites can't silhouette. */
const PARKED = 1e7;

function parkParticle(pos: Float32Array, col: Float32Array, o: number): void {
  pos[o] = PARKED;
  pos[o + 1] = PARKED;
  pos[o + 2] = PARKED;
  col[o] = col[o + 1] = col[o + 2] = 0;
}

function makePool(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    active: false,
    age: 0,
    maxAge: 0,
    px: 0,
    py: 0,
    pz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    phase: 0,
    flickerRate: BREAKUP_ARC_FLICKER_RATE,
  }));
}

function makePlatePool(count: number): PlateChunk[] {
  return Array.from({ length: count }, () => ({
    active: false,
    age: 0,
    maxAge: 0,
    px: 0,
    py: 0,
    pz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    wx: 0,
    wy: 0,
    wz: 0,
    sx: 1,
    sy: 1,
    sz: 1,
  }));
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomUnit(out: THREE.Vector3): THREE.Vector3 {
  // Uniform direction on the sphere.
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const z = 2 * v - 1;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return out.set(r * Math.cos(theta), z, r * Math.sin(theta));
}

function makeSoftSprite(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function makeFlashSprite(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const c = 16;
  // Tight hot core + thin corona — reads as a sharp electrical pop.
  const core = ctx.createRadialGradient(c, c, 0, c, c, 4);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(1, 'rgba(180,230,255,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, 32, 32);
  const corona = ctx.createRadialGradient(c, c, 0, c, c, 14);
  corona.addColorStop(0, 'rgba(120,200,255,0.85)');
  corona.addColorStop(0.35, 'rgba(60,160,255,0.35)');
  corona.addColorStop(1, 'rgba(40,140,255,0)');
  ctx.fillStyle = corona;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/**
 * White venting gas + sharp electric-blue shorts when a vessel breaks apart.
 * Listens for {@link EVENT_VESSEL_BREAKUP}.
 */
export default function BreakupVfx() {
  const gasAnchorRef = useRef<THREE.Group>(null!);
  const arcAnchorRef = useRef<THREE.Group>(null!);
  const plateAnchorRef = useRef<THREE.Group>(null!);
  const gasPointsRef = useRef<THREE.Points>(null!);
  const arcPointsRef = useRef<THREE.Points>(null!);
  const plateMeshRef = useRef<THREE.InstancedMesh>(null!);
  const gasGeoRef = useRef<THREE.BufferGeometry>(null!);
  const arcGeoRef = useRef<THREE.BufferGeometry>(null!);

  const gasPool = useRef(makePool(BREAKUP_GAS_MAX_PARTICLES));
  const arcPool = useRef(makePool(BREAKUP_ARC_MAX_PARTICLES));
  const platePool = useRef(makePlatePool(BREAKUP_PLATE_MAX));
  const gasSlot = useRef(0);
  const arcSlot = useRef(0);
  const plateSlot = useRef(0);
  const afterglows = useRef<Afterglow[]>([]);

  const gasPos = useMemo(() => {
    const arr = new Float32Array(BREAKUP_GAS_MAX_PARTICLES * 3);
    for (let i = 0; i < arr.length; i++) arr[i] = PARKED;
    return arr;
  }, []);
  const gasCol = useMemo(() => new Float32Array(BREAKUP_GAS_MAX_PARTICLES * 3), []);
  const arcPos = useMemo(() => {
    const arr = new Float32Array(BREAKUP_ARC_MAX_PARTICLES * 3);
    for (let i = 0; i < arr.length; i++) arr[i] = PARKED;
    return arr;
  }, []);
  const arcCol = useMemo(() => new Float32Array(BREAKUP_ARC_MAX_PARTICLES * 3), []);

  const gasSprite = useMemo(() => makeSoftSprite(), []);
  const arcSprite = useMemo(() => makeFlashSprite(), []);

  useEffect(() => {
    const mesh = plateMeshRef.current;
    if (!mesh) return;
    for (let i = 0; i < BREAKUP_PLATE_MAX; i++) {
      _plateDummy.position.set(PARKED, PARKED, PARKED);
      _plateDummy.scale.set(0, 0, 0);
      _plateDummy.updateMatrix();
      mesh.setMatrixAt(i, _plateDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = false;
  }, []);

  function spawnGas(origin: THREE.Vector3, baseVel: THREE.Vector3): void {
    for (let i = 0; i < BREAKUP_GAS_PER_BURST; i++) {
      const idx = gasSlot.current;
      gasSlot.current = (idx + 1) % BREAKUP_GAS_MAX_PARTICLES;
      const p = gasPool.current[idx]!;
      randomUnit(_dir);
      const speed = randRange(BREAKUP_GAS_SPEED_MIN, BREAKUP_GAS_SPEED_MAX);
      p.active = true;
      p.age = 0;
      p.maxAge = randRange(BREAKUP_GAS_LIFETIME_MIN, BREAKUP_GAS_LIFETIME_MAX);
      p.px = origin.x + _dir.x * randRange(0, BREAKUP_GAS_SPREAD_RADIUS);
      p.py = origin.y + _dir.y * randRange(0, BREAKUP_GAS_SPREAD_RADIUS);
      p.pz = origin.z + _dir.z * randRange(0, BREAKUP_GAS_SPREAD_RADIUS);
      p.vx = baseVel.x + _dir.x * speed;
      p.vy = baseVel.y + _dir.y * speed;
      p.vz = baseVel.z + _dir.z * speed;
      p.phase = 0;
      p.flickerRate = BREAKUP_ARC_FLICKER_RATE;
    }
  }

  function spawnArc(origin: THREE.Vector3, baseVel: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = arcSlot.current;
      arcSlot.current = (idx + 1) % BREAKUP_ARC_MAX_PARTICLES;
      const p = arcPool.current[idx]!;
      randomUnit(_dir);
      const speed = randRange(BREAKUP_ARC_SPEED_MIN, BREAKUP_ARC_SPEED_MAX);
      const offset = randRange(0, BREAKUP_ARC_SPREAD_RADIUS);
      p.active = true;
      p.age = 0;
      p.maxAge = randRange(BREAKUP_ARC_LIFETIME_MIN, BREAKUP_ARC_LIFETIME_MAX);
      p.px = origin.x + _dir.x * offset;
      p.py = origin.y + _dir.y * offset;
      p.pz = origin.z + _dir.z * offset;
      p.vx = baseVel.x * 0.35 + _dir.x * speed;
      p.vy = baseVel.y * 0.35 + _dir.y * speed;
      p.vz = baseVel.z * 0.35 + _dir.z * speed;
      p.phase = Math.random() * Math.PI * 2;
      p.flickerRate = BREAKUP_ARC_FLICKER_RATE * randRange(0.65, 1.45);
    }
  }

  function spawnPlates(origin: THREE.Vector3, baseVel: THREE.Vector3): void {
    for (let i = 0; i < BREAKUP_PLATE_PER_BURST; i++) {
      const idx = plateSlot.current;
      plateSlot.current = (idx + 1) % BREAKUP_PLATE_MAX;
      const p = platePool.current[idx]!;
      randomUnit(_dir);
      const speed = randRange(BREAKUP_PLATE_SPEED_MIN, BREAKUP_PLATE_SPEED_MAX);
      const offset = randRange(0, BREAKUP_PLATE_SPREAD_RADIUS);
      p.active = true;
      p.age = 0;
      p.maxAge = randRange(BREAKUP_PLATE_LIFETIME_MIN, BREAKUP_PLATE_LIFETIME_MAX);
      p.px = origin.x + _dir.x * offset;
      p.py = origin.y + _dir.y * offset;
      p.pz = origin.z + _dir.z * offset;
      p.vx = baseVel.x * 0.5 + _dir.x * speed;
      p.vy = baseVel.y * 0.5 + _dir.y * speed;
      p.vz = baseVel.z * 0.5 + _dir.z * speed;
      p.rx = Math.random() * Math.PI * 2;
      p.ry = Math.random() * Math.PI * 2;
      p.rz = Math.random() * Math.PI * 2;
      const tumble = () =>
        randRange(BREAKUP_PLATE_TUMBLE_MIN, BREAKUP_PLATE_TUMBLE_MAX) * (Math.random() < 0.5 ? -1 : 1);
      p.wx = tumble();
      p.wy = tumble();
      p.wz = tumble();
      // Thin irregular plates — random width/length, fixed thickness.
      p.sx = randRange(BREAKUP_PLATE_SCALE_W_MIN, BREAKUP_PLATE_SCALE_W_MAX);
      p.sy = BREAKUP_PLATE_SCALE_T * randRange(0.7, 1.4);
      p.sz = randRange(BREAKUP_PLATE_SCALE_L_MIN, BREAKUP_PLATE_SCALE_L_MAX);
    }
  }

  useEffect(() => {
    const onBreakup = (event: Event) => {
      const detail = (event as CustomEvent<BreakupDetail>).detail;
      if (!detail?.point) return;

      const origin = new THREE.Vector3(detail.point.x, detail.point.y, detail.point.z);
      const baseVel = new THREE.Vector3(
        detail.velocity?.x ?? 0,
        detail.velocity?.y ?? 0,
        detail.velocity?.z ?? 0
      );

      spawnGas(origin, baseVel);
      spawnArc(origin, baseVel, BREAKUP_ARC_BURST_COUNT);
      spawnPlates(origin, baseVel);
      afterglows.current.push({
        origin,
        baseVel,
        age: 0,
        accum: 0,
      });
    };

    window.addEventListener(EVENT_VESSEL_BREAKUP, onBreakup);
    return () => window.removeEventListener(EVENT_VESSEL_BREAKUP, onBreakup);
  }, []);

  useFrame((_, delta) => {
    if (
      !gasAnchorRef.current ||
      !arcAnchorRef.current ||
      !plateAnchorRef.current ||
      !gasGeoRef.current ||
      !arcGeoRef.current ||
      !plateMeshRef.current
    ) {
      return;
    }

    _anchor.copy(shipPosRef.current);
    gasAnchorRef.current.position.copy(_anchor);
    arcAnchorRef.current.position.copy(_anchor);
    plateAnchorRef.current.position.copy(_anchor);

    // Continuing electrical shorts after the initial burst.
    for (let i = afterglows.current.length - 1; i >= 0; i--) {
      const glow = afterglows.current[i]!;
      glow.age += delta;
      if (glow.age >= BREAKUP_ARC_AFTERGLOW) {
        afterglows.current.splice(i, 1);
        continue;
      }
      glow.accum += BREAKUP_ARC_AFTERGLOW_RATE * delta;
      const n = Math.floor(glow.accum);
      glow.accum -= n;
      if (n > 0) spawnArc(glow.origin, glow.baseVel, n);
    }

    _gasColor.set(BREAKUP_GAS_COLOR);
    const gasDrag = Math.max(0, 1 - BREAKUP_GAS_DRAG * delta);
    let gasActive = 0;
    for (let i = 0; i < BREAKUP_GAS_MAX_PARTICLES; i++) {
      const p = gasPool.current[i]!;
      const o = i * 3;
      if (!p.active) {
        parkParticle(gasPos, gasCol, o);
        continue;
      }
      p.age += delta;
      if (p.age >= p.maxAge) {
        p.active = false;
        parkParticle(gasPos, gasCol, o);
        continue;
      }
      gasActive++;
      p.vx *= gasDrag;
      p.vy *= gasDrag;
      p.vz *= gasDrag;
      p.px += p.vx * delta;
      p.py += p.vy * delta;
      p.pz += p.vz * delta;
      gasPos[o] = p.px - _anchor.x;
      gasPos[o + 1] = p.py - _anchor.y;
      gasPos[o + 2] = p.pz - _anchor.z;
      const t = p.age / p.maxAge;
      const fade = Math.pow(1 - t, 1.35) * BREAKUP_GAS_OPACITY;
      gasCol[o] = _gasColor.r * fade;
      gasCol[o + 1] = _gasColor.g * fade;
      gasCol[o + 2] = _gasColor.b * fade;
    }

    _arcColor.set(BREAKUP_ARC_COLOR);
    _arcCore.set(BREAKUP_ARC_CORE_COLOR);
    let arcActive = 0;
    for (let i = 0; i < BREAKUP_ARC_MAX_PARTICLES; i++) {
      const p = arcPool.current[i]!;
      const o = i * 3;
      if (!p.active) {
        parkParticle(arcPos, arcCol, o);
        continue;
      }
      p.age += delta;
      if (p.age >= p.maxAge) {
        p.active = false;
        parkParticle(arcPos, arcCol, o);
        continue;
      }
      arcActive++;
      p.px += p.vx * delta;
      p.py += p.vy * delta;
      p.pz += p.vz * delta;
      arcPos[o] = p.px - _anchor.x;
      arcPos[o + 1] = p.py - _anchor.y;
      arcPos[o + 2] = p.pz - _anchor.z;

      // Drift while flickering: mostly dim, with irregular bright pops until death.
      const t = p.age / p.maxAge;
      const lifeFade = Math.pow(1 - t, 0.55);
      const n1 = Math.sin(p.age * p.flickerRate * 6.2 + p.phase) * 0.5 + 0.5;
      const n2 = Math.sin(p.age * p.flickerRate * 13.7 + p.phase * 1.7) * 0.5 + 0.5;
      const pop = n1 * n2;
      let flash = 0.04;
      if (pop > 0.78) flash = 1;
      else if (pop > 0.62) flash = 0.35;
      else if (pop > 0.48) flash = 0.12;
      const mix = flash > 0.7 ? 0.85 : 0.15;
      const bright = flash * lifeFade;
      arcCol[o] = (_arcCore.r * mix + _arcColor.r * (1 - mix)) * bright;
      arcCol[o + 1] = (_arcCore.g * mix + _arcColor.g * (1 - mix)) * bright;
      arcCol[o + 2] = (_arcCore.b * mix + _arcColor.b * (1 - mix)) * bright;
    }

    const plateDrag = Math.max(0, 1 - BREAKUP_PLATE_DRAG * delta);
    let plateActive = 0;
    const plateMesh = plateMeshRef.current;
    for (let i = 0; i < BREAKUP_PLATE_MAX; i++) {
      const p = platePool.current[i]!;
      if (!p.active) {
        _plateDummy.position.set(PARKED, PARKED, PARKED);
        _plateDummy.scale.set(0, 0, 0);
        _plateDummy.updateMatrix();
        plateMesh.setMatrixAt(i, _plateDummy.matrix);
        continue;
      }
      p.age += delta;
      if (p.age >= p.maxAge) {
        p.active = false;
        _plateDummy.position.set(PARKED, PARKED, PARKED);
        _plateDummy.scale.set(0, 0, 0);
        _plateDummy.updateMatrix();
        plateMesh.setMatrixAt(i, _plateDummy.matrix);
        continue;
      }
      plateActive++;
      p.vx *= plateDrag;
      p.vy *= plateDrag;
      p.vz *= plateDrag;
      p.px += p.vx * delta;
      p.py += p.vy * delta;
      p.pz += p.vz * delta;
      p.rx += p.wx * delta;
      p.ry += p.wy * delta;
      p.rz += p.wz * delta;

      const t = p.age / p.maxAge;
      // Shrink slightly at end so plates don't pop off.
      const lifeScale = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      _plateDummy.position.set(p.px - _anchor.x, p.py - _anchor.y, p.pz - _anchor.z);
      _plateEuler.set(p.rx, p.ry, p.rz);
      _plateDummy.rotation.copy(_plateEuler);
      _plateDummy.scale.set(p.sx * lifeScale, p.sy * lifeScale, p.sz * lifeScale);
      _plateDummy.updateMatrix();
      plateMesh.setMatrixAt(i, _plateDummy.matrix);
    }
    plateMesh.instanceMatrix.needsUpdate = true;
    plateMesh.visible = plateActive > 0;
    plateMesh.count = BREAKUP_PLATE_MAX;

    if (gasPointsRef.current) gasPointsRef.current.visible = gasActive > 0;
    if (arcPointsRef.current) {
      arcPointsRef.current.visible = arcActive > 0 || afterglows.current.length > 0;
    }

    (gasGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (gasGeoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (arcGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (arcGeoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <>
      <group ref={gasAnchorRef}>
        <points ref={gasPointsRef} frustumCulled={false} visible={false}>
          <bufferGeometry ref={gasGeoRef}>
            <bufferAttribute attach="attributes-position" args={[gasPos, 3]} />
            <bufferAttribute attach="attributes-color" args={[gasCol, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={BREAKUP_GAS_SIZE}
            map={gasSprite}
            alphaMap={gasSprite}
            vertexColors
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
            toneMapped={false}
          />
        </points>
      </group>
      <group ref={arcAnchorRef}>
        <points ref={arcPointsRef} frustumCulled={false} visible={false}>
          <bufferGeometry ref={arcGeoRef}>
            <bufferAttribute attach="attributes-position" args={[arcPos, 3]} />
            <bufferAttribute attach="attributes-color" args={[arcCol, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={BREAKUP_ARC_SIZE}
            map={arcSprite}
            alphaMap={arcSprite}
            vertexColors
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
            toneMapped={false}
          />
        </points>
      </group>
      <group ref={plateAnchorRef}>
        <instancedMesh
          ref={plateMeshRef}
          args={[undefined, undefined, BREAKUP_PLATE_MAX]}
          frustumCulled={false}
          visible={false}
          castShadow={false}
          receiveShadow={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={BREAKUP_PLATE_COLOR}
            roughness={BREAKUP_PLATE_ROUGHNESS}
            metalness={BREAKUP_PLATE_METALNESS}
            flatShading
          />
        </instancedMesh>
      </group>
    </>
  );
}
