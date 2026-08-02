import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { sceneCamera } from '../../context/CameraRef';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { getCollidables } from '../../context/CollisionRegistry';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { SHIP_COLLISION_ID } from '../../context/ShipState';
import { navTargetIdRef } from '../../context/NavTarget';
import { registerScannerUpdate, unregisterScannerUpdate } from '../../context/ScannerFrameRunner';

const EDGE_PAD = 30;
const PROXIMITY_MARKER_MAX_COUNT = 10;
const PROXIMITY_DOT_SIZE = 5;

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

function styleDot(marker: Marker, color: string) {
  marker.box.style.cssText = `
    width: ${PROXIMITY_DOT_SIZE}px;
    height: ${PROXIMITY_DOT_SIZE}px;
    border-radius: 50%;
    background: ${color};
    box-shadow: 0 0 6px ${color};
  `;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProximityHUD() {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const _posRef = useRef(new THREE.Vector3());
  const _ndcRef = useRef(new THREE.Vector3());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tick = () => {
      const markers = markersRef.current;
      const _pos = _posRef.current;
      const _ndc = _ndcRef.current;

      if (!proximityScanOnRef.current || !sceneCamera.current) {
        for (const m of markers.values()) m.root.style.display = 'none';
        return;
      }

      const range = proximityScanRangeRef.current;
      const camera = sceneCamera.current;
      const W = window.innerWidth;
      const H = window.innerHeight;

      const collidables = getCollidables().filter(
        (c) => c.id !== SHIP_COLLISION_ID && !c.id.startsWith('docking-bay-')
      );
      const markerCandidates: Array<{ entry: (typeof collidables)[number]; dist: number }> = [];

      for (const entry of collidables) {
        entry.getWorldPosition(_pos);
        const dist = minimapShipPosition.distanceTo(_pos);
        if (dist <= range) {
          markerCandidates.push({ entry, dist });
        }
      }

      markerCandidates.sort((a, b) => a.dist - b.dist);
      const selectedMarkers = markerCandidates.slice(0, PROXIMITY_MARKER_MAX_COUNT);
      const visibleIds = new Set<string>();

      for (const { entry, dist } of selectedMarkers) {
        entry.getWorldPosition(_pos);
        visibleIds.add(entry.id);

        if (!markers.has(entry.id)) {
          markers.set(entry.id, createMarker(container));
        }
        const marker = markers.get(entry.id)!;

        const ratio = dist / Math.max(1, range);
        const color = getColor(ratio);
        const distText = dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;
        const isNavTarget = navTargetIdRef.current.trim() === entry.id;

        marker.root.style.display = 'block';
        styleDot(marker, color);
        marker.label.textContent = isNavTarget ? distText : '';
        marker.label.style.color = color;
        marker.label.style.textShadow = `0 0 4px ${color}cc`;

        _ndc.copy(_pos);
        _ndc.project(camera);

        const isBehind = _ndc.z > 1;
        const sx = (_ndc.x * 0.5 + 0.5) * W;
        const sy = (-_ndc.y * 0.5 + 0.5) * H;
        const onScreen =
          !isBehind && sx > EDGE_PAD && sx < W - EDGE_PAD && sy > EDGE_PAD && sy < H - EDGE_PAD;

        if (!onScreen) {
          marker.root.style.display = 'none';
          continue;
        }

        marker.root.style.left = `${Math.round(sx - PROXIMITY_DOT_SIZE * 0.5)}px`;
        marker.root.style.top = `${Math.round(sy - PROXIMITY_DOT_SIZE * 0.5)}px`;
      }

      for (const [id, m] of markers) {
        if (!visibleIds.has(id)) {
          m.root.style.display = 'none';
        }
      }
    };

    registerScannerUpdate(tick);
    return () => {
      unregisterScannerUpdate(tick);
      const markers = markersRef.current;
      for (const m of markers.values()) m.root.remove();
      markers.clear();
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
