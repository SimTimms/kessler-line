import * as THREE from 'three';
import type { Building, RoadBuilding } from './settlementTypes';
import { createRng } from './settlementRng';
import {
  applyTangentOffset,
  geodesicFrame,
  slerpSurface,
} from './settlementSphere';

const DOME_RADIUS_BASE = 30;
const DOME_SCALE_MIN = 0.2;

const _dummy = new THREE.Object3D();
const _pos = new THREE.Vector3();
const _end = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _bitangent = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export function domeRadiusForFlatDistance(
  dist: number,
  minDist: number,
  maxDist: number,
  scale: number
): number {
  if (maxDist <= minDist) return DOME_RADIUS_BASE * scale;
  const t = (dist - minDist) / (maxDist - minDist);
  return DOME_RADIUS_BASE * scale * (1 - t * (1 - DOME_SCALE_MIN));
}

export function generateDomeBuildings(
  seed: number,
  domeRadius: number,
  maxCount: number
): Building[] {
  const rand = createRng(seed);
  const scale = domeRadius / DOME_RADIUS_BASE;
  const target = Math.min(maxCount, Math.max(5, Math.floor((130 + Math.floor(rand() * 6)) * scale)));
  const buildings: Building[] = [];
  const maxAttempts = target * 30;

  for (let attempt = 0; attempt < maxAttempts && buildings.length < target; attempt++) {
    const w = (4 + rand() * 4) * scale;
    const d = (4 + rand() * 4) * scale;
    const h = (4 + rand() * 4) * scale;
    const r = (20 + rand() * (DOME_RADIUS_BASE + 3)) * scale;
    const angle = rand() * Math.PI * 2;
    buildings.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      w,
      d,
      h,
      warm: rand() > 0.4,
    });
  }
  return buildings;
}

export function domeInstanceMatrices(buildings: Building[]): THREE.Matrix4[] {
  return buildings.map((b) => {
    _dummy.position.set(b.x, b.h / 2, b.z);
    _dummy.scale.set(b.w, b.h, b.d);
    _dummy.updateMatrix();
    return _dummy.matrix.clone();
  });
}

export function domeLightPoints(buildings: Building[], seed: number, maxPoints: number): Float32Array {
  const rand = createRng(seed);
  const pts: number[] = [];
  for (const b of buildings) {
    if (pts.length / 3 >= maxPoints) break;
    const count = 1 + Math.floor(rand() * 2);
    for (let k = 0; k < count && pts.length / 3 < maxPoints; k++) {
      pts.push(b.x + (rand() - 0.5) * b.w * 0.5);
      pts.push(0.8 + rand() * b.h * 0.55);
      pts.push(b.z + (rand() - 0.5) * b.d * 0.5);
    }
  }
  return new Float32Array(pts);
}

export function generateRoadBuildings(
  start: THREE.Vector3,
  end: THREE.Vector3,
  moonRadius: number,
  surfaceLift: number,
  seed: number,
  maxCount: number
): { buildings: RoadBuilding[]; lights: number[] } {
  const rand = createRng(seed);
  const count = Math.min(maxCount, Math.max(3, Math.floor(start.distanceTo(end) / 80)));
  const buildings: RoadBuilding[] = [];
  const lights: number[] = [];

  for (let i = 0; i < count; i++) {
    const t = 0.12 + rand() * 0.76;
    slerpSurface(start, end, t, moonRadius, surfaceLift, _pos);
    slerpSurface(start, end, Math.min(1, t + 0.02), moonRadius, surfaceLift, _end);
    geodesicFrame(_pos, _end, _tangent, _bitangent, _normal);

    const side = (rand() > 0.5 ? 1 : -1) * (9 + rand() * 7);
    const along = (rand() - 0.5) * 12;
    const w = 3 + rand() * 5;
    const d = 3 + rand() * 5;
    const h = 2 + rand() * 6;

    const offset = _pos
      .clone()
      .addScaledVector(_tangent, along)
      .addScaledVector(_bitangent, side);
    _quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _normal);

    buildings.push({
      position: offset,
      quaternion: _quat.clone(),
      w,
      d,
      h,
      warm: rand() > 0.5,
    });

    const lightCount = 1 + Math.floor(rand() * 2);
    for (let k = 0; k < lightCount; k++) {
      applyTangentOffset(
        offset,
        _quat,
        (rand() - 0.5) * w * 0.4,
        0.8 + rand() * h * 0.5,
        (rand() - 0.5) * d * 0.4,
        _end
      );
      lights.push(_end.x, _end.y, _end.z);
    }
  }

  return { buildings, lights };
}
