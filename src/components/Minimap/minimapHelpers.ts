import * as THREE from 'three';
import { PLANETS } from '../Planets/SolarSystemConfig';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import { shipPosRef } from '../../context/ShipPos';
import {
  MINIMAP_TRAJECTORY_DT,
  MINIMAP_TRAJECTORY_STEPS,
} from '../../config/shipDirectionIndicatorConfig';
import type { Marker, MarkerKind, PanCenter, UnifiedMarker } from './minimapTypes';

export const MAX_MARKERS_PER_GROUP = 160;
export const ZOOM_MIN_HALF_SPAN = 100;

const MAX_PLANET_ORBIT_WORLD =
  Math.max(...PLANETS.map((p) => p.orbitRadius)) * SOLAR_SYSTEM_SCALE;
// Add outer-system margin so zoom/pan still covers Neptune and beyond (Pluto-like distances).
const OUTER_SYSTEM_COVERAGE_WORLD = MAX_PLANET_ORBIT_WORLD * 1.7;
export const ZOOM_DEFAULT_HALF_SPAN = OUTER_SYSTEM_COVERAGE_WORLD;
export const ZOOM_MAX_HALF_SPAN = OUTER_SYSTEM_COVERAGE_WORLD * 2.2;
export const PAN_LIMIT = OUTER_SYSTEM_COVERAGE_WORLD * 3.0;
/** Half-span used when the map opens without the solar system layer. */
export const ZOOM_LOCAL_HALF_SPAN = 1500;

export const DOCKING_ASSIST_RANGE = 220;
export const DOCKING_ASSIST_MIN_HALF_SPAN = 22;
export const DOCKING_ASSIST_MAX_HALF_SPAN = 260;
export const DOCKING_ASSIST_MARGIN = 26;
export const DOCKING_SPEED_GAUGE_MAX_MPS = 14;
/** Extra framing around planet / path when computing orbit-assist zoom. */
export const ORBIT_ASSIST_FRAME = 1.22;

export const EVENT_DOCKING_CAPTURE_STARTED = 'DockingCaptureStarted';
export const EVENT_DOCKING_CAPTURE_ENDED = 'DockingCaptureEnded';

/** Recompute minimap trajectory every N animation frames. */
export const MINIMAP_TRAJECTORY_UPDATE_FRAMES = 10;
/** Use fewer trajectory points for performance while preserving total look-ahead time. */
export const MINIMAP_TRAJECTORY_RESAMPLED_STEPS = 40;
export const MINIMAP_TRAJECTORY_RESAMPLED_DT =
  (MINIMAP_TRAJECTORY_STEPS * MINIMAP_TRAJECTORY_DT) / MINIMAP_TRAJECTORY_RESAMPLED_STEPS;

const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function idealOrbitRadiusForBody(body: {
  surfaceRadius: number;
  orbitAltitude: number;
  soiRadius: number;
}): number {
  return Math.min(body.surfaceRadius + body.orbitAltitude, body.soiRadius * 0.9);
}

