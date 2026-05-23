import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { sceneCamera } from '../context/CameraRef';
import { radiationOnRef, radiationRangeRef } from '../context/RadiationScan';
import { activeRadiationZonesRef } from '../context/ActiveRadiationZones';
import { shipPosRef } from '../context/ShipPos';
import {
  resolveRadiationZoneWorldPosition,
  horizontalDistanceToRadiationZone,
} from '../utils/radiationZonePosition';

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
  const markersRef = useRef<Marker[]>([]);
  const zonePosRef = useRef(new THREE.Vector3());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const _vec = new THREE.Vector3();

    const ensureMarkers = (count: number) => {
      const markers = markersRef.current;
      while (markers.length < count) {
        markers.push(createMarker(container));
      }
      for (let i = count; i < markers.length; i++) {
        markers[i].root.style.display = 'none';
      }
    };

    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(update);

      const zones = activeRadiationZonesRef.current;
      const markers = markersRef.current;

      if (!radiationOnRef.current || !sceneCamera.current) {
        for (const m of markers) m.root.style.display = 'none';
        return;
      }

      ensureMarkers(zones.length);

      const camera = sceneCamera.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = W * 0.5;
      const cy = H * 0.5;
      const shipPos = shipPosRef.current;
      const zonePos = zonePosRef.current;

      for (let i = 0; i < zones.length; i++) {
        const zone = zones[i];
        const marker = markers[i];

        if (!resolveRadiationZoneWorldPosition(zone, zonePos)) {
          marker.root.style.display = 'none';
          continue;
        }

        const dist = horizontalDistanceToRadiationZone(shipPos, zonePos);
        if (dist > radiationRangeRef.current) {
          marker.root.style.display = 'none';
          continue;
        }

        _vec.copy(zonePos);
        _vec.project(camera);

        const isBehind = _vec.z > 1;
        let sx = (_vec.x * 0.5 + 0.5) * W;
        let sy = (-_vec.y * 0.5 + 0.5) * H;

        const onScreen =
          !isBehind &&
          sx > EDGE_PAD &&
          sx < W - EDGE_PAD &&
          sy > EDGE_PAD &&
          sy < H - EDGE_PAD;

        const distText =
          dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;

        marker.root.style.display = 'flex';
        marker.root.style.flexDirection = 'column';
        marker.root.style.alignItems = 'center';
        marker.label.textContent = `\u26A0 ${zone.label} [${distText}]`;

        if (onScreen) {
          const SIZE = 28;
          styleOnScreen(marker, SIZE);
          marker.root.style.left = `${sx}px`;
          marker.root.style.top = `${sy}px`;
          marker.root.style.transform = 'translate(-50%, -50%)';
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
          marker.root.style.left = `${ex}px`;
          marker.root.style.top = `${ey}px`;
          marker.root.style.transform = 'translate(-50%, -50%)';
        }
      }
    };

    rafId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(rafId);
      for (const m of markersRef.current) m.root.remove();
      markersRef.current = [];
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
    />
  );
}
