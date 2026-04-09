import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { sceneCamera } from '../context/CameraRef';
import { radiationOnRef, radiationRangeRef } from '../context/RadiationScan';
import { RADIATION_ZONES } from '../config/radiationConfig';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import { gravityBodies } from '../context/GravityRegistry';

const EDGE_PAD = 30;
const RAD_COLOR = '#88ff44';

function createMarker(container: HTMLElement) {
  const root = document.createElement('div');
  root.style.cssText = 'position: absolute; pointer-events: none; display: none;';

  const box = document.createElement('div');

  const label = document.createElement('div');
  label.style.cssText = `
    font-family: monospace;
    font-size: 10px;
    color: ${RAD_COLOR};
    white-space: nowrap;
    text-shadow: 0 0 4px rgba(136,255,68,0.8);
    margin-top: 3px;
  `;

  root.appendChild(box);
  root.appendChild(label);
  container.appendChild(root);
  return { root, box, label };
}

type Marker = ReturnType<typeof createMarker>;

function styleOnScreen(marker: Marker, size: number) {
  marker.box.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border: 1px solid ${RAD_COLOR};
    box-shadow: 0 0 8px rgba(136,255,68,0.5), inset 0 0 4px rgba(136,255,68,0.1);
  `;
}

function styleOffScreen(marker: Marker) {
  marker.box.style.cssText = `
    width: 10px;
    height: 10px;
    background: rgba(136,255,68,0.8);
    box-shadow: 0 0 6px rgba(136,255,68,0.9);
    transform: rotate(45deg);
    margin: 2px;
  `;
}

export default function RadiationHUD() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const markers: Marker[] = RADIATION_ZONES.map(() => createMarker(container));
    const _vec = new THREE.Vector3();
    // Current zone positions — updated each frame from gravityBodies for planet-linked zones
    const zonePos = RADIATION_ZONES.map((z) => z.position?.clone() ?? new THREE.Vector3());

    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(update);

      if (!radiationOnRef.current || !sceneCamera.current) {
        for (const m of markers) m.root.style.display = 'none';
        return;
      }

      const camera = sceneCamera.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = W * 0.5;
      const cy = H * 0.5;

      for (let i = 0; i < RADIATION_ZONES.length; i++) {
        const zone = RADIATION_ZONES[i];
        const marker = markers[i];

        // Sync planet-linked zone positions
        if (zone.planetName) {
          const body = gravityBodies.get(zone.planetName);
          if (body) zonePos[i].copy(body.position);
        }

        const dist = minimapShipPosition.distanceTo(zonePos[i]);
        if (dist > radiationRangeRef.current) {
          marker.root.style.display = 'none';
          continue;
        }

        _vec.copy(zonePos[i]);
        _vec.project(camera);

        const isBehind = _vec.z > 1;
        let sx = (_vec.x * 0.5 + 0.5) * W;
        let sy = (-_vec.y * 0.5 + 0.5) * H;

        const onScreen =
          !isBehind &&
          sx > EDGE_PAD && sx < W - EDGE_PAD &&
          sy > EDGE_PAD && sy < H - EDGE_PAD;

        const distText =
          dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;

        marker.root.style.display = 'block';
        marker.label.textContent = `\u26A0 ${zone.label} [${distText}]`;

        if (onScreen) {
          const SIZE = 28;
          styleOnScreen(marker, SIZE);
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
            (cy - EDGE_PAD) / (Math.abs(dy) || 1),
          );
          const ex = scale < 1 ? cx + dx * scale : sx;
          const ey = scale < 1 ? cy + dy * scale : sy;
          styleOffScreen(marker);
          marker.root.style.left = `${ex - 7}px`;
          marker.root.style.top = `${ey - 7}px`;
        }
      }
    };

    rafId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(rafId);
      for (const m of markers) m.root.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
    />
  );
}
