import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Radiation } from 'lucide-react';
import * as THREE from 'three';
import type { RadiationZoneDef } from '../config/radiationConfig';
import { radiationOnRef, radiationRangeRef } from '../context/RadiationScan';
import { shipPosRef } from '../context/ShipPos';
import { gravityBodies } from '../context/GravityRegistry';
import './RadiationZones.css';

const RAD_COLOR = new THREE.Color('#88ff44');

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Point size in world units — capped so zones do not become solid white fog. */
function particlePointSize(radius: number): number {
  return THREE.MathUtils.clamp(radius * 0.025, 180, 2200);
}

function nodeMarkerCount(radius: number): number {
  return Math.round(THREE.MathUtils.clamp(radius / 600, 10, 28));
}

function makeParticleTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  // Outer radius reaches square corners so no opaque pixels remain on the quad edges.
  const outer = half * Math.SQRT2;
  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(half, half, 0, half, half, outer);
  grad.addColorStop(0, 'rgba(136,255,68,1)');
  grad.addColorStop(0.22, 'rgba(136,255,68,0.75)');
  grad.addColorStop(0.5, 'rgba(136,255,68,0.28)');
  grad.addColorStop(0.7, 'rgba(136,255,68,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const particleTexture = makeParticleTexture();

function makeParticlePositions(count: number, radius: number, seedKey: string): Float32Array {
  const rand = mulberry32(hashString(seedKey));
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * Math.cbrt(rand());
    const theta = rand() * Math.PI * 2;
    pos[i * 3] = r * Math.cos(theta);
    pos[i * 3 + 1] = (rand() - 0.5) * radius * 0.2;
    pos[i * 3 + 2] = r * Math.sin(theta);
  }
  return pos;
}

function pickNodePositions(positions: Float32Array, targetCount: number): THREE.Vector3[] {
  const total = positions.length / 3;
  const step = Math.max(1, Math.floor(total / targetCount));
  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < total && nodes.length < targetCount; i += step) {
    nodes.push(new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]));
  }
  return nodes;
}

function RadiationZoneMarker({ label }: { label: string }) {
  return (
    <div className="radiation-zone-marker">
      <div className="radiation-zone-marker__icon-wrap" aria-hidden>
        <Radiation size={26} strokeWidth={2} />
      </div>
      <div className="radiation-zone-marker__label">{label}</div>
    </div>
  );
}

function RadiationNodeMarker() {
  return (
    <div className="radiation-zone-node" aria-hidden>
      <Radiation size={14} strokeWidth={2} />
    </div>
  );
}

interface ZoneAssets {
  sphereMat: THREE.MeshBasicMaterial;
  particleMat: THREE.PointsMaterial;
  particleGeo: THREE.BufferGeometry;
  nodePositions: THREE.Vector3[];
}

interface RadiationZonesProps {
  radiationZones: RadiationZoneDef[];
}

export default function RadiationZones({ radiationZones }: RadiationZonesProps) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const zonePosRef = useRef<THREE.Vector3[]>([]);
  const visibleRef = useRef<boolean[]>([]);
  const timeRef = useRef(0);
  const [zoneVisible, setZoneVisible] = useState<boolean[]>(() => radiationZones.map(() => false));

  useEffect(() => {
    zonePosRef.current = radiationZones.map((z) => z.position?.clone() ?? new THREE.Vector3());
    groupRefs.current = radiationZones.map(() => null);
    visibleRef.current = radiationZones.map(() => false);
    setZoneVisible(radiationZones.map(() => false));
  }, [radiationZones]);

  const zoneAssets = useMemo<ZoneAssets[]>(() => {
    return radiationZones.map((zone) => {
      const count = Math.round(THREE.MathUtils.clamp(400 + zone.radius * 0.008, 400, 1200));
      const positions = makeParticlePositions(count, zone.radius, zone.id);
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      return {
        sphereMat: new THREE.MeshBasicMaterial({
          color: RAD_COLOR,
          transparent: true,
          opacity: 0.004,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
        particleMat: new THREE.PointsMaterial({
          map: particleTexture,
          color: RAD_COLOR,
          transparent: true,
          opacity: 0.55,
          size: particlePointSize(zone.radius),
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          // No alphaTest — soft alpha falloff; alphaTest causes visible square cutoffs.
        }),
        particleGeo,
        nodePositions: pickNodePositions(positions, nodeMarkerCount(zone.radius)),
      };
    });
  }, [radiationZones]);

  useFrame((_, dt) => {
    timeRef.current += dt;
    const t = timeRef.current;
    const scanOn = radiationOnRef.current;
    const range = radiationRangeRef.current;
    const zonePos = zonePosRef.current;
    let visibilityChanged = false;

    for (let i = 0; i < radiationZones.length; i++) {
      const zone = radiationZones[i];
      const group = groupRefs.current[i];
      if (!group) continue;

      if (zone.planetName) {
        const body = gravityBodies.get(zone.planetName);
        if (body) zonePos[i].copy(body.position);
      }

      group.position.copy(zonePos[i]);

      const dx = shipPosRef.current.x - zonePos[i].x;
      const dz = shipPosRef.current.z - zonePos[i].z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const visible = scanOn && range > 0 && dist <= range;

      if (visibleRef.current[i] !== visible) {
        visibleRef.current[i] = visible;
        visibilityChanged = true;
      }

      if (visible) {
        const phase = i * 1.3;
        const pulse = 0.35 + Math.sin(t * 0.6 + phase) * 0.12;
        zoneAssets[i].particleMat.opacity = pulse;
        zoneAssets[i].sphereMat.opacity = 0.03 + Math.sin(t * 0.4 + phase) * 0.01;
      }
    }

    if (visibilityChanged) {
      setZoneVisible([...visibleRef.current]);
    }
  });

  return (
    <group>
      {radiationZones.map((zone, i) => (
        <group
          key={zone.id}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
        >
          {zoneVisible[i] && (
            <>
              <points material={zoneAssets[i].particleMat} geometry={zoneAssets[i].particleGeo} />
              <Html
                center
                transform={false}
                zIndexRange={[80, 0]}
                style={{ pointerEvents: 'none' }}
              >
                <RadiationZoneMarker label={zone.label} />
              </Html>
              {zoneAssets[i].nodePositions.map((nodePos, nodeIndex) => (
                <Html
                  key={`${zone.id}-node-${nodeIndex}`}
                  position={nodePos}
                  center
                  transform={false}
                  zIndexRange={[79, 0]}
                  style={{ pointerEvents: 'none' }}
                >
                  <RadiationNodeMarker />
                </Html>
              ))}
            </>
          )}
        </group>
      ))}
    </group>
  );
}
