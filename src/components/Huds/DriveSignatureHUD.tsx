import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { sceneCamera } from '../../context/CameraRef';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { getDriveSignatures } from '../../context/DriveSignatureRegistry';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipVelocity } from '../../context/ShipState';
import { clearHoveredObject, hoveredObject, setHoveredObject } from '../../context/HoveredObject';
import { getCollidables, type CollidableEntry } from '../../context/CollisionRegistry';
import { selectTarget, selectedTargetKey } from '../../context/TargetSelection';
import { registerScannerUpdate, unregisterScannerUpdate } from '../../context/ScannerFrameRunner';

const EDGE_PAD = 30; // px margin from screen edge for off-screen indicators
const DOCKING_BAY_ID_PREFIX = 'docking-bay-';
/** Matches HUD warn / amber vitals segments. */
const DRIVE_MARKER_COLOR = '#ffaa00';
const BAY_MARKER_COLOR = '#ffb14a';
const MARKER_SMOOTHING = 0.35;
const MARKER_MIN_MOVE_PX = 0.25;
const EDGE_HYSTERESIS_PX = 8;
const DOT_SIZE_ON_SCREEN = 5;
const DOT_SIZE_OFF_SCREEN = 4;
const DOT_HIT_PAD = 10; // larger click/hover target around the visible dot

// ─── Marker DOM structure ────────────────────────────────────────────────────
function createMarker(container: HTMLElement) {
  const root = document.createElement('div');
  root.style.cssText = `
    position: absolute;
    pointer-events: auto;
    display: none;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  `;

  const box = document.createElement('div');
  box.className = 'dshud-dot';

  const label = document.createElement('div');
  label.className = 'dshud-label';
  label.style.cssText = `
    font-family: monospace;
    font-size: 10px;
    color: ${DRIVE_MARKER_COLOR};
    text-align: center;
    white-space: pre-line;
    line-height: 1.25;
    text-shadow: 0 0 4px rgba(255,170,0,0.8);
    margin-top: 3px;
    max-width: min(220px, 40vw);
    pointer-events: none;
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

function styleDot(marker: Marker, size: number, color: string, selected: boolean) {
  const glow = selected ? `0 0 8px ${color}` : `0 0 4px ${color}aa`;
  marker.box.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background: ${color};
    border: none;
    border-radius: 50%;
    box-shadow: ${glow};
    margin: ${DOT_HIT_PAD}px;
    transform: none;
  `;
}

function markerKeyForDockingBay(driveId: string, dockingBayId: string): string {
  return `${driveId}::${dockingBayId}`;
}

