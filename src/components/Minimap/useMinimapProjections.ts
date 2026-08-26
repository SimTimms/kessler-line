import { useMemo, type RefObject } from 'react';
import * as THREE from 'three';
import { PLANETS } from '../Planets/SolarSystemConfig';
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
import { shipPosRef } from '../../context/ShipPos';
import { shipQuaternion, shipVelocity } from '../../context/ShipState';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import {
  SHIP_DIRECTION_TARGET_COLOR,
  SHIP_DIRECTION_VELOCITY_COLOR,
} from '../../config/shipDirectionIndicatorConfig';
import {
  DOCKING_ASSIST_MARGIN,
  DOCKING_ASSIST_MAX_HALF_SPAN,
  DOCKING_ASSIST_MIN_HALF_SPAN,
  DOCKING_SPEED_GAUGE_MAX_MPS,
  ORBIT_ASSIST_FRAME,
  chartScale,
  clamp,
  formatOrbitDistance,
  isUnifiedMarker,
  projectToChart,
} from './minimapHelpers';
import type {
  ChartNavLine,
  ChartVelocityPath,
  DockingAssistData,
  DockingAssistProjection,
  DockingReadouts,
  Marker,
  OrbitAssistData,
  OrbitAssistProjection,
  OrbitAssistReadouts,
  OrbitRing,
  PanCenter,
  ScannerRings,
  UnifiedMarker,
  VectorWorld,
  VisibleMarker,
  VisibleUnifiedMarker,
} from './minimapTypes';

const _orbitShipForward = new THREE.Vector3();

