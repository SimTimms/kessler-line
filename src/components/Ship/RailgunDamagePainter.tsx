import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { railgunImpactDir } from '../../context/ShipState';

const MAX_MARKS = 500;
const DEFAULT_TEX_SIZE = 1024;
const ORANGE_SHIFT_MAX = 0.15;
const SIZE_VARIANCE = 0.7;
const OPACITY_VARIANCE = 0.3;
const EMISSIVE_LIFE = 2.6;

interface RailgunDamagePainterProps {
  shipGroupRef: { current: THREE.Group | null };
}

type EmissiveMaterial =
  | THREE.MeshStandardMaterial
  | THREE.MeshPhysicalMaterial
  | THREE.MeshPhongMaterial
  | THREE.MeshLambertMaterial;

type PainterInfo = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  emissiveCanvas: HTMLCanvasElement;
  emissiveCtx: CanvasRenderingContext2D;
  emissiveTexture: THREE.CanvasTexture;
  size: number;
  emissiveMarks: EmissiveMark[];
};

type RailgunDamagePoint = {
  position: THREE.Vector3;
  normal: THREE.Vector3;
};

type EmissiveMark = {
  uv: THREE.Vector2;
  radius: number;
  angle: number;
  longStreak: boolean;
  stretch: number;
  hueShift: number;
  colorShift: number;
  opacityJitter: number;
  createdAt: number;
  life: number;
};

function getMeshMaterial(mesh: THREE.Mesh): EmissiveMaterial | null {
  const material = mesh.material;
  if (Array.isArray(material)) {
    const found = material.find((mat) => 'emissive' in mat) as EmissiveMaterial | undefined;
    return found ?? null;
  }
  if (material && 'emissive' in material) return material as EmissiveMaterial;
  return null;
}

function initPainter(material: EmissiveMaterial): PainterInfo {
  const map = material.map as THREE.Texture | null;
  const image = map?.image as
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | OffscreenCanvas
    | null
    | undefined;
  const size = image && 'width' in image ? image.width : DEFAULT_TEX_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = size;
  emissiveCanvas.height = size;
  const emissiveCtx = emissiveCanvas.getContext('2d')!;
  emissiveCtx.clearRect(0, 0, size, size);

  if (image) {
    ctx.drawImage(image as CanvasImageSource, 0, 0, size, size);
  } else {
    const color = material.color ?? new THREE.Color('#2a2a2a');
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = map?.wrapS ?? THREE.RepeatWrapping;
  texture.wrapT = map?.wrapT ?? THREE.RepeatWrapping;
  texture.repeat.copy(map?.repeat ?? new THREE.Vector2(1, 1));
  texture.offset.copy(map?.offset ?? new THREE.Vector2(0, 0));
  texture.rotation = map?.rotation ?? 0;
  texture.center.copy(map?.center ?? new THREE.Vector2(0.5, 0.5));
  texture.colorSpace = THREE.SRGBColorSpace;

  const emissiveTexture = new THREE.CanvasTexture(emissiveCanvas);
  emissiveTexture.wrapS = texture.wrapS;
  emissiveTexture.wrapT = texture.wrapT;
  emissiveTexture.repeat.copy(texture.repeat);
  emissiveTexture.offset.copy(texture.offset);
  emissiveTexture.rotation = texture.rotation;
  emissiveTexture.center.copy(texture.center);
  emissiveTexture.colorSpace = THREE.SRGBColorSpace;

  material.map = texture;
  material.emissive = new THREE.Color('#ffffff');
  material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 1.4);
  material.emissiveMap = emissiveTexture;
  material.needsUpdate = true;

  return {
    canvas,
    ctx,
    texture,
    emissiveCanvas,
    emissiveCtx,
    emissiveTexture,
    size,
    emissiveMarks: [],
  };
}