export function formatOrbitDistance(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}k`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

/** CSS transform for ship-nav-icon.png (default points up) from world heading (atan2 x,z, 0=+Z). */
export function shipIconCssTransform(headingDeg: number): string {
  return `translate(-50%, -50%) rotate(${180 - headingDeg}deg) scaleY(-1)`;
}

export function signedAngleDegXZ(from: THREE.Vector3, to: THREE.Vector3): number {
  const a = _tmpA.set(from.x, 0, from.z).normalize();
  const b = _tmpB.set(to.x, 0, to.z).normalize();
  if (a.lengthSq() <= 1e-6 || b.lengthSq() <= 1e-6) return 0;
  const dot = clamp(a.dot(b), -1, 1);
  const crossY = a.x * b.z - a.z * b.x;
  return (Math.atan2(crossY, dot) * 180) / Math.PI;
}

/** Pixels per world unit for a chart element showing `2 * halfSpan` world units vertically. */
export function chartScale(rect: DOMRect, halfSpan: number): number {
  return rect.height / (2 * halfSpan);
}

export function projectToChart(
  worldX: number,
  worldZ: number,
  rect: DOMRect,
  panCenter: PanCenter,
  scale: number
): { sx: number; sy: number } {
  return {
    sx: (worldX - panCenter.x) * scale + rect.width / 2,
    sy: (worldZ - panCenter.z) * scale + rect.height / 2,
  };
}

export function markerClass(kind: MarkerKind): string {
  if (kind === 'ship') return 'sandbox-map-marker sandbox-map-marker--ship';
  if (kind === 'nav') return 'sandbox-map-marker sandbox-map-marker--nav';
  if (kind === 'planet') return 'sandbox-map-marker sandbox-map-marker--planet';
  if (kind === 'drive') return 'sandbox-map-marker sandbox-map-marker--drive';
  if (kind === 'mag') return 'sandbox-map-marker sandbox-map-marker--mag';
  if (kind === 'radio') return 'sandbox-map-marker sandbox-map-marker--radio';
  if (kind === 'hard') return 'sandbox-map-marker sandbox-map-marker--hard';
  if (kind === 'landingPad') return 'sandbox-map-marker sandbox-map-marker--landing-pad';
  return 'sandbox-map-marker sandbox-map-marker--proximity';
}

export function describeMarker(marker: Marker): string[] {
  const ship = shipPosRef.current;
  const dist = _tmpA.set(marker.x, 0, marker.z).distanceTo(_tmpB.set(ship.x, 0, ship.z));
  const distKm = `${Math.max(0, Math.round(dist))} km`;
  if (marker.kind === 'planet') {
    return ['Planetary Body', `Distance: ${distKm}`];
  }
  if (marker.kind === 'ship') {
    return ['Player Vessel', `Position: ${Math.round(marker.x)}, ${Math.round(marker.z)}`];
  }
  if (marker.kind === 'nav') {
    return ['Navigation Target', `Distance: ${distKm}`];
  }
  if (marker.kind === 'drive') {
    return ['Drive Signature Contact', `Range: ${marker.inRange ? 'IN RANGE' : 'OUT OF RANGE'}`];
  }
  if (marker.kind === 'mag') {
    return ['Magnetic Scan Contact', `Distance: ${distKm}`];
  }
  if (marker.kind === 'radio') {
    return ['Radio Contact', `Range: ${marker.inRange ? 'IN RANGE' : 'OUT OF RANGE'}`];
  }
  if (marker.kind === 'hard') {
    return ['Hard Object (Physical)', `Distance: ${distKm}`];
  }
  if (marker.kind === 'landingPad') {
    return ['Landing Pad (Radio)', `Distance: ${distKm}`];
  }
  return ['Proximity Contact', `Distance: ${distKm}`];
}

// ── Unified marker helpers ──

export function isUnifiedMarker(m: Marker | UnifiedMarker): m is UnifiedMarker {
  return 'scanners' in m;
}

/** Priority order for choosing the primary kind when merging. Higher index = higher priority. */
const KIND_PRIORITY: MarkerKind[] = ['hard', 'proximity', 'mag', 'drive', 'landingPad', 'radio'];

const SCANNER_LABELS: Partial<Record<MarkerKind, string>> = {
  proximity: 'PRX',
  mag: 'MAG',
  drive: 'DRV',
  radio: 'RAD',
  hard: 'HRD',
  landingPad: 'PAD',
};

/**
 * Merge raw markers that share the same `entityId` into a single UnifiedMarker.
 * Ship, planet, and nav kinds are never merged — they pass through unchanged.
 */
export function mergeMarkersByEntity(raw: Marker[]): (Marker | UnifiedMarker)[] {
  const passKinds = new Set<MarkerKind>(['ship', 'planet', 'nav']);
  const passthrough: Marker[] = [];
  const groups = new Map<string, Marker[]>();

  for (const m of raw) {
    if (passKinds.has(m.kind) || !m.entityId) {
      passthrough.push(m);
      continue;
    }
    const arr = groups.get(m.entityId);
    if (arr) arr.push(m);
    else groups.set(m.entityId, [m]);
  }

  const merged: (Marker | UnifiedMarker)[] = [...passthrough];

  for (const [, members] of groups) {
    if (members.length === 1) {
      // Single-scanner entity — still unify so rendering is consistent
      const m = members[0];
      merged.push({
        ...m,
        scanners: new Set([m.kind]),
        primaryKind: m.kind,
      });
      continue;
    }
    // Pick the highest-priority member for label / position
    let best = members[0];
    let bestPriority = KIND_PRIORITY.indexOf(best.kind);
    const scanners = new Set<MarkerKind>();
    let hasRadio = false;
    for (const m of members) {
      scanners.add(m.kind);
      if (m.radioCapable) hasRadio = true;
      const p = KIND_PRIORITY.indexOf(m.kind);
      if (p > bestPriority) {
        bestPriority = p;
        best = m;
      }
    }
    merged.push({
      id: best.id,
      entityId: best.entityId,
      label: best.label,
      x: best.x,
      z: best.z,
      color: best.color,
      inRange: best.inRange,
      size: best.size,
      radiusWorld: best.radiusWorld,
      radioCapable: hasRadio || undefined,
      scanners,
      primaryKind: best.kind,
    });
  }

  return merged;
}

export function describeUnifiedMarker(marker: UnifiedMarker): string[] {
  const ship = shipPosRef.current;
  const dist = _tmpA.set(marker.x, 0, marker.z).distanceTo(_tmpB.set(ship.x, 0, ship.z));
  const distKm = `${Math.max(0, Math.round(dist))} km`;
  const scannerList = [...marker.scanners]
    .map((k) => SCANNER_LABELS[k] ?? k.toUpperCase())
    .join(' / ');
  const lines = [`Scanners: ${scannerList}`, `Distance: ${distKm}`];
  if (marker.radioCapable) lines.push('Click to hail');
  return lines;
}