/** Projects world-space telemetry into chart pixels and formats the assist readouts. */
export function useMinimapProjections({
  containerRef,
  fullscreen,
  showSolarSystem,
  zoomHalfSpan,
  panCenter,
  markers,
  vectorWorld,
  dockingAssist,
  orbitAssist,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  fullscreen: boolean;
  showSolarSystem: boolean;
  zoomHalfSpan: number;
  panCenter: PanCenter;
  markers: (Marker | UnifiedMarker)[];
  vectorWorld: VectorWorld;
  dockingAssist: DockingAssistData | null;
  orbitAssist: OrbitAssistData | null;
}) {
  const dockingAssistProjection = useMemo<DockingAssistProjection | null>(() => {
    const node = containerRef.current;
    if (!node || !dockingAssist) return null;
    const rect = node.getBoundingClientRect();
    if (dockingAssist.captureMode === 'nose') {
      const halfSpan = clamp(
        Math.max(Math.abs(dockingAssist.portRelX), Math.abs(dockingAssist.portRelForward)) +
          DOCKING_ASSIST_MARGIN,
        DOCKING_ASSIST_MIN_HALF_SPAN,
        DOCKING_ASSIST_MAX_HALF_SPAN
      );
      const scale = chartScale(rect, halfSpan);
      const shipSx = rect.width / 2;
      const shipSy = rect.height / 2;
      return {
        shipSx,
        shipSy,
        dockSx: shipSx + dockingAssist.portRelX * scale,
        dockSy: shipSy - dockingAssist.portRelForward * scale,
      };
    }
    const halfSpan = clamp(
      Math.max(Math.abs(dockingAssist.lateralX), Math.abs(dockingAssist.lateralZ)) +
        DOCKING_ASSIST_MARGIN,
      DOCKING_ASSIST_MIN_HALF_SPAN,
      DOCKING_ASSIST_MAX_HALF_SPAN
    );
    const scale = chartScale(rect, halfSpan);
    const dockCenter: PanCenter = { x: dockingAssist.dockX, z: dockingAssist.dockZ };
    const shipPanel = projectToChart(
      dockingAssist.shipX,
      dockingAssist.shipZ,
      rect,
      dockCenter,
      scale
    );
    const dockPanel = projectToChart(
      dockingAssist.dockX,
      dockingAssist.dockZ,
      rect,
      dockCenter,
      scale
    );
    return {
      shipSx: shipPanel.sx,
      shipSy: shipPanel.sy,
      dockSx: dockPanel.sx,
      dockSy: dockPanel.sy,
    };
  }, [containerRef, dockingAssist]);

  const dockingReadouts = useMemo<DockingReadouts | null>(() => {
    if (!dockingAssist) return null;
    const speedClamped = clamp(dockingAssist.relSpeedMps, 0, DOCKING_SPEED_GAUGE_MAX_MPS);
    const speedIndicatorPct = 100 - (speedClamped / DOCKING_SPEED_GAUGE_MAX_MPS) * 100;
    const speedSafeTopPct =
      100 -
      (clamp(dockingAssist.idealSpeedMps, 0, DOCKING_SPEED_GAUGE_MAX_MPS) /
        DOCKING_SPEED_GAUGE_MAX_MPS) *
        100;
    const centerPenalty = dockingAssist.distanceToCenter * 2.3;
    const headingPenalty = Math.abs(dockingAssist.headingErrorDeg) * 1.7;
    const alignPct = clamp(100 - centerPenalty - headingPenalty, 0, 100);
    return {
      speedIndicatorPct,
      speedSafeTopPct,
      alignPct,
      relSpeedText: dockingAssist.relSpeedMps.toFixed(1),
      idealSpeedText: dockingAssist.idealSpeedMps.toFixed(1),
      xText: dockingAssist.lateralX.toFixed(1),
      zText: dockingAssist.lateralZ.toFixed(1),
      rangeText: dockingAssist.distanceToCenter.toFixed(1),
    };
  }, [dockingAssist]);

  const orbitAssistProjection = useMemo<OrbitAssistProjection | null>(() => {
    const node = containerRef.current;
    if (!node || !orbitAssist) return null;
    const rect = node.getBoundingClientRect();
    let extent = Math.max(
      orbitAssist.idealOrbitRadius,
      Math.hypot(orbitAssist.shipX - orbitAssist.bodyX, orbitAssist.shipZ - orbitAssist.bodyZ),
      orbitAssist.surfaceRadius * 1.15
    );
    for (const p of orbitAssist.predictedPath) {
      extent = Math.max(extent, Math.hypot(p.x - orbitAssist.bodyX, p.z - orbitAssist.bodyZ));
    }
    // Keep framing inside SOI so the ideal ring stays readable.
    extent = Math.min(extent, orbitAssist.soiRadius * 0.98);
    const halfSpan = Math.max(extent * ORBIT_ASSIST_FRAME, orbitAssist.surfaceRadius * 1.2);
    const scale = chartScale(rect, halfSpan);
    const bodyCenter: PanCenter = { x: orbitAssist.bodyX, z: orbitAssist.bodyZ };
    const toPanel = (worldX: number, worldZ: number) =>
      projectToChart(worldX, worldZ, rect, bodyCenter, scale);
    const bodySx = rect.width / 2;
    const bodySy = rect.height / 2;
    const shipPanel = toPanel(orbitAssist.shipX, orbitAssist.shipZ);
    const shipSx = shipPanel.sx;
    const shipSy = shipPanel.sy;
    const projectedPath = orbitAssist.predictedPath.map((p) => toPanel(p.x, p.z));
    const predictedPoints = projectedPath.map((p) => `${p.sx},${p.sy}`).join(' ');
    const shipRingPx = clamp(Math.min(rect.width, rect.height) * 0.09, 10, 18);
    let progradeTipSx = shipSx;
    let progradeTipSy = shipSy + shipRingPx;
    let shipFacingDeg = orbitAssist.shipHeadingDeg;
    // Ship nose is local -Z; project it into ORB screen-space so icon basis matches real ship attitude.
    _orbitShipForward.set(0, 0, -1).applyQuaternion(shipQuaternion);
    const shipFwdDx = _orbitShipForward.x;
    const shipFwdDy = _orbitShipForward.z;
    if (Math.hypot(shipFwdDx, shipFwdDy) > 1e-4) {
      shipFacingDeg = (Math.atan2(shipFwdDy, shipFwdDx) * 180) / Math.PI + 90;
    }
    // Drive ORB ship-facing from live velocity first; worker trajectory points can be stale by a frame.
    const velDx = shipVelocity.x * scale;
    const velDy = shipVelocity.z * scale;
    const velLen = Math.hypot(velDx, velDy);
    if (velLen > 1e-4) {
      progradeTipSx = shipSx + (velDx / velLen) * shipRingPx;
      progradeTipSy = shipSy + (velDy / velLen) * shipRingPx;
    } else if (projectedPath.length >= 2) {
      const a = projectedPath[0];
      const b = projectedPath[1];
      const dx = b.sx - a.sx;
      const dy = b.sy - a.sy;
      const segLen = Math.hypot(dx, dy);
      if (segLen > 0.01) {
        progradeTipSx = shipSx + (dx / segLen) * shipRingPx;
        progradeTipSy = shipSy + (dy / segLen) * shipRingPx;
      }
    }
    let targetSx: number | null = null;
    let targetSy: number | null = null;
    if (orbitAssist.targetX != null && orbitAssist.targetZ != null) {
      const targetPanel = toPanel(orbitAssist.targetX, orbitAssist.targetZ);
      targetSx = targetPanel.sx;
      targetSy = targetPanel.sy;
    }
    return {
      bodySx,
      bodySy,
      shipSx,
      shipSy,
      surfacePx: orbitAssist.surfaceRadius * scale,
      idealPx: orbitAssist.idealOrbitRadius * scale,
      predictedPoints,
      targetSx,
      targetSy,
      reqTipSx: shipSx + orbitAssist.requiredDirX * shipRingPx,
      reqTipSy: shipSy + orbitAssist.requiredDirZ * shipRingPx,
      progradeTipSx,
      progradeTipSy,
      shipFacingDeg,
      shipRingPx,
    };
  }, [containerRef, orbitAssist]);

  const orbitAssistReadouts = useMemo<OrbitAssistReadouts | null>(() => {
    if (!orbitAssist) return null;
    const dv = orbitAssist.requiredSpeedMps - orbitAssist.tangSpeedMps;
    const dvSign = dv >= 0 ? '+' : '';
    return {
      altText: formatOrbitDistance(orbitAssist.altitude),
      periText: formatOrbitDistance(orbitAssist.periAlt),
      apoText: formatOrbitDistance(orbitAssist.apoAlt),
      speedText: orbitAssist.tangSpeedMps.toFixed(0),
      circText: orbitAssist.circSpeedMps.toFixed(0),
      reqText: orbitAssist.requiredSpeedMps.toFixed(0),
      dvText: `${dvSign}${dv.toFixed(0)}`,
      statusText: orbitAssist.isOrbiting ? 'ORBITING' : 'ACHIEVE ORBIT',
    };
  }, [orbitAssist]);

  const visibleMarkers = useMemo<(VisibleMarker | VisibleUnifiedMarker)[]>(() => {
    const node = containerRef.current;
    if (!node) return [];
    const rect = node.getBoundingClientRect();
    const scale = chartScale(rect, zoomHalfSpan);
    return markers
      .map((m) => {
        const { sx, sy } = projectToChart(m.x, m.z, rect, panCenter, scale);
        const pxSize =
          m.radiusWorld !== undefined ? Math.max(1, m.radiusWorld * scale * 2) : (m.size ?? 6);
        if (isUnifiedMarker(m)) {
          return { ...m, sx, sy, pxSize } as VisibleUnifiedMarker;
        }
        return { ...m, sx, sy, pxSize } as VisibleMarker;
      })
      .filter(
        (m) => m.sx >= -80 && m.sx <= rect.width + 80 && m.sy >= -80 && m.sy <= rect.height + 80
      );
  }, [containerRef, markers, panCenter, zoomHalfSpan, fullscreen]);

  const chartNavLine = useMemo<ChartNavLine | null>(() => {
    if (!vectorWorld.nav) return null;
    const node = containerRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const scale = chartScale(rect, zoomHalfSpan);
    const shipPanel = projectToChart(vectorWorld.shipX, vectorWorld.shipZ, rect, panCenter, scale);
    const navPanel = projectToChart(vectorWorld.nav.x, vectorWorld.nav.z, rect, panCenter, scale);
    return {
      x1: shipPanel.sx,
      y1: shipPanel.sy,
      x2: navPanel.sx,
      y2: navPanel.sy,
      color: SHIP_DIRECTION_TARGET_COLOR,
    };
  }, [containerRef, vectorWorld, panCenter, zoomHalfSpan, fullscreen]);

  const chartVelocityPath = useMemo<ChartVelocityPath | null>(() => {
    if (vectorWorld.velocityPath.length < 2) return null;
    const node = containerRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const scale = chartScale(rect, zoomHalfSpan);
    const points = vectorWorld.velocityPath
      .map((p) => {
        const { sx, sy } = projectToChart(p.x, p.z, rect, panCenter, scale);
        return `${sx},${sy}`;
      })
      .join(' ');
    return { points, color: SHIP_DIRECTION_VELOCITY_COLOR };
  }, [containerRef, vectorWorld, panCenter, zoomHalfSpan, fullscreen]);

  const orbitRings = useMemo<OrbitRing[]>(() => {
    const node = containerRef.current;
    if (!node) return [];
    if (!showSolarSystem) return [];
    const rect = node.getBoundingClientRect();
    const scale = chartScale(rect, zoomHalfSpan);
    const sun = projectToChart(0, 0, rect, panCenter, scale);
    return PLANETS.map((planet) => ({
      id: `orbit-${planet.name}`,
      sx: sun.sx,
      sy: sun.sy,
      pxRadius: planet.orbitRadius * SOLAR_SYSTEM_SCALE * scale,
      color: planet.name === 'Earth' ? '#3399ff' : planet.color,
    })).filter((ring) => ring.pxRadius > 1.5);
  }, [containerRef, panCenter, showSolarSystem, zoomHalfSpan, fullscreen]);

  const scannerRings = useMemo<ScannerRings | null>(() => {
    const node = containerRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const scale = chartScale(rect, zoomHalfSpan);
    const ship = shipPosRef.current;
    const shipPanel = projectToChart(ship.x, ship.z, rect, panCenter, scale);
    const rings: ScannerRings['rings'] = [];
    if (magneticOnRef.current && magneticScanRangeRef.current > 0) {
      rings.push({ id: 'mag', pxRadius: magneticScanRangeRef.current * scale, color: '#ffd24d' });
    }
    if (driveSignatureOnRef.current && driveSignatureRangeRef.current > 0) {
      rings.push({
        id: 'drive',
        pxRadius: driveSignatureRangeRef.current * scale,
        color: '#00d6ff',
      });
    }
    if (radioOnRef.current && radioRangeRef.current > 0) {
      rings.push({ id: 'radio', pxRadius: radioRangeRef.current * scale, color: '#45ff88' });
    }
    if (proximityScanOnRef.current && proximityScanRangeRef.current > 0) {
      rings.push({
        id: 'proximity',
        pxRadius: proximityScanRangeRef.current * scale,
        color: '#d885ff',
      });
    }
    return { shipSx: shipPanel.sx, shipSy: shipPanel.sy, rings };
  }, [containerRef, panCenter, zoomHalfSpan, markers, fullscreen]);

  return {
    dockingAssistProjection,
    dockingReadouts,
    orbitAssistProjection,
    orbitAssistReadouts,
    visibleMarkers,
    chartNavLine,
    chartVelocityPath,
    orbitRings,
    scannerRings,
  };
}
