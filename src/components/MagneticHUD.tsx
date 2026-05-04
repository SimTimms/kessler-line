import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { sceneCamera } from '../context/CameraRef';
import { magneticOnRef, magneticScanRangeRef } from '../context/MagneticScan';
import { getMagneticTargets } from '../context/MagneticRegistry';
import { minimapShipPosition } from '../context/MinimapShipPosition';
import { shipVelocity } from '../context/ShipState';

const EDGE_PAD = 30; // px margin from screen edge for off-screen indicators
const MAX_MARKERS = 200; // pre-allocated pool — supports up to this many simultaneous targets

// ─── Marker DOM structure ────────────────────────────────────────────────────
function createMarker(container: HTMLElement) {
  const root = document.createElement('div');
  root.style.cssText = `
    position: absolute;
    pointer-events: none;
    display: none;
    flex-direction: column;
    align-items: center;
  `;

  const box = document.createElement('div');
  box.className = 'mhud-box';

  const label = document.createElement('div');
  label.className = 'mhud-label';
  label.style.cssText = `
    font-family: monospace;
    font-size: 10px;
    color: #ffaa00;
    text-align: center;
    white-space: pre-line;
    line-height: 1.25;
    text-shadow: 0 0 4px rgba(255,170,0,0.8);
    margin-top: 4px;
    max-width: min(220px, 40vw);
  `;

  root.appendChild(box);
  root.appendChild(label);
  container.appendChild(root);
  return { root, box, label };
}

type Marker = ReturnType<typeof createMarker>;

// ─── On-screen bracket style ─────────────────────────────────────────────────
function styleOnScreen(marker: Marker, size: number) {
  marker.box.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border: 1px solid #ffaa00;
    box-shadow: 0 0 8px rgba(255,170,0,0.5), inset 0 0 4px rgba(255,170,0,0.1);
  `;
}

// ─── Off-screen diamond style ─────────────────────────────────────────────────
function styleOffScreen(marker: Marker) {
  marker.box.style.cssText = `
    width: 10px;
    height: 10px;
    background: rgba(255,170,0,0.8);
    box-shadow: 0 0 6px rgba(255,170,0,0.9);
    transform: rotate(45deg);
    margin: 2px;
  `;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MagneticHUD() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pre-allocate a fixed pool of marker DOM nodes
    const markers: Marker[] = Array.from({ length: MAX_MARKERS }, () =>
      createMarker(container),
    );

    const _vec = new THREE.Vector3();
    const _worldPos = new THREE.Vector3();
    const _toTgt = new THREE.Vector3();
    const _targetVel = new THREE.Vector3();

    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(update);

      const camera = sceneCamera.current;
      if (!magneticOnRef.current || !camera) {
        for (const m of markers) m.root.style.display = 'none';
        return;
      }

      const targets = getMagneticTargets();
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = W * 0.5;
      const cy = H * 0.5;

      for (let i = 0; i < MAX_MARKERS; i++) {
        const target = targets[i];
        const marker = markers[i];

        if (!target) {
          marker.root.style.display = 'none';
          continue;
        }

        target.getPosition(_worldPos);
        const dist = minimapShipPosition.distanceTo(_worldPos);

        if (dist > magneticScanRangeRef.current) {
          marker.root.style.display = 'none';
          continue;
        }

        _toTgt.subVectors(_worldPos, minimapShipPosition);
        const len = _toTgt.length();
        let relVelStr = '—';
        if (len > 1e-5) {
          const inv = 1 / len;
          if (target.getVelocity) target.getVelocity(_targetVel);
          else _targetVel.set(0, 0, 0);
          const rel =
            ((shipVelocity.x - _targetVel.x) * _toTgt.x +
              (shipVelocity.y - _targetVel.y) * _toTgt.y +
              (shipVelocity.z - _targetVel.z) * _toTgt.z) *
            inv;
          relVelStr = `${rel >= 0 ? '+' : ''}${rel.toFixed(1)} m/s`;
        }

        // Project to normalised device coords
        _vec.copy(_worldPos).project(camera);

        const isBehind = _vec.z > 1;
        let sx = (_vec.x * 0.5 + 0.5) * W;
        let sy = (-_vec.y * 0.5 + 0.5) * H;

        const onScreen =
          !isBehind &&
          sx > EDGE_PAD && sx < W - EDGE_PAD &&
          sy > EDGE_PAD && sy < H - EDGE_PAD;

        const distText =
          dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;

        marker.root.style.display = 'flex';
        marker.label.textContent = `${target.label}\n${distText}\n${relVelStr}`;

        if (onScreen) {
          const SIZE = 28;
          styleOnScreen(marker, SIZE);
          marker.root.style.left = `${sx}px`;
          marker.root.style.top = `${sy}px`;
          marker.root.style.transform = 'translate(-50%, -50%)';
        } else {
          if (isBehind) { sx = W - sx; sy = H - sy; }

          const dx = sx - cx;
          const dy = sy - cy;
          const scale = Math.min(
            (cx - EDGE_PAD) / (Math.abs(dx) || 1),
            (cy - EDGE_PAD) / (Math.abs(dy) || 1),
          );
          const ex = scale < 1 ? cx + dx * scale : sx;
          const ey = scale < 1 ? cy + dy * scale : sy;

          styleOffScreen(marker);
          marker.root.style.left = `${ex}px`;
          marker.root.style.top = `${ey}px`;
          marker.root.style.transform = 'translate(-50%, -50%)';
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
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
