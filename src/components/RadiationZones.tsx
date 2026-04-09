import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RADIATION_ZONES } from '../config/radiationConfig';
import { radiationOnRef, radiationRangeRef } from '../context/RadiationScan';
import { shipPosRef } from '../context/ShipPos';
import { gravityBodies } from '../context/GravityRegistry';

const RAD_COLOR = new THREE.Color('#88ff44');

// Per-zone current world position cache
const _zonePos = RADIATION_ZONES.map((z) => z.position?.clone() ?? new THREE.Vector3());

// Soft circular sprite texture so particles render as glowing dots, not squares
function makeParticleTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(136,255,68,1)');
  grad.addColorStop(0.25, 'rgba(136,255,68,0.8)');
  grad.addColorStop(0.6, 'rgba(136,255,68,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const particleTexture = makeParticleTexture();

// Generate particle positions scattered uniformly within a sphere volume.
// Particles are on a flat disk (±10% in Y) to match the gameplay plane.
function makeParticlePositions(count: number, radius: number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    pos[i * 3] = r * Math.cos(theta);
    pos[i * 3 + 1] = (Math.random() - 0.5) * 2000; // ±1000 world units
    pos[i * 3 + 2] = r * Math.sin(theta);
  }
  return pos;
}

export default function RadiationZones() {
  const groupRefs = useRef<(THREE.Group | null)[]>(RADIATION_ZONES.map(() => null));
  const timeRef = useRef(0);

  const { sphereMats, particleMats, particleGeos } = useMemo(() => {
    const sphereMats = RADIATION_ZONES.map(
      () =>
        new THREE.MeshBasicMaterial({
          color: RAD_COLOR,
          transparent: true,
          opacity: 0.04,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
    );

    const particleMats = RADIATION_ZONES.map(
      (zone) =>
        new THREE.PointsMaterial({
          map: particleTexture,
          color: RAD_COLOR,
          transparent: true,
          alphaTest: 0.01,
          opacity: 0.85,
          size: Math.max(8000, zone.radius * 0.014),
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
    );

    const particleGeos = RADIATION_ZONES.map((zone) => {
      const count = Math.round(800 + zone.radius * 0.012);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(makeParticlePositions(count, zone.radius), 3)
      );
      return geo;
    });

    return { sphereMats, particleMats, particleGeos };
  }, []);

  useFrame((_, dt) => {
    timeRef.current += dt;
    const t = timeRef.current;
    const scanOn = radiationOnRef.current;
    const range = radiationRangeRef.current;

    for (let i = 0; i < RADIATION_ZONES.length; i++) {
      const zone = RADIATION_ZONES[i];
      const group = groupRefs.current[i];
      if (!group) continue;

      // Sync planet-linked zones to current planet world position
      if (zone.planetName) {
        const body = gravityBodies.get(zone.planetName);
        if (body) _zonePos[i].copy(body.position);
      }

      const dx = shipPosRef.current.x - _zonePos[i].x;
      const dz = shipPosRef.current.z - _zonePos[i].z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      const visible = scanOn && dist <= range;
      group.visible = visible;

      if (visible) {
        group.position.copy(_zonePos[i]);

        // Slow pulsing opacity on particles
        const phase = i * 1.3;
        const pulse = 0.4 + Math.sin(t * 0.6 + phase) * 0.15;
        particleMats[i].opacity = pulse;
        sphereMats[i].opacity = 0.03 + Math.sin(t * 0.4 + phase) * 0.01;
      }
    }
  });

  return (
    <group>
      {RADIATION_ZONES.map((zone, i) => (
        <group
          key={zone.id}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          visible={false}
        >
          {/* Faint sphere shell — shows zone boundary */}
          <mesh material={sphereMats[i]}>
            <sphereGeometry args={[zone.radius, 24, 12]} />
          </mesh>
          {/* Particle cloud — primary visual */}
          <points material={particleMats[i]} geometry={particleGeos[i]} />
        </group>
      ))}
    </group>
  );
}
