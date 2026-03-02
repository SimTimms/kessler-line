import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { sceneCamera } from '../context/CameraRef';
import { driveSignatureOnRef } from '../context/DriveSignatureScan';
import { getDriveSignatures } from '../context/DriveSignatureRegistry';
import { minimapShipPosition } from '../context/MinimapShipPosition';

const SCAN_RADIUS = 10000;
const EDGE_PAD = 30; // px margin from screen edge for off-screen indicators

// ─── Marker DOM structure ────────────────────────────────────────────────────
function createMarker(container: HTMLElement) {
  const root = document.createElement('div');
  root.style.cssText = `
    position: absolute;
    pointer-events: none;
    display: none;
  `;

  const box = document.createElement('div');
  box.className = 'dshud-box';

  const label = document.createElement('div');
  label.className = 'dshud-label';
  label.style.cssText = `
    font-family: monospace;
    font-size: 10px;
    color: #ff4444;
    white-space: nowrap;
    text-shadow: 0 0 4px rgba(255,68,68,0.8);
    margin-top: 3px;
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
    border: 1px solid #ff4444;
    box-shadow: 0 0 8px rgba(255,68,68,0.5), inset 0 0 4px rgba(255,68,68,0.1);
  `;
}

// ─── Off-screen diamond style ─────────────────────────────────────────────────
function styleOffScreen(marker: Marker) {
  marker.box.style.cssText = `
    width: 10px;
    height: 10px;
    background: rgba(255,68,68,0.8);
    box-shadow: 0 0 6px rgba(255,68,68,0.9);
    transform: rotate(45deg);
    margin: 2px;
  `;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DriveSignatureHUD() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const _pos = new THREE.Vector3();
    const _vec = new THREE.Vector3();

    // Markers are created/destroyed dynamically as the registry changes.
    // We keep a map keyed by entry id.
    const markerMap = new Map<string, Marker>();

    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(update);

      if (!driveSignatureOnRef.current || !sceneCamera.current) {
        for (const m of markerMap.values()) m.root.style.display = 'none';
        return;
      }

      const camera = sceneCamera.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = W * 0.5;
      const cy = H * 0.5;

      const entries = getDriveSignatures();

      // Ensure a marker exists for each registered entry
      const seenIds = new Set<string>();
      for (const entry of entries) {
        seenIds.add(entry.id);
        if (!markerMap.has(entry.id)) {
          markerMap.set(entry.id, createMarker(container));
        }
      }

      // Remove markers for entries that have unregistered
      for (const [id, marker] of markerMap) {
        if (!seenIds.has(id)) {
          marker.root.remove();
          markerMap.delete(id);
        }
      }

      for (const entry of entries) {
        const marker = markerMap.get(entry.id)!;

        entry.getPosition(_pos);
        const dist = minimapShipPosition.distanceTo(_pos);
        if (dist > SCAN_RADIUS) {
          marker.root.style.display = 'none';
          continue;
        }

        // Project to normalised device coords
        _vec.copy(_pos);
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
        marker.label.textContent = `${entry.label} [${distText}]`;

        if (onScreen) {
          const SIZE = 28;
          styleOnScreen(marker, SIZE);
          marker.root.style.left = `${sx - SIZE * 0.5}px`;
          marker.root.style.top  = `${sy - SIZE * 0.5}px`;
        } else {
          // Flip direction when behind camera
          if (isBehind) { sx = W - sx; sy = H - sy; }

          // Clamp to screen edge
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
          marker.root.style.top  = `${ey - 7}px`;
        }
      }
    };

    rafId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(rafId);
      for (const m of markerMap.values()) m.root.remove();
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
