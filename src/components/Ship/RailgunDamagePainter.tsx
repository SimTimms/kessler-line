import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { railgunImpactDir } from '../../context/ShipState';

const MAX_MARKS = 50;
const DEFAULT_TEX_SIZE = 1024;

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
  material.emissive = new THREE.Color('#ff5a1a');
  material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 1.4);
  material.emissiveMap = emissiveTexture;
  material.needsUpdate = true;

  return { canvas, ctx, texture, emissiveCanvas, emissiveCtx, emissiveTexture, size };
}

function paintGouge(painter: PainterInfo, uv: THREE.Vector2, hueShift: number): void {
  const { ctx, texture, emissiveCtx, emissiveTexture, size } = painter;
  const x = uv.x * size;
  const y = (1 - uv.y) * size;
  const radius = size * 0.0024;
  const angle = Math.random() * Math.PI * 2;
  const stretch = 2.2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(stretch, 1);

  // Charred core
  let gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,1)');
  gradient.addColorStop(0.92, 'rgba(10,4,2,1)');
  gradient.addColorStop(1, 'rgba(10,4,2,0.35)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Molten rim
  const rimRadius = radius * 2.2;
  gradient = ctx.createRadialGradient(0, 0, radius * 0.35, 0, 0, rimRadius);
  gradient.addColorStop(0, 'rgba(255,120,40,0)');
  gradient.addColorStop(0.55, `rgba(255,90,20,${0.95 + hueShift})`);
  gradient.addColorStop(0.8, `rgba(255,160,60,${0.6 + hueShift * 0.4})`);
  gradient.addColorStop(1, 'rgba(255,40,10,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, rimRadius, 0, Math.PI * 2);
  ctx.fill();

  // Emissive rim (no core)
  emissiveCtx.save();
  emissiveCtx.translate(x, y);
  emissiveCtx.rotate(angle);
  emissiveCtx.scale(stretch, 1);
  gradient = emissiveCtx.createRadialGradient(0, 0, radius * 0.4, 0, 0, rimRadius);
  gradient.addColorStop(0, 'rgba(255,120,40,0)');
  gradient.addColorStop(0.55, `rgba(255,90,20,${0.85 + hueShift})`);
  gradient.addColorStop(0.8, `rgba(255,160,60,${0.55 + hueShift * 0.4})`);
  gradient.addColorStop(1, 'rgba(255,60,20,0)');
  emissiveCtx.globalCompositeOperation = 'lighter';
  emissiveCtx.fillStyle = gradient;
  emissiveCtx.beginPath();
  emissiveCtx.arc(0, 0, rimRadius, 0, Math.PI * 2);
  emissiveCtx.fill();
  emissiveCtx.restore();

  ctx.restore();
  texture.needsUpdate = true;
  emissiveTexture.needsUpdate = true;
}

export default function RailgunDamagePainter({ shipGroupRef }: RailgunDamagePainterProps) {
  const paintersRef = useRef(new WeakMap<THREE.Mesh, PainterInfo>());
  const markCountRef = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const reverseOrigin = useMemo(() => new THREE.Vector3(), []);
  const reverseDir = useMemo(() => new THREE.Vector3(), []);
  const shipPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const onRailgunHit = () => {
      const group = shipGroupRef.current;
      if (!group || markCountRef.current >= MAX_MARKS) return;

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

      for (const hit of toPaint) {
        if (!hit.uv || markCountRef.current >= MAX_MARKS) continue;
        const mesh = hit.object as THREE.Mesh;
        const material = getMeshMaterial(mesh);
        if (!material) continue;

        let painter = paintersRef.current.get(mesh);
        if (!painter) {
          painter = initPainter(material);
          paintersRef.current.set(mesh, painter);
        }

        paintGouge(painter, hit.uv, Math.random() * 0.2);
        markCountRef.current += 1;
      }
    };

    window.addEventListener('RailgunHit', onRailgunHit);
    return () => window.removeEventListener('RailgunHit', onRailgunHit);
  }, [rayOrigin, raycaster, shipGroupRef, shipPos, reverseDir, reverseOrigin]);

  return null;
}
