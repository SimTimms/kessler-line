import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { sceneCamera } from '../../context/CameraRef';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { getMagneticTargets } from '../../context/MagneticRegistry';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipVelocity } from '../../context/ShipState';
import { registerScannerUpdate, unregisterScannerUpdate } from '../../context/ScannerFrameRunner';

const EDGE_PAD = 30; // px margin from screen edge for off-screen indicators
const MAX_MARKERS = 200; // pre-allocated pool — supports up to this many simultaneous targets
const MARKER_SMOOTHING = 0.35;
const MARKER_MIN_MOVE_PX = 0.25;
const EDGE_HYSTERESIS_PX = 8;

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
type MarkerScreenState = {
  x: number;
  y: number;
  onScreen: boolean;
};

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

function isOnScreenWithHysteresis(
  x: number,
  y: number,
  isBehind: boolean,
  width: number,
  height: number,
  wasOnScreen: boolean
): boolean {
  if (isBehind) return false;
  const inPrimary =
    x > EDGE_PAD && x < width - EDGE_PAD && y > EDGE_PAD && y < height - EDGE_PAD;
  if (inPrimary) return true;
  if (!wasOnScreen) return false;
  return (
    x > EDGE_PAD - EDGE_HYSTERESIS_PX &&
    x < width - EDGE_PAD + EDGE_HYSTERESIS_PX &&
    y > EDGE_PAD - EDGE_HYSTERESIS_PX &&
    y < height - EDGE_PAD + EDGE_HYSTERESIS_PX
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MagneticHUD() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pre-allocate a fixed pool of marker DOM nodes
    const markers: Marker[] = Array.from({ length: MAX_MARKERS }, () => createMarker(container));
    const markerStates: MarkerScreenState[] = Array.from({ length: MAX_MARKERS }, () => ({
      x: 0,
      y: 0,
      onScreen: false,
    }));

    const _vec = new THREE.Vector3();
    const _worldPos = new THREE.Vector3();
    const _toTgt = new THREE.Vector3();
    const _targetVel = new THREE.Vector3();

    const update = () => {
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
          markerStates[i]!.onScreen = false;
          continue;
        }

        target.getPosition(_worldPos);
        const dist = minimapShipPosition.distanceTo(_worldPos);

        if (dist > magneticScanRangeRef.current) {
          marker.root.style.display = 'none';
          markerStates[i]!.onScreen = false;
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

        const state = markerStates[i]!;
        const onScreen = isOnScreenWithHysteresis(
          sx,
          sy,
          isBehind,
          W,
          H,
          state.onScreen
        );

        const distText = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;

        marker.root.style.display = 'flex';
        marker.label.textContent = `${target.label} - ${distText}\n${relVelStr}`;

        if (onScreen) {
          const SIZE = 28;
          styleOnScreen(marker, SIZE);
          state.x += (sx - state.x) * MARKER_SMOOTHING;
          state.y += (sy - state.y) * MARKER_SMOOTHING;
          if (Math.abs(sx - state.x) < MARKER_MIN_MOVE_PX) state.x = sx;
          if (Math.abs(sy - state.y) < MARKER_MIN_MOVE_PX) state.y = sy;
          marker.root.style.left = `${Math.round(state.x)}px`;
          marker.root.style.top = `${Math.round(state.y)}px`;
          marker.root.style.transform = 'translate(-50%, -50%)';
          state.onScreen = true;
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

          styleOffScreen(marker);
          state.x += (ex - state.x) * MARKER_SMOOTHING;
          state.y += (ey - state.y) * MARKER_SMOOTHING;
          if (Math.abs(ex - state.x) < MARKER_MIN_MOVE_PX) state.x = ex;
          if (Math.abs(ey - state.y) < MARKER_MIN_MOVE_PX) state.y = ey;
          marker.root.style.left = `${Math.round(state.x)}px`;
          marker.root.style.top = `${Math.round(state.y)}px`;
          marker.root.style.transform = 'translate(-50%, -50%)';
          state.onScreen = false;
        }
      }
    };

    registerScannerUpdate(update);
    return () => {
      unregisterScannerUpdate(update);
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
