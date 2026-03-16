import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { sceneCamera } from '../context/CameraRef';
import { proximityScanOnRef, proximityScanRangeRef } from '../context/ProximityScan';
import { getCollidables } from '../context/CollisionRegistry';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import { SHIP_COLLISION_ID, drainPower } from '../context/ShipState';

const EDGE_PAD = 30;

function getLabelFromId(id: string): string {
  if (id.startsWith('debris-')) return 'DEBRIS';
  if (id.startsWith('asteroid-')) return 'ASTEROID';
  if (id.startsWith('ai-ship')) return 'VESSEL';
  if (id === 'space-station') return 'STATION';
  if (id === 'fuel-station') return 'SIRIX STATION';
  if (id.startsWith('docking-bay-')) return 'DOCK PORT';
  return 'OBJECT';
}

function getColor(ratio: number): string {
  if (ratio < 0.35) return 'rgba(255, 40, 140, 0.9)';
  if (ratio < 0.5) return 'rgba(255, 40, 140, 0.5)';
  if (ratio < 0.75) return 'rgba(0, 200, 255, 0.3)';
  return 'rgba(0, 200, 255, 0.1)';
}

// ─── Marker DOM structure ─────────────────────────────────────────────────────
function createMarker(container: HTMLElement) {
  const root = document.createElement('div');
  root.style.cssText = `
    position: absolute;
    pointer-events: none;
    display: none;
  `;

  const box = document.createElement('div');

  const label = document.createElement('div');
  label.style.cssText = `
    font-family: monospace;
    font-size: 10px;
    white-space: nowrap;
    margin-top: 3px;
  `;

  root.appendChild(box);
  root.appendChild(label);
  container.appendChild(root);
  return { root, box, label };
}

type Marker = ReturnType<typeof createMarker>;

function styleOnScreen(marker: Marker, size: number, color: string) {
  marker.box.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border: 1px solid ${color};
    transform: rotate(45deg);
    box-shadow: 0 0 8px ${color}80, inset 0 0 4px ${color}20;
  `;
}

function styleOffScreen(marker: Marker, color: string) {
  marker.box.style.cssText = `
    width: 10px;
    height: 10px;
    background: ${color}cc;
    box-shadow: 0 0 6px ${color};
    transform: rotate(45deg);
    margin: 2px;
  `;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProximityHUD() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const markers = new Map<string, Marker>();
    const _pos = new THREE.Vector3();
    const _ndc = new THREE.Vector3();

    let lastTime = performance.now();
    let rafId: number;

    const update = (now: number) => {
      rafId = requestAnimationFrame(update);
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!proximityScanOnRef.current || !sceneCamera.current) {
        for (const m of markers.values()) m.root.style.display = 'none';
        return;
      }

      // Drain power: 1 unit/s at range 500, scales linearly with range
      const range = proximityScanRangeRef.current;
      drainPower((range / 500) * delta);

      const camera = sceneCamera.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = W * 0.5;
      const cy = H * 0.5;

      const collidables = getCollidables().filter((c) => c.id !== SHIP_COLLISION_ID);
      const visibleIds = new Set<string>();

      for (const entry of collidables) {
        entry.getWorldPosition(_pos);
        const dist = minimapShipPosition.distanceTo(_pos);

        if (dist > range) {
          const m = markers.get(entry.id);
          if (m) m.root.style.display = 'none';
          continue;
        }

        visibleIds.add(entry.id);

        if (!markers.has(entry.id)) {
          markers.set(entry.id, createMarker(container));
        }
        const marker = markers.get(entry.id)!;

        const ratio = dist / range;
        const color = getColor(ratio);
        const distText = dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;

        marker.root.style.display = 'block';
        marker.label.textContent = `${getLabelFromId(entry.id)} [${distText}]`;
        marker.label.style.color = color;
        marker.label.style.textShadow = `0 0 4px ${color}cc`;

        // Project world position to screen
        _ndc.copy(_pos);
        _ndc.project(camera);

        const isBehind = _ndc.z > 1;
        let sx = (_ndc.x * 0.5 + 0.5) * W;
        let sy = (-_ndc.y * 0.5 + 0.5) * H;

        const onScreen =
          !isBehind && sx > EDGE_PAD && sx < W - EDGE_PAD && sy > EDGE_PAD && sy < H - EDGE_PAD;

        if (onScreen) {
          const SIZE = 18;
          styleOnScreen(marker, SIZE, color);
          marker.root.style.left = `${sx - SIZE * 0.5}px`;
          marker.root.style.top = `${sy - SIZE * 0.5}px`;
        } else {
          if (isBehind) {
            sx = W - sx;
            sy = H - sy;
          }
          const dx = sx - cx;
          const dy = sy - cy;
          const scale = Math.min(
            (cx - EDGE_PAD) / (Math.abs(dx) || 1),
            (cy - EDGE_PAD) / (Math.abs(dy) || 1)
          );
          const ex = scale < 1 ? cx + dx * scale : sx;
          const ey = scale < 1 ? cy + dy * scale : sy;
          styleOffScreen(marker, color);
          marker.root.style.left = `${ex - 7}px`;
          marker.root.style.top = `${ey - 7}px`;
        }
      }

      // Hide markers that are no longer within range
      for (const [id, m] of markers) {
        if (!visibleIds.has(id)) m.root.style.display = 'none';
      }
    };

    rafId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(rafId);
      for (const m of markers.values()) m.root.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