function isDockingBayForDrive(entryId: string, collidable: CollidableEntry): boolean {
  if (!collidable.id.startsWith(DOCKING_BAY_ID_PREFIX)) return false;
  if (collidable.id === `${DOCKING_BAY_ID_PREFIX}${entryId}`) return true;
  if (collidable.stationId === entryId) return true;
  if (collidable.id.endsWith(`-${entryId}`)) return true;
  if (collidable.stationId?.endsWith(`-${entryId}`)) return true;
  return false;
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

function smoothMarkerPosition(
  states: Map<string, MarkerScreenState>,
  id: string,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  const prev = states.get(id);
  if (!prev) {
    states.set(id, { x: targetX, y: targetY, onScreen: false });
    return { x: targetX, y: targetY };
  }
  let nextX = prev.x + (targetX - prev.x) * MARKER_SMOOTHING;
  let nextY = prev.y + (targetY - prev.y) * MARKER_SMOOTHING;
  if (Math.abs(nextX - prev.x) < MARKER_MIN_MOVE_PX) nextX = prev.x;
  if (Math.abs(nextY - prev.y) < MARKER_MIN_MOVE_PX) nextY = prev.y;
  prev.x = nextX;
  prev.y = nextY;
  return { x: nextX, y: nextY };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DriveSignatureHUD() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const _pos = new THREE.Vector3();
    const _vec = new THREE.Vector3();
    const _toTgt = new THREE.Vector3();
    const _targetVel = new THREE.Vector3();
    const _dockPos = new THREE.Vector3();

    // Markers are created/destroyed dynamically as the registry changes.
    // We keep a map keyed by entry id.
    const markerMap = new Map<string, Marker>();
    const dockingBayMarkerMap = new Map<string, Marker>();
    const driveMarkerStates = new Map<string, MarkerScreenState>();
    const bayMarkerStates = new Map<string, MarkerScreenState>();
    let hoveredDriveId: string | null = null;
    let hoveredBayId: string | null = null;

    const update = () => {
      if (!driveSignatureOnRef.current || !sceneCamera.current) {
        if (hoveredDriveId && hoveredObject.id === hoveredDriveId) {
          clearHoveredObject();
        }
        hoveredDriveId = null;
        hoveredBayId = null;
        for (const m of markerMap.values()) m.root.style.display = 'none';
        for (const m of dockingBayMarkerMap.values()) m.root.style.display = 'none';
        return;
      }

      const camera = sceneCamera.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = W * 0.5;
      const cy = H * 0.5;
      const selectedId = selectedTargetKey;

      const entries = getDriveSignatures();
      const dockingBayCollidables = getCollidables().filter((c) =>
        c.id.startsWith(DOCKING_BAY_ID_PREFIX)
      );

      // Ensure a marker exists for each registered entry
      const seenIds = new Set<string>();
      const seenDockingBayMarkerIds = new Set<string>();
      for (const entry of entries) {
        seenIds.add(entry.id);
        if (!markerMap.has(entry.id)) {
          const id = entry.id;
          const marker = createMarker(container);
          marker.root.addEventListener('pointerenter', () => {
            hoveredDriveId = id;
          });
          marker.root.addEventListener('pointerleave', () => {
            if (hoveredDriveId !== id) return;
            hoveredDriveId = null;
            if (hoveredObject.id === id) clearHoveredObject();
          });
          marker.root.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const sig = getDriveSignatures().find((s) => s.id === id);
            if (!sig) return;
            sig.getPosition(_pos);
            if (sig.getVelocity) sig.getVelocity(_targetVel);
            else _targetVel.set(0, 0, 0);
            selectTarget(sig.label, _targetVel, _pos, id, 'ship');
          });
          markerMap.set(entry.id, marker);
        }
      }

      // Remove markers for entries that have unregistered
      for (const [id, marker] of markerMap) {
        if (!seenIds.has(id)) {
          if (hoveredDriveId === id) {
            hoveredDriveId = null;
            if (hoveredObject.id === id) clearHoveredObject();
          }
          marker.root.remove();
          markerMap.delete(id);
          driveMarkerStates.delete(id);
        }
      }
      for (const entry of entries) {
        const marker = markerMap.get(entry.id)!;

        entry.getPosition(_pos);
        const dist = minimapShipPosition.distanceTo(_pos);
        if (dist > driveSignatureRangeRef.current) {
          if (hoveredDriveId === entry.id) {
            hoveredDriveId = null;
            if (hoveredObject.id === entry.id) clearHoveredObject();
          }
          marker.root.style.display = 'none';
          const prevState = driveMarkerStates.get(entry.id);
          if (prevState) prevState.onScreen = false;
          continue;
        }

        _toTgt.subVectors(_pos, minimapShipPosition);
        const len = _toTgt.length();
        let relVelStr = '—';
        if (entry.getVelocity) entry.getVelocity(_targetVel);
        else _targetVel.set(0, 0, 0);
        if (len > 1e-5) {
          const inv = 1 / len;
          const rel =
            ((shipVelocity.x - _targetVel.x) * _toTgt.x +
              (shipVelocity.y - _targetVel.y) * _toTgt.y +
              (shipVelocity.z - _targetVel.z) * _toTgt.z) *
            inv;
          relVelStr = `${rel >= 0 ? '+' : ''}${rel.toFixed(1)} m/s`;
        }

        const isSelected = selectedId === entry.id;
        const isHovered = hoveredDriveId === entry.id;
        if (isHovered) {
          setHoveredObject(entry.id, entry.label, _pos, _targetVel);
        }

        // Project to normalised device coords
        _vec.copy(_pos);
        _vec.project(camera);

        const isBehind = _vec.z > 1;
        let sx = (_vec.x * 0.5 + 0.5) * W;
        let sy = (-_vec.y * 0.5 + 0.5) * H;

        const prevDriveState = driveMarkerStates.get(entry.id);
        const onScreen = isOnScreenWithHysteresis(
          sx,
          sy,
          isBehind,
          W,
          H,
          prevDriveState?.onScreen ?? false
        );

        marker.root.style.display = 'flex';
        marker.root.style.pointerEvents = 'auto';
        marker.label.style.color = DRIVE_MARKER_COLOR;
        marker.label.style.textShadow = '0 0 4px rgba(255,170,0,0.8)';
        if (isSelected) {
          marker.label.textContent = `${entry.label}\n${relVelStr}`;
          marker.label.style.display = 'block';
        } else if (isHovered) {
          marker.label.textContent = entry.label;
          marker.label.style.display = 'block';
        } else {
          marker.label.textContent = '';
          marker.label.style.display = 'none';
        }

        if (onScreen) {
          styleDot(marker, DOT_SIZE_ON_SCREEN, DRIVE_MARKER_COLOR, isSelected);
          const smoothed = smoothMarkerPosition(driveMarkerStates, entry.id, sx, sy);
          marker.root.style.left = `${Math.round(smoothed.x)}px`;
          marker.root.style.top = `${Math.round(smoothed.y)}px`;
          marker.root.style.transform = 'translate(-50%, -50%)';
          const state = driveMarkerStates.get(entry.id);
          if (state) state.onScreen = true;
        } else {
          // Flip direction when behind camera
          if (isBehind) {
            sx = W - sx;
            sy = H - sy;
          }

          // Clamp to screen edge
          const dx = sx - cx;
          const dy = sy - cy;
          const scale = Math.min(
            (cx - EDGE_PAD) / (Math.abs(dx) || 1),
            (cy - EDGE_PAD) / (Math.abs(dy) || 1)
          );
          const ex = scale < 1 ? cx + dx * scale : sx;
          const ey = scale < 1 ? cy + dy * scale : sy;

          styleDot(marker, DOT_SIZE_OFF_SCREEN, DRIVE_MARKER_COLOR, isSelected);
          const smoothed = smoothMarkerPosition(driveMarkerStates, entry.id, ex, ey);
          marker.root.style.left = `${Math.round(smoothed.x)}px`;
          marker.root.style.top = `${Math.round(smoothed.y)}px`;
          marker.root.style.transform = 'translate(-50%, -50%)';
          const state = driveMarkerStates.get(entry.id);
          if (state) state.onScreen = false;
        }

        const matchingDockingBays = dockingBayCollidables.filter((dock) =>
          isDockingBayForDrive(entry.id, dock)
        );
        for (const dock of matchingDockingBays) {
          const dockMarkerId = markerKeyForDockingBay(entry.id, dock.id);
          const bayLabel = `${entry.label} BAY`;
          seenDockingBayMarkerIds.add(dockMarkerId);
          if (!dockingBayMarkerMap.has(dockMarkerId)) {
            const bayMarker = createMarker(container);
            bayMarker.root.addEventListener('pointerenter', () => {
              hoveredBayId = dockMarkerId;
            });
            bayMarker.root.addEventListener('pointerleave', () => {
              if (hoveredBayId === dockMarkerId) hoveredBayId = null;
            });
            bayMarker.root.addEventListener('pointerdown', (e) => {
              e.stopPropagation();
              dock.getWorldPosition(_dockPos);
              selectTarget(bayLabel, undefined, _dockPos, dock.id, 'default');
            });
            dockingBayMarkerMap.set(dockMarkerId, bayMarker);
          }
          const dockMarker = dockingBayMarkerMap.get(dockMarkerId)!;

          dock.getWorldPosition(_dockPos);
          const dockDist = minimapShipPosition.distanceTo(_dockPos);
          if (dockDist > driveSignatureRangeRef.current) {
            dockMarker.root.style.display = 'none';
            const prevBayState = bayMarkerStates.get(dockMarkerId);
            if (prevBayState) prevBayState.onScreen = false;
            continue;
          }

          _vec.copy(_dockPos);
          _vec.project(camera);
          const dockBehind = _vec.z > 1;
          let dockSx = (_vec.x * 0.5 + 0.5) * W;
          let dockSy = (-_vec.y * 0.5 + 0.5) * H;

          const prevBayState = bayMarkerStates.get(dockMarkerId);
          const dockOnScreen = isOnScreenWithHysteresis(
            dockSx,
            dockSy,
            dockBehind,
            W,
            H,
            prevBayState?.onScreen ?? false
          );

          const baySelected = selectedId === dock.id;
          const bayHovered = hoveredBayId === dockMarkerId;
          dockMarker.root.style.display = 'flex';
          dockMarker.root.style.pointerEvents = 'auto';
          dockMarker.label.style.color = BAY_MARKER_COLOR;
          dockMarker.label.style.textShadow = '0 0 4px rgba(255,177,74,0.8)';
          if (baySelected) {
            dockMarker.label.textContent = bayLabel;
            dockMarker.label.style.display = 'block';
          } else if (bayHovered) {
            dockMarker.label.textContent = bayLabel;
            dockMarker.label.style.display = 'block';
          } else {
            dockMarker.label.textContent = '';
            dockMarker.label.style.display = 'none';
          }

          if (dockOnScreen) {
            styleDot(dockMarker, DOT_SIZE_ON_SCREEN, BAY_MARKER_COLOR, baySelected);
            const smoothed = smoothMarkerPosition(
              bayMarkerStates,
              dockMarkerId,
              dockSx,
              dockSy
            );
            dockMarker.root.style.left = `${Math.round(smoothed.x)}px`;
            dockMarker.root.style.top = `${Math.round(smoothed.y)}px`;
            dockMarker.root.style.transform = 'translate(-50%, -50%)';
            const state = bayMarkerStates.get(dockMarkerId);
            if (state) state.onScreen = true;
          } else {
            if (dockBehind) {
              dockSx = W - dockSx;
              dockSy = H - dockSy;
            }
            const dockDx = dockSx - cx;
            const dockDy = dockSy - cy;
            const dockScale = Math.min(
              (cx - EDGE_PAD) / (Math.abs(dockDx) || 1),
              (cy - EDGE_PAD) / (Math.abs(dockDy) || 1)
            );
            const dockEx = dockScale < 1 ? cx + dockDx * dockScale : dockSx;
            const dockEy = dockScale < 1 ? cy + dockDy * dockScale : dockSy;
            styleDot(dockMarker, DOT_SIZE_OFF_SCREEN, BAY_MARKER_COLOR, baySelected);
            const smoothed = smoothMarkerPosition(
              bayMarkerStates,
              dockMarkerId,
              dockEx,
              dockEy
            );
            dockMarker.root.style.left = `${Math.round(smoothed.x)}px`;
            dockMarker.root.style.top = `${Math.round(smoothed.y)}px`;
            dockMarker.root.style.transform = 'translate(-50%, -50%)';
            const state = bayMarkerStates.get(dockMarkerId);
            if (state) state.onScreen = false;
          }
        }
      }

      for (const [id, marker] of dockingBayMarkerMap) {
        if (!seenDockingBayMarkerIds.has(id)) {
          marker.root.remove();
          dockingBayMarkerMap.delete(id);
          bayMarkerStates.delete(id);
        }
      }
    };

    registerScannerUpdate(update);
    return () => {
      unregisterScannerUpdate(update);
      for (const m of markerMap.values()) m.root.remove();
      for (const m of dockingBayMarkerMap.values()) m.root.remove();
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
