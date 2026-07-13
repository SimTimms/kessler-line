import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { PLANETS } from '../Planets/SolarSystem';
import { SOLAR_SYSTEM_SCALE, SUN_WORLD_RADIUS } from '../../config/solarConfig';
import { shipPosRef } from '../../context/ShipPos';
import { shipQuaternion } from '../../context/ShipState';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { getPlanetPosition } from '../../config/planetPosition';
import { navTargetPosRef, navTargetIdRef } from '../../context/NavTarget';
import { getDriveSignatures } from '../../context/DriveSignatureRegistry';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { getMagneticTargets } from '../../context/MagneticRegistry';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { getRadioBroadcasts } from '../../context/RadioBroadcastRegistry';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { getCollidables } from '../../context/CollisionRegistry';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { renderToSimulationSpace } from '../../context/FloatingOrigin';
import './SandboxHtmlMiniMap.css';

interface SandboxHtmlMiniMapProps {
  onClose: () => void;
  showSolarSystem?: boolean;
}

type MarkerKind = 'planet' | 'ship' | 'nav' | 'drive' | 'mag' | 'radio' | 'proximity' | 'hard';

type Marker = {
  id: string;
  label: string;
  x: number;
  z: number;
  kind: MarkerKind;
  color?: string;
  inRange?: boolean;
  size?: number;
  radiusWorld?: number;
};

type HoverCardState = {
  marker: Marker;
  x: number;
  y: number;
};

const MAX_MARKERS_PER_GROUP = 160;
const ZOOM_MIN_HALF_SPAN = 1_000;
const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _shipForward = new THREE.Vector3();