function rgbaTowardOrange(r: number, g: number, b: number, a: number, t: number): string {
  const or = 255;
  const og = 136;
  const ob = 0;
  const rr = Math.round(r + (or - r) * t);
  const gg = Math.round(g + (og - g) * t);
  const bb = Math.round(b + (ob - b) * t);
  return `rgba(${rr},${gg},${bb},${a})`;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function paintGouge(
  painter: PainterInfo,
  uv: THREE.Vector2,
  hueShift: number,
  now: number
): EmissiveMark {
  const { ctx, texture, size } = painter;
  const x = uv.x * size;
  const y = (1 - uv.y) * size;
  const sizeJitter = 1 + (Math.random() * 2 - 1) * SIZE_VARIANCE;
  const radius = size * 0.0012 * sizeJitter;
  const angle = Math.random() * Math.PI * 2;
  const longStreak = Math.random() < 0.25;
  const stretch = longStreak ? 8 + Math.random() * 6 : 2.2;
  const colorShift = Math.random() * ORANGE_SHIFT_MAX;
  const opacityJitter = 1 + (Math.random() * 2 - 1) * OPACITY_VARIANCE;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(stretch, 1);

  // Charred core
  let gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,1)');
  gradient.addColorStop(0.995, 'rgba(5,2,1,1)');
  gradient.addColorStop(1, 'rgba(5,2,1,0.8)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  if (longStreak) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(5,2,1,0.8)';
    ctx.lineWidth = radius * 0.5;
    ctx.beginPath();
    ctx.moveTo(-radius * 6, 0);
    ctx.lineTo(radius * 6, 0);
    ctx.stroke();
  }

  // Molten rim
  const rimRadius = radius * 1.18;
  gradient = ctx.createRadialGradient(0, 0, radius * 0.9, 0, 0, rimRadius);
  gradient.addColorStop(0, 'rgba(255,120,40,0)');
  const rimA1 = clamp01((0.95 + hueShift) * opacityJitter);
  const rimA2 = clamp01((0.6 + hueShift * 0.4) * opacityJitter);
  gradient.addColorStop(0.55, rgbaTowardOrange(255, 90, 20, rimA1, colorShift));
  gradient.addColorStop(0.8, rgbaTowardOrange(255, 160, 60, rimA2, colorShift));
  gradient.addColorStop(1, 'rgba(255,40,10,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, rimRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  texture.needsUpdate = true;

  return {
    uv: uv.clone(),
    radius,
    angle,
    longStreak,
    stretch,
    hueShift,
    colorShift,
    opacityJitter,
    createdAt: now,
    life: EMISSIVE_LIFE * (0.7 + Math.random() * 0.6),
  };
}

function drawEmissiveMark(painter: PainterInfo, mark: EmissiveMark, progress: number): void {
  const { emissiveCtx, size } = painter;
  const x = mark.uv.x * size;
  const y = (1 - mark.uv.y) * size;
  const rimRadius = mark.radius * 1.18;
  const heat = 1 - progress;
  let r = 0;
  let g = 0;
  let b = 0;
  if (progress < 0.5) {
    const k = progress * 2;
    r = 255;
    g = 136 * k;
  } else {
    const k = (progress - 0.5) * 2;
    r = 255 * (1 - k);
    g = 136 * (1 - k);
  }

  emissiveCtx.save();
  emissiveCtx.translate(x, y);
  emissiveCtx.rotate(mark.angle);
  emissiveCtx.scale(mark.stretch, 1);
  const gradient = emissiveCtx.createRadialGradient(0, 0, mark.radius * 0.9, 0, 0, rimRadius);
  gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
  const emissiveA1 = clamp01((0.85 + mark.hueShift) * mark.opacityJitter) * heat;
  const emissiveA2 = clamp01((0.55 + mark.hueShift * 0.4) * mark.opacityJitter) * heat;
  gradient.addColorStop(0.55, `rgba(${r},${g},${b},${emissiveA1})`);
  gradient.addColorStop(0.8, `rgba(${r},${g},${b},${emissiveA2})`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  emissiveCtx.globalCompositeOperation = 'lighter';
  emissiveCtx.fillStyle = gradient;
  emissiveCtx.beginPath();
  emissiveCtx.arc(0, 0, rimRadius, 0, Math.PI * 2);
  emissiveCtx.fill();

  if (mark.longStreak) {
    emissiveCtx.strokeStyle = `rgba(${r},${g},${b},${0.6 * heat})`;
    emissiveCtx.lineWidth = mark.radius * 0.35;
    emissiveCtx.beginPath();
    emissiveCtx.moveTo(-rimRadius * 5, 0);
    emissiveCtx.lineTo(rimRadius * 5, 0);
    emissiveCtx.stroke();
  }
  emissiveCtx.restore();
}

export default function RailgunDamagePainter({ shipGroupRef }: RailgunDamagePainterProps) {
  const paintersRef = useRef(new WeakMap<THREE.Mesh, PainterInfo>());
  const paintersListRef = useRef<PainterInfo[]>([]);
  const markCountRef = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const reverseOrigin = useMemo(() => new THREE.Vector3(), []);
  const reverseDir = useMemo(() => new THREE.Vector3(), []);
  const shipPos = useMemo(() => new THREE.Vector3(), []);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const now = timeRef.current;
    for (const painter of paintersListRef.current) {
      if (!painter.emissiveMarks.length) continue;
      painter.emissiveCtx.clearRect(0, 0, painter.size, painter.size);
      let alive = 0;
      for (const mark of painter.emissiveMarks) {
        const age = now - mark.createdAt;
        if (age >= mark.life) continue;
        const progress = clamp01(age / mark.life);
        drawEmissiveMark(painter, mark, progress);
        painter.emissiveMarks[alive] = mark;
        alive += 1;
      }
      painter.emissiveMarks.length = alive;
      painter.emissiveTexture.needsUpdate = true;
    }
  });

  useEffect(() => {
    const onRailgunHit = () => {
      const group = shipGroupRef.current;
      if (!group) return;
      const canPaint = markCountRef.current < MAX_MARKS;

      group.updateMatrixWorld(true);
      group.getWorldPosition(shipPos);

      const direction = railgunImpactDir.clone().normalize();
      const radius = 1000;
      rayOrigin.copy(shipPos).addScaledVector(direction, -radius);
      raycaster.set(rayOrigin, direction);
      raycaster.far = radius * 2;

      reverseDir.copy(direction).multiplyScalar(-1);
      reverseOrigin.copy(shipPos).addScaledVector(reverseDir, -radius);

      const meshes: THREE.Object3D[] = [];
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });

      const hitsForward = meshes.length ? raycaster.intersectObjects(meshes, true) : [];
      if (!hitsForward.length) return;

      raycaster.set(reverseOrigin, reverseDir);
      raycaster.far = radius * 2;
      const hitsReverse = meshes.length ? raycaster.intersectObjects(meshes, true) : [];

      const toPaint = [
        hitsForward[0],
        hitsForward[hitsForward.length - 1],
        hitsReverse[0],
        hitsReverse[hitsReverse.length - 1],
      ].filter(Boolean) as THREE.Intersection[];

      const damagePoints: RailgunDamagePoint[] = [];

      for (const hit of toPaint) {
        if (!hit.uv) continue;
        const mesh = hit.object as THREE.Mesh;
        if (canPaint && markCountRef.current < MAX_MARKS) {
          const material = getMeshMaterial(mesh);
          if (material) {
            let painter = paintersRef.current.get(mesh);
            if (!painter) {
              painter = initPainter(material);
              paintersRef.current.set(mesh, painter);
              paintersListRef.current.push(painter);
            }

            const mark = paintGouge(painter, hit.uv, Math.random() * 0.2, timeRef.current);
            painter.emissiveMarks.push(mark);
            markCountRef.current += 1;
          }
        }

        if (hit.face) {
          const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
          damagePoints.push({ position: hit.point.clone(), normal: worldNormal });
        } else {
          damagePoints.push({ position: hit.point.clone(), normal: railgunImpactDir.clone() });
        }
      }

      if (damagePoints.length) {
        window.dispatchEvent(
          new CustomEvent('RailgunDamagePoints', {
            detail: {
              points: damagePoints.map((p) => ({
                x: p.position.x,
                y: p.position.y,
                z: p.position.z,
                nx: p.normal.x,
                ny: p.normal.y,
                nz: p.normal.z,
              })),
            },
          })
        );
      }
    };

    window.addEventListener('RailgunHit', onRailgunHit);
    return () => {
      window.removeEventListener('RailgunHit', onRailgunHit);
    };
  }, [rayOrigin, raycaster, shipGroupRef, shipPos, reverseDir, reverseOrigin]);

  return null;
}