const MAX_PLANET_ORBIT_WORLD = Math.max(...PLANETS.map((p) => p.orbitRadius)) * SOLAR_SYSTEM_SCALE;
// Add outer-system margin so zoom/pan still covers Neptune and beyond (Pluto-like distances).
const OUTER_SYSTEM_COVERAGE_WORLD = MAX_PLANET_ORBIT_WORLD * 1.7;
const ZOOM_DEFAULT_HALF_SPAN = OUTER_SYSTEM_COVERAGE_WORLD;
const ZOOM_MAX_HALF_SPAN = OUTER_SYSTEM_COVERAGE_WORLD * 2.2;
const PAN_LIMIT = OUTER_SYSTEM_COVERAGE_WORLD * 3.0;
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function SandboxHtmlMiniMap({
  onClose,
  showSolarSystem = true,
}: SandboxHtmlMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragAnchorRef = useRef<{ x: number; y: number; panX: number; panZ: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomHalfSpan, setZoomHalfSpan] = useState(
    showSolarSystem ? ZOOM_DEFAULT_HALF_SPAN : 1500
  );
  const [panCenter, setPanCenter] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [followShip, setFollowShip] = useState(false);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [shipHeadingDeg, setShipHeadingDeg] = useState(0);
  const [statusLine, setStatusLine] = useState('');
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);

  useEffect(() => {
    const ship = shipPosRef.current;
    setPanCenter({ x: ship.x, z: ship.z });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyM') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const ship = shipPosRef.current;
      if (followShip) {
        setPanCenter({ x: ship.x, z: ship.z });
      }
      _shipForward.set(0, 0, 1).applyQuaternion(shipQuaternion);
      setShipHeadingDeg((Math.atan2(_shipForward.x, _shipForward.z) * 180) / Math.PI);

      const next: Marker[] = [];
      if (showSolarSystem) {
        next.push({
          id: 'sun',
          label: 'Sun',
          x: 0,
          z: 0,
          kind: 'planet',
          color: '#fdb813',
          radiusWorld: SUN_WORLD_RADIUS,
        });

        for (const planet of PLANETS) {
          const dynamicPos = solarPlanetPositions[planet.name];
          const fallbackPos = getPlanetPosition(planet.name, _tmpA);
          const worldX = dynamicPos ? dynamicPos.x * SOLAR_SYSTEM_SCALE : fallbackPos.x;
          const worldZ = dynamicPos ? dynamicPos.z * SOLAR_SYSTEM_SCALE : fallbackPos.z;
          next.push({
            id: `planet-${planet.name}`,
            label: planet.name,
            x: worldX,
            z: worldZ,
            kind: 'planet',
            color: planet.name === 'Earth' ? '#3399ff' : planet.color,
            radiusWorld: planet.radius * SOLAR_SYSTEM_SCALE,
          });
        }
      }

      next.push({
        id: 'ship',
        label: 'Your Ship',
        x: ship.x,
        z: ship.z,
        kind: 'ship',
      });

      next.push({
        id: 'nav-target',
        label: navTargetIdRef.current ? `Nav Target (${navTargetIdRef.current})` : 'Nav Target',
        x: navTargetPosRef.current.x,
        z: navTargetPosRef.current.z,
        kind: 'nav',
      });

      const driveOn = driveSignatureOnRef.current && driveSignatureRangeRef.current > 0;
      const magOn = magneticOnRef.current && magneticScanRangeRef.current > 0;
      const radioOn = radioOnRef.current && radioRangeRef.current > 0;
      const proximityOn = proximityScanOnRef.current && proximityScanRangeRef.current > 0;

      const driveEntries = getDriveSignatures().slice(0, MAX_MARKERS_PER_GROUP);
      for (const entry of driveEntries) {
        entry.getPosition(_tmpA);
        renderToSimulationSpace(_tmpA, _tmpA);
        const dist = _tmpA.distanceTo(ship);
        const inRange = dist <= driveSignatureRangeRef.current;
        if (!driveOn || !inRange) continue;
        next.push({
          id: `drive-${entry.id}`,
          label: entry.label,
          x: _tmpA.x,
          z: _tmpA.z,
          kind: 'drive',
          inRange,
        });
      }

      const magEntries = getMagneticTargets().slice(0, MAX_MARKERS_PER_GROUP);
      for (const entry of magEntries) {
        entry.getPosition(_tmpA);
        renderToSimulationSpace(_tmpA, _tmpA);
        const dist = _tmpA.distanceTo(ship);
        const inRange = dist <= magneticScanRangeRef.current;
        if (!magOn || !inRange) continue;
        next.push({
          id: `mag-${entry.id}`,
          label: entry.label,
          x: _tmpA.x,
          z: _tmpA.z,
          kind: 'mag',
          inRange,
        });
      }

      const radioEntries = getRadioBroadcasts().slice(0, MAX_MARKERS_PER_GROUP);
      for (const entry of radioEntries) {
        entry.getPosition(_tmpA);
        renderToSimulationSpace(_tmpA, _tmpA);
        const dist = _tmpA.distanceTo(ship);
        const inRange = dist <= radioRangeRef.current;
        if (!radioOn || !inRange) continue;
        next.push({
          id: `radio-${entry.id}`,
          label: entry.label,
          x: _tmpA.x,
          z: _tmpA.z,
          kind: 'radio',
          inRange: true,
        });
      }

      const collidables = getCollidables().slice(0, MAX_MARKERS_PER_GROUP);
      const hardOverlayIds = new Set<string>();
      for (const col of collidables) {
        const hardObject = col.physicalCollision !== false || col.planetSurfaceImpact === true;
        if (!hardObject) continue;
        col.getWorldPosition(_tmpA);
        renderToSimulationSpace(_tmpA, _tmpA);
        hardOverlayIds.add(col.id);
        next.push({
          id: `hard-${col.id}`,
          label: col.label ?? col.id,
          x: _tmpA.x,
          z: _tmpA.z,
          kind: 'hard',
        });
      }
      for (const col of collidables) {
        if (!proximityOn || !col.label || hardOverlayIds.has(col.id)) continue;
        col.getWorldPosition(_tmpA);
        renderToSimulationSpace(_tmpA, _tmpA);
        const dist = _tmpA.distanceTo(ship);
        if (dist > proximityScanRangeRef.current) continue;
        next.push({
          id: `prox-${col.id}`,
          label: col.label,
          x: _tmpA.x,
          z: _tmpA.z,
          kind: 'proximity',
          inRange: true,
        });
      }

      setMarkers(next);
      setStatusLine(
        showSolarSystem
          ? `ZOOM ${(zoomHalfSpan / 1_000_000).toFixed(1)}M · DRIVE ${driveEntries.length} · RADIO ${radioEntries.length}`
          : `ZOOM ${Math.round(zoomHalfSpan)} · DRIVE ${driveEntries.length} · RADIO ${radioEntries.length}`
      );
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [followShip, showSolarSystem, zoomHalfSpan]);

  const visibleMarkers = useMemo(() => {
    const node = containerRef.current;
    if (!node) return [];
    const rect = node.getBoundingClientRect();
    const scale = rect.height / (2 * zoomHalfSpan);
    return markers
      .map((m) => {
        const sx = (m.x - panCenter.x) * scale + rect.width / 2;
        const sy = (m.z - panCenter.z) * scale + rect.height / 2;
        const pxSize =
          m.radiusWorld !== undefined
            ? Math.max(1, m.radiusWorld * scale * 2)
            : (m.size ?? 6);
        return { ...m, sx, sy, pxSize };
      })
      .filter((m) => m.sx >= -80 && m.sx <= rect.width + 80 && m.sy >= -80 && m.sy <= rect.height + 80);
  }, [markers, panCenter, zoomHalfSpan]);

  const orbitRings = useMemo<
    Array<{ id: string; sx: number; sy: number; pxRadius: number; color: string }>
  >(() => {
    const node = containerRef.current;
    if (!node) return [];
    const rect = node.getBoundingClientRect();
    const scale = rect.height / (2 * zoomHalfSpan);
    const sunSx = (0 - panCenter.x) * scale + rect.width / 2;
    const sunSy = (0 - panCenter.z) * scale + rect.height / 2;
    if (!showSolarSystem) return [];
    return PLANETS.map((planet) => ({
      id: `orbit-${planet.name}`,
      sx: sunSx,
      sy: sunSy,
      pxRadius: planet.orbitRadius * SOLAR_SYSTEM_SCALE * scale,
      color: planet.name === 'Earth' ? '#3399ff' : planet.color,
    })).filter((ring) => ring.pxRadius > 1.5);
  }, [panCenter, showSolarSystem, zoomHalfSpan]);

  const scannerRings = useMemo<{
    shipSx: number;
    shipSy: number;
    rings: Array<{ id: string; pxRadius: number; color: string }>;
  } | null>(() => {
    const node = containerRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const scale = rect.height / (2 * zoomHalfSpan);
    const ship = shipPosRef.current;
    const shipSx = (ship.x - panCenter.x) * scale + rect.width / 2;
    const shipSy = (ship.z - panCenter.z) * scale + rect.height / 2;
    const rings: Array<{ id: string; pxRadius: number; color: string }> = [];
    if (magneticOnRef.current && magneticScanRangeRef.current > 0) {
      rings.push({ id: 'mag', pxRadius: magneticScanRangeRef.current * scale, color: '#ffd24d' });
    }
    if (driveSignatureOnRef.current && driveSignatureRangeRef.current > 0) {
      rings.push({ id: 'drive', pxRadius: driveSignatureRangeRef.current * scale, color: '#00d6ff' });
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
    return { shipSx, shipSy, rings };
  }, [panCenter, zoomHalfSpan, markers]);

  function markerClass(kind: MarkerKind): string {
    if (kind === 'ship') return 'sandbox-map-marker sandbox-map-marker--ship';
    if (kind === 'nav') return 'sandbox-map-marker sandbox-map-marker--nav';
    if (kind === 'planet') return 'sandbox-map-marker sandbox-map-marker--planet';
    if (kind === 'drive') return 'sandbox-map-marker sandbox-map-marker--drive';
    if (kind === 'mag') return 'sandbox-map-marker sandbox-map-marker--mag';
    if (kind === 'radio') return 'sandbox-map-marker sandbox-map-marker--radio';
    if (kind === 'hard') return 'sandbox-map-marker sandbox-map-marker--hard';
    return 'sandbox-map-marker sandbox-map-marker--proximity';
  }

  function describeMarker(marker: Marker): string[] {
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
    return ['Proximity Contact', `Distance: ${distKm}`];
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const prevScale = rect.height / (2 * zoomHalfSpan);
    const worldUnderCursorX = panCenter.x + (cursorX - rect.width / 2) / prevScale;
    const worldUnderCursorZ = panCenter.z + (cursorY - rect.height / 2) / prevScale;
    const factor = e.deltaY > 0 ? 1.15 : 0.86;
    const nextZoom = clamp(zoomHalfSpan * factor, ZOOM_MIN_HALF_SPAN, ZOOM_MAX_HALF_SPAN);
    const nextScale = rect.height / (2 * nextZoom);
    const nextPanX = worldUnderCursorX - (cursorX - rect.width / 2) / nextScale;
    const nextPanZ = worldUnderCursorZ - (cursorY - rect.height / 2) / nextScale;
    setZoomHalfSpan(nextZoom);
    setPanCenter({
      x: clamp(nextPanX, -PAN_LIMIT, PAN_LIMIT),
      z: clamp(nextPanZ, -PAN_LIMIT, PAN_LIMIT),
    });
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    draggingRef.current = true;
    setIsDragging(true);
    dragAnchorRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panCenter.x,
      panZ: panCenter.z,
    };
    setHoverCard(null);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!draggingRef.current || !containerRef.current || !dragAnchorRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const unitsPerPixel = (2 * zoomHalfSpan) / rect.height;
    const dx = e.clientX - dragAnchorRef.current.x;
    const dy = e.clientY - dragAnchorRef.current.y;
    setPanCenter({
      x: clamp(dragAnchorRef.current.panX - dx * unitsPerPixel, -PAN_LIMIT, PAN_LIMIT),
      z: clamp(dragAnchorRef.current.panZ - dy * unitsPerPixel, -PAN_LIMIT, PAN_LIMIT),
    });
  }

  function stopDrag() {
    draggingRef.current = false;
    dragAnchorRef.current = null;
    setIsDragging(false);
  }

  function toggleFollowShip() {
    setFollowShip((prev) => {
      const next = !prev;
      if (next) {
        const ship = shipPosRef.current;
        setPanCenter({ x: ship.x, z: ship.z });
      }
      return next;
    });
  }

  return (
    <div
      ref={containerRef}
      className={`sandbox-map-overlay${isDragging ? ' sandbox-map-overlay--dragging' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <div className="sandbox-map-grid" />
      {orbitRings.map((ring) => (
        <div
          key={ring.id}
          className="sandbox-map-orbit-ring"
          style={
            {
              left: `${ring.sx}px`,
              top: `${ring.sy}px`,
              width: `${ring.pxRadius * 2}px`,
              height: `${ring.pxRadius * 2}px`,
              borderColor: ring.color,
            } as CSSProperties
          }
        />
      ))}
      {scannerRings?.rings.map((ring) => (
          <div
            key={ring.id}
            className="sandbox-map-ring"
            style={
              {
                left: `${scannerRings.shipSx}px`,
                top: `${scannerRings.shipSy}px`,
                width: `${ring.pxRadius * 2}px`,
                height: `${ring.pxRadius * 2}px`,
                borderColor: ring.color,
              } as CSSProperties
            }
          />
        ))}
      {visibleMarkers.map((marker) => (
        <div
          key={marker.id}
          className={markerClass(marker.kind)}
          style={
            {
              left: `${marker.sx}px`,
              top: `${marker.sy}px`,
              '--marker-color': marker.color ?? undefined,
              '--marker-size': `${marker.pxSize}px`,
              opacity: marker.inRange === false ? 0.45 : 1,
              transform:
                marker.kind === 'ship'
                  ? `translate(-50%, -50%) rotate(${shipHeadingDeg}deg)`
                  : marker.kind === 'nav'
                    ? 'translate(-50%, -50%) rotate(45deg)'
                    : 'translate(-50%, -50%)',
            } as CSSProperties
          }
          title={marker.label}
          onMouseEnter={(e) =>
            setHoverCard({
              marker,
              x: e.clientX,
              y: e.clientY,
            })
          }
          onMouseMove={(e) =>
            setHoverCard((prev) =>
              prev
                ? {
                    ...prev,
                    x: e.clientX,
                    y: e.clientY,
                  }
                : prev
            )
          }
          onMouseLeave={() => setHoverCard(null)}
        />
      ))}

      <div className="sandbox-map-title">STAR CHART</div>
      <div className="sandbox-map-status">{statusLine}</div>
      <div className="sandbox-map-help">DRAG PAN · WHEEL ZOOM · [M] TOGGLE</div>
      {hoverCard && (
        <div
          className="sandbox-map-hover-card"
          style={{
            left: `${hoverCard.x + 14}px`,
            top: `${hoverCard.y - 8}px`,
          }}
        >
          <div className="sandbox-map-hover-title">{hoverCard.marker.label}</div>
          {describeMarker(hoverCard.marker).map((line) => (
            <div key={line} className="sandbox-map-hover-line">
              {line}
            </div>
          ))}
        </div>
      )}
      <div className="sandbox-map-actions">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={toggleFollowShip}
          className={followShip ? 'sandbox-map-action--active' : ''}
          title={followShip ? 'Auto-follow ship enabled' : 'Auto-follow ship disabled'}
        >
          CENTER {followShip ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
