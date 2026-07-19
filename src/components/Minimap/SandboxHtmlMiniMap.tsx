import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { PLANETS } from '../Planets/SolarSystem';
import { SOLAR_SYSTEM_SCALE, SUN_WORLD_RADIUS } from '../../config/solarConfig';
import { shipPosRef } from '../../context/ShipPos';
import { shipQuaternion, shipVelocity } from '../../context/ShipState';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { getPlanetPosition } from '../../config/planetPosition';
import { hasNavTarget, navTargetPosRef, navTargetIdRef } from '../../context/NavTarget';
import { getDriveSignatures } from '../../context/DriveSignatureRegistry';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../context/DriveSignatureScan';
import { getMagneticTargets } from '../../context/MagneticRegistry';
import { magneticOnRef, magneticScanRangeRef } from '../../context/MagneticScan';
import { getRadioBroadcasts } from '../../context/RadioBroadcastRegistry';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { getCollidables } from '../../context/CollisionRegistry';
import { proximityScanOnRef, proximityScanRangeRef } from '../../context/ProximityScan';
import { renderToSimulationSpace } from '../../context/FloatingOrigin';
import { beginPadScan } from '../../context/PadScanState';
import {
  selectedTargetName,
  selectedTargetPosition,
} from '../../context/TargetSelection';
import {
  MINIMAP_TRAJECTORY_DT,
  MINIMAP_TRAJECTORY_STEPS,
  SHIP_DIRECTION_MIN_SPEED,
  SHIP_DIRECTION_TARGET_COLOR,
  SHIP_DIRECTION_VELOCITY_COLOR,
} from '../../config/shipDirectionIndicatorConfig';
import { sampleShipTrajectoryXZ } from '../../utils/sampleShipTrajectoryXZ';
import { minimapOverlayActiveRef } from '../../context/MinimapUi';
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

type DockingAssistData = {
  dockId: string;
  dockLabel: string;
  stationId: string | null;
  shipX: number;
  shipZ: number;
  dockX: number;
  dockZ: number;
  distanceToCenter: number;
  lateralX: number;
  lateralZ: number;
  relSpeedMps: number;
  idealSpeedMps: number;
  headingErrorDeg: number;
  shipHeadingDeg: number;
};

type DockingReadouts = {
  speedIndicatorPct: number;
  speedSafeTopPct: number;
  alignPct: number;
  relSpeedText: string;
  idealSpeedText: string;
  xText: string;
  zText: string;
  rangeText: string;
};

type VisibleMarker = Marker & { sx: number; sy: number; pxSize: number };
type OrbitRing = { id: string; sx: number; sy: number; pxRadius: number; color: string };
type ScannerRings = {
  shipSx: number;
  shipSy: number;
  rings: Array<{ id: string; pxRadius: number; color: string }>;
};
type ChartNavLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};

type ChartVelocityPath = {
  points: string;
  color: string;
};

function StarChartPanel({
  orbitRings,
  scannerRings,
  chartNavLine,
  chartVelocityPath,
  visibleMarkers,
  shipHeadingDeg,
  markerClass,
  setHoverCard,
  hoverCard,
  describeMarker,
}: {
  orbitRings: OrbitRing[];
  scannerRings: ScannerRings | null;
  chartNavLine: ChartNavLine | null;
  chartVelocityPath: ChartVelocityPath | null;
  visibleMarkers: VisibleMarker[];
  shipHeadingDeg: number;
  markerClass: (kind: MarkerKind) => string;
  setHoverCard: React.Dispatch<React.SetStateAction<HoverCardState | null>>;
  hoverCard: HoverCardState | null;
  describeMarker: (marker: Marker) => string[];
}) {
  return (
    <>
      {(chartNavLine || chartVelocityPath) && (
        <svg className="sandbox-map-vectors" aria-hidden>
          {chartVelocityPath && (
            <polyline
              className="sandbox-map-vector sandbox-map-vector--velocity"
              points={chartVelocityPath.points}
              stroke={chartVelocityPath.color}
            />
          )}
          {chartNavLine && (
            <line
              className="sandbox-map-vector sandbox-map-vector--nav"
              x1={chartNavLine.x1}
              y1={chartNavLine.y1}
              x2={chartNavLine.x2}
              y2={chartNavLine.y2}
              stroke={chartNavLine.color}
            />
          )}
        </svg>
      )}
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
                  ? shipIconCssTransform(shipHeadingDeg)
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
    </>
  );
}

function DockingAssistPanel({
  dockingAssist,
  dockingAssistProjection,
  dockingReadouts,
  dockingCaptureActive,
}: {
  dockingAssist: DockingAssistData;
  dockingAssistProjection: {
    shipSx: number;
    shipSy: number;
    dockSx: number;
    dockSy: number;
  } | null;
  dockingReadouts: DockingReadouts | null;
  dockingCaptureActive: boolean;
}) {
  return (
    <>
      <div className="sandbox-map-docking-rings" />
      <div
        className="sandbox-map-docking-scale sandbox-map-docking-scale--left sandbox-map-docking-scale--speed"
        style={
          {
            '--speed-indicator-y': `${dockingReadouts?.speedIndicatorPct ?? 100}%`,
            '--speed-safe-top': `${dockingReadouts?.speedSafeTopPct ?? 100}%`,
          } as CSSProperties
        }
      >
        <div className="sandbox-map-docking-speed-indicator" />
        <div className="sandbox-map-docking-speed-label sandbox-map-docking-speed-label--top">
          50
        </div>
        <div className="sandbox-map-docking-speed-label sandbox-map-docking-speed-label--bot">
          0
        </div>
      </div>
      {dockingAssistProjection && (
        <>
          <div
            className="sandbox-map-marker sandbox-map-marker--ship"
            style={
              {
                left: `${dockingAssistProjection.shipSx}px`,
                top: `${dockingAssistProjection.shipSy}px`,
                transform: shipIconCssTransform(dockingAssist.shipHeadingDeg),
              } as CSSProperties
            }
            title="Your Ship"
          />
        </>
      )}
      {dockingReadouts && (
        <>
          <div className="sandbox-map-docking-mps">MPS {dockingReadouts.relSpeedText}</div>
          <div className="sandbox-map-docking-ideal">
            IDEAL {dockingReadouts.idealSpeedText} MPS
          </div>
        </>
      )}
      {dockingCaptureActive && <div className="sandbox-map-docking-wait">DOCKING, PLEASE WAIT</div>}
    </>
  );
}

const MAX_MARKERS_PER_GROUP = 160;
const ZOOM_MIN_HALF_SPAN = 1_000;
const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _shipForward = new THREE.Vector3();
const _dockForward = new THREE.Vector3();
const _dockWorldPos = new THREE.Vector3();
const _dockVel = new THREE.Vector3();
const _dockQuat = new THREE.Quaternion();
const _identityQuat = new THREE.Quaternion();

const MAX_PLANET_ORBIT_WORLD = Math.max(...PLANETS.map((p) => p.orbitRadius)) * SOLAR_SYSTEM_SCALE;
// Add outer-system margin so zoom/pan still covers Neptune and beyond (Pluto-like distances).
const OUTER_SYSTEM_COVERAGE_WORLD = MAX_PLANET_ORBIT_WORLD * 1.7;
const ZOOM_DEFAULT_HALF_SPAN = OUTER_SYSTEM_COVERAGE_WORLD;
const ZOOM_MAX_HALF_SPAN = OUTER_SYSTEM_COVERAGE_WORLD * 2.2;
const PAN_LIMIT = OUTER_SYSTEM_COVERAGE_WORLD * 3.0;
const DOCKING_ASSIST_RANGE = 220;
const DOCKING_ASSIST_MIN_HALF_SPAN = 22;
const DOCKING_ASSIST_MAX_HALF_SPAN = 260;
const DOCKING_ASSIST_MARGIN = 26;
const DOCKING_SPEED_GAUGE_MAX_MPS = 14;
const EVENT_DOCKING_CAPTURE_STARTED = 'DockingCaptureStarted';
const EVENT_DOCKING_CAPTURE_ENDED = 'DockingCaptureEnded';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** CSS transform for ship-nav-icon.png (default points up) from world heading (atan2 x,z, 0=+Z). */
function shipIconCssTransform(headingDeg: number): string {
  return `translate(-50%, -50%) rotate(${180 - headingDeg}deg) scaleY(-1)`;
}

function signedAngleDegXZ(from: THREE.Vector3, to: THREE.Vector3): number {
  const a = _tmpA.set(from.x, 0, from.z).normalize();
  const b = _tmpB.set(to.x, 0, to.z).normalize();
  if (a.lengthSq() <= 1e-6 || b.lengthSq() <= 1e-6) return 0;
  const dot = clamp(a.dot(b), -1, 1);
  const crossY = a.x * b.z - a.z * b.x;
  return (Math.atan2(crossY, dot) * 180) / Math.PI;
}

export default function SandboxHtmlMiniMap({
  onClose,
  showSolarSystem = true,
}: SandboxHtmlMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenRootRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragAnchorRef = useRef<{ x: number; y: number; panX: number; panZ: number } | null>(null);
  const panCenterRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomHalfSpan, setZoomHalfSpan] = useState(showSolarSystem ? ZOOM_DEFAULT_HALF_SPAN : 1500);
  const [panCenter, setPanCenter] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  panCenterRef.current = panCenter;
  const [followShip, setFollowShip] = useState(false);
  const [markers, setMarkers] = useState<Marker[]>([]);
  /** World-space nav endpoint + predicted velocity/trajectory path (projected each render). */
  const [vectorWorld, setVectorWorld] = useState<{
    nav: { x: number; z: number } | null;
    velocityPath: Array<{ x: number; z: number }>;
    shipX: number;
    shipZ: number;
  }>({ nav: null, velocityPath: [], shipX: 0, shipZ: 0 });
  const [shipHeadingDeg, setShipHeadingDeg] = useState(0);
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);
  const [dockingAssist, setDockingAssist] = useState<DockingAssistData | null>(null);
  const [dockingCaptureActive, setDockingCaptureActive] = useState(false);
  const nearestDockDistance = useRef(Number.POSITIVE_INFINITY);
  /** Fires pad scan once when docking assist first engages (or switches pads). */
  const lastPadScanDockIdRef = useRef<string | null>(null);

  const activeChartRef = fullscreen ? fullscreenContainerRef : containerRef;

  useEffect(() => {
    const ship = shipPosRef.current;
    setPanCenter({ x: ship.x, z: ship.z });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (fullscreen) {
          setFullscreen(false);
          return;
        }
        onClose();
        return;
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        if (fullscreen) setFullscreen(false);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, fullscreen]);

  useEffect(() => {
    const onCaptureStarted = () => setDockingCaptureActive(true);
    const onCaptureEnded = () => setDockingCaptureActive(false);
    const onShipUndocked = () => setDockingCaptureActive(false);
    window.addEventListener(EVENT_DOCKING_CAPTURE_STARTED, onCaptureStarted);
    window.addEventListener(EVENT_DOCKING_CAPTURE_ENDED, onCaptureEnded);
    window.addEventListener('ShipUndocked', onShipUndocked);
    return () => {
      window.removeEventListener(EVENT_DOCKING_CAPTURE_STARTED, onCaptureStarted);
      window.removeEventListener(EVENT_DOCKING_CAPTURE_ENDED, onCaptureEnded);
      window.removeEventListener('ShipUndocked', onShipUndocked);
    };
  }, []);

  // Dock assist takes over the corner chart — exit fullscreen so we don't leave it dimmed/empty.
  useEffect(() => {
    if (dockingAssist && fullscreen) {
      setFullscreen(false);
    }
  }, [dockingAssist, fullscreen]);

  // Hide scene Html labels (speed / target name) while the map overlay covers them.
  useEffect(() => {
    minimapOverlayActiveRef.current = fullscreen || Boolean(dockingAssist);
    return () => {
      minimapOverlayActiveRef.current = false;
    };
  }, [fullscreen, dockingAssist]);

  // While fullscreen, disable page overscroll / swipe-back at the document level.
  useEffect(() => {
    if (!fullscreen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overscrollBehavior;
    const prevBody = body.style.overscrollBehavior;
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overscrollBehavior = prevHtml;
      body.style.overscrollBehavior = prevBody;
    };
  }, [fullscreen]);

  // React's onWheel is passive in many browsers — attach a non-passive listener so
  // preventDefault actually blocks trackpad navigation gestures (back/forward, new tab).
  useEffect(() => {
    if (!fullscreen) return;
    const root = fullscreenRootRef.current;
    const chart = fullscreenContainerRef.current;
    if (!root || !chart) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = chart.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      setZoomHalfSpan((prevZoom) => {
        const prevScale = rect.height / (2 * prevZoom);
        const worldUnderCursorX = panCenterRef.current.x + (cursorX - rect.width / 2) / prevScale;
        const worldUnderCursorZ = panCenterRef.current.z + (cursorY - rect.height / 2) / prevScale;
        const factor = e.deltaY > 0 ? 1.15 : 0.86;
        const nextZoom = clamp(prevZoom * factor, ZOOM_MIN_HALF_SPAN, ZOOM_MAX_HALF_SPAN);
        const nextScale = rect.height / (2 * nextZoom);
        const nextPanX = worldUnderCursorX - (cursorX - rect.width / 2) / nextScale;
        const nextPanZ = worldUnderCursorZ - (cursorY - rect.height / 2) / nextScale;
        setPanCenter({
          x: clamp(nextPanX, -PAN_LIMIT, PAN_LIMIT),
          z: clamp(nextPanZ, -PAN_LIMIT, PAN_LIMIT),
        });
        return nextZoom;
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('touchmove', onTouchMove);
    };
  }, [fullscreen]);

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

      if (hasNavTarget()) {
        next.push({
          id: 'nav-target',
          label: `Nav Target (${navTargetIdRef.current})`,
          x: navTargetPosRef.current.x,
          z: navTargetPosRef.current.z,
          kind: 'nav',
        });
      }

      let navLineTarget: { x: number; z: number } | null = null;
      if (selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01) {
        navLineTarget = { x: selectedTargetPosition.x, z: selectedTargetPosition.z };
      } else if (hasNavTarget()) {
        navLineTarget = { x: navTargetPosRef.current.x, z: navTargetPosRef.current.z };
      }

      const velLen = Math.hypot(shipVelocity.x, shipVelocity.z);
      const velocityPath =
        velLen > SHIP_DIRECTION_MIN_SPEED
          ? sampleShipTrajectoryXZ(
              ship.x,
              ship.z,
              shipVelocity.x,
              shipVelocity.z,
              MINIMAP_TRAJECTORY_STEPS,
              MINIMAP_TRAJECTORY_DT
            )
          : [];
      setVectorWorld({
        nav: navLineTarget,
        velocityPath,
        shipX: ship.x,
        shipZ: ship.z,
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
      let nearestDock: {
        id: string;
        label: string;
        stationId: string | null;
        x: number;
        z: number;
        relSpeedMps: number;
        idealSpeedMps: number;
        headingErrorDeg: number;
      } | null = null;
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
        if (!col.id.startsWith('docking-bay-')) continue;
        col.getWorldPosition(_dockWorldPos);
        renderToSimulationSpace(_dockWorldPos, _dockWorldPos);
        const dx = _dockWorldPos.x - ship.x;
        const dz = _dockWorldPos.z - ship.z;
        const planarDist = Math.hypot(dx, dz);
        if (planarDist > DOCKING_ASSIST_RANGE) continue;
        const dockWorldVel = col.getWorldVelocity
          ? col.getWorldVelocity(_dockVel)
          : _dockVel.set(0, 0, 0);
        const relSpeed = _tmpA.copy(shipVelocity).sub(dockWorldVel).length();
        const dockQuat = col.getWorldQuaternion ? col.getWorldQuaternion(_dockQuat) : _identityQuat;
        _shipForward.set(0, 0, 1).applyQuaternion(shipQuaternion);
        _dockForward.set(0, 0, 1).applyQuaternion(dockQuat);
        const headingErrorDeg = signedAngleDegXZ(_shipForward, _dockForward);
        const idealSpeedMps = Math.max(0.35, (col.dockingProfile?.maxRelativeSpeed ?? 2) * 0.55);
        if (!nearestDock || planarDist < nearestDockDistance.current) {
          nearestDock = {
            id: col.id,
            label: col.label ?? col.stationId ?? col.id,
            stationId: col.stationId ?? null,
            x: _dockWorldPos.x,
            z: _dockWorldPos.z,
            relSpeedMps: relSpeed,
            idealSpeedMps,
            headingErrorDeg,
          };
          nearestDockDistance.current = planarDist;
        }
      }
      if (!nearestDock) {
        nearestDockDistance.current = Number.POSITIVE_INFINITY;
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
      if (nearestDock) {
        const lateralX = nearestDock.x - ship.x;
        const lateralZ = nearestDock.z - ship.z;
        const distanceToCenter = Math.hypot(lateralX, lateralZ);
        if (lastPadScanDockIdRef.current !== nearestDock.id) {
          lastPadScanDockIdRef.current = nearestDock.id;
          beginPadScan(nearestDock.id);
        }
        setDockingAssist({
          dockId: nearestDock.id,
          dockLabel: nearestDock.label,
          stationId: nearestDock.stationId,
          shipX: ship.x,
          shipZ: ship.z,
          dockX: nearestDock.x,
          dockZ: nearestDock.z,
          distanceToCenter,
          lateralX,
          lateralZ,
          relSpeedMps: nearestDock.relSpeedMps,
          idealSpeedMps: nearestDock.idealSpeedMps,
          headingErrorDeg: nearestDock.headingErrorDeg,
          shipHeadingDeg: (Math.atan2(_shipForward.x, _shipForward.z) * 180) / Math.PI,
        });
      } else {
        lastPadScanDockIdRef.current = null;
        setDockingAssist(null);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [followShip, showSolarSystem, zoomHalfSpan]);

  const dockingAssistProjection = useMemo(() => {
    const node = containerRef.current;
    if (!node || !dockingAssist) return null;
    // Dock assist always uses the corner CRT, never the fullscreen chart.
    const rect = node.getBoundingClientRect();
    const halfSpan = clamp(
      Math.max(Math.abs(dockingAssist.lateralX), Math.abs(dockingAssist.lateralZ)) +
        DOCKING_ASSIST_MARGIN,
      DOCKING_ASSIST_MIN_HALF_SPAN,
      DOCKING_ASSIST_MAX_HALF_SPAN
    );
    const scale = rect.height / (2 * halfSpan);
    const centerX = dockingAssist.dockX;
    const centerZ = dockingAssist.dockZ;
    const shipSx = (dockingAssist.shipX - centerX) * scale + rect.width / 2;
    const shipSy = (dockingAssist.shipZ - centerZ) * scale + rect.height / 2;
    const dockSx = (dockingAssist.dockX - centerX) * scale + rect.width / 2;
    const dockSy = (dockingAssist.dockZ - centerZ) * scale + rect.height / 2;
    return { shipSx, shipSy, dockSx, dockSy };
  }, [dockingAssist]);

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

  const visibleMarkers = useMemo(() => {
    const node = activeChartRef.current;
    if (!node) return [];
    const rect = node.getBoundingClientRect();
    const scale = rect.height / (2 * zoomHalfSpan);
    return markers
      .map((m) => {
        const sx = (m.x - panCenter.x) * scale + rect.width / 2;
        const sy = (m.z - panCenter.z) * scale + rect.height / 2;
        const pxSize =
          m.radiusWorld !== undefined ? Math.max(1, m.radiusWorld * scale * 2) : (m.size ?? 6);
        return { ...m, sx, sy, pxSize };
      })
      .filter(
        (m) => m.sx >= -80 && m.sx <= rect.width + 80 && m.sy >= -80 && m.sy <= rect.height + 80
      );
  }, [activeChartRef, markers, panCenter, zoomHalfSpan, fullscreen]);

  const chartNavLine = useMemo<ChartNavLine | null>(() => {
    if (!vectorWorld.nav) return null;
    const node = activeChartRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const scale = rect.height / (2 * zoomHalfSpan);
    const shipSx = (vectorWorld.shipX - panCenter.x) * scale + rect.width / 2;
    const shipSy = (vectorWorld.shipZ - panCenter.z) * scale + rect.height / 2;
    return {
      x1: shipSx,
      y1: shipSy,
      x2: (vectorWorld.nav.x - panCenter.x) * scale + rect.width / 2,
      y2: (vectorWorld.nav.z - panCenter.z) * scale + rect.height / 2,
      color: SHIP_DIRECTION_TARGET_COLOR,
    };
  }, [activeChartRef, vectorWorld, panCenter, zoomHalfSpan, fullscreen]);

  const chartVelocityPath = useMemo<ChartVelocityPath | null>(() => {
    if (vectorWorld.velocityPath.length < 2) return null;
    const node = activeChartRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const scale = rect.height / (2 * zoomHalfSpan);
    const points = vectorWorld.velocityPath
      .map((p) => {
        const sx = (p.x - panCenter.x) * scale + rect.width / 2;
        const sy = (p.z - panCenter.z) * scale + rect.height / 2;
        return `${sx},${sy}`;
      })
      .join(' ');
    return { points, color: SHIP_DIRECTION_VELOCITY_COLOR };
  }, [activeChartRef, vectorWorld, panCenter, zoomHalfSpan, fullscreen]);

  const orbitRings = useMemo<
    Array<{ id: string; sx: number; sy: number; pxRadius: number; color: string }>
  >(() => {
    const node = activeChartRef.current;
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
  }, [activeChartRef, panCenter, showSolarSystem, zoomHalfSpan, fullscreen]);

  const scannerRings = useMemo<{
    shipSx: number;
    shipSy: number;
    rings: Array<{ id: string; pxRadius: number; color: string }>;
  } | null>(() => {
    const node = activeChartRef.current;
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
    return { shipSx, shipSy, rings };
  }, [activeChartRef, panCenter, zoomHalfSpan, markers, fullscreen]);

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
    const node = activeChartRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
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
    if (!draggingRef.current || !activeChartRef.current || !dragAnchorRef.current) return;
    const rect = activeChartRef.current.getBoundingClientRect();
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

  function openFullscreen() {
    setFollowShip(false);
    setPanCenter({ x: 0, z: 0 });
    setZoomHalfSpan(showSolarSystem ? ZOOM_DEFAULT_HALF_SPAN : zoomHalfSpan);
    setHoverCard(null);
    setFullscreen(true);
  }

  function closeFullscreen() {
    setFullscreen(false);
    setHoverCard(null);
  }

  const chartPanel = !dockingAssist ? (
    <StarChartPanel
      orbitRings={orbitRings}
      scannerRings={scannerRings}
      chartNavLine={chartNavLine}
      chartVelocityPath={chartVelocityPath}
      visibleMarkers={visibleMarkers}
      shipHeadingDeg={shipHeadingDeg}
      markerClass={markerClass}
      setHoverCard={setHoverCard}
      hoverCard={hoverCard}
      describeMarker={describeMarker}
    />
  ) : null;

  const fullscreenOverlay =
    fullscreen && !dockingAssist
      ? createPortal(
          <div
            ref={fullscreenRootRef}
            className={`sandbox-map-fullscreen${isDragging ? ' sandbox-map-overlay--dragging' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Full screen star chart"
          >
            <div className="sandbox-map-fullscreen-bezel">
              <div className="mech-chart-head">
                <span className="mech-chart-lamp" aria-hidden />
                <span className="mech-chart-title">STAR</span>
                <span className="mech-chart-sub">FULL</span>
                <div className="sandbox-map-actions">
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={toggleFollowShip}
                    className={followShip ? 'sandbox-map-action--active' : ''}
                    title={followShip ? 'Auto-follow ship enabled' : 'Auto-follow ship disabled'}
                  >
                    {`CTR ${followShip ? 'ON' : 'OFF'}`}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={closeFullscreen}
                    title="Exit full screen (Esc)"
                  >
                    CLS
                  </button>
                </div>
              </div>
              <div
                ref={fullscreenContainerRef}
                className="sandbox-map-fullscreen-crt"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDrag}
                onMouseLeave={stopDrag}
              >
                <div className="sandbox-map-grid" />
                {chartPanel}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={`sandbox-map-overlay mech-chart${isDragging && !fullscreen ? ' sandbox-map-overlay--dragging' : ''}${dockingAssist ? ' sandbox-map-overlay--docking' : ''}`}
      >
        <div className="mech-chart-bezel">
          <div className="mech-chart-head">
            <span className="mech-chart-lamp" aria-hidden />
            <span className="mech-chart-title">{dockingAssist ? 'DOCK' : 'STAR'}</span>
            {dockingAssist ? <span className="mech-chart-sub">ASSIST</span> : null}
            <div className="sandbox-map-actions">
              {!dockingAssist && showSolarSystem ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={openFullscreen}
                  className={fullscreen ? 'sandbox-map-action--active' : ''}
                  title="Open full-screen star chart"
                >
                  FLL
                </button>
              ) : null}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={toggleFollowShip}
                className={followShip ? 'sandbox-map-action--active' : ''}
                title={followShip ? 'Auto-follow ship enabled' : 'Auto-follow ship disabled'}
                disabled={Boolean(dockingAssist)}
              >
                {dockingAssist ? 'DOCK' : `CTR ${followShip ? 'ON' : 'OFF'}`}
              </button>
            </div>
          </div>
          <div
            ref={containerRef}
            className="mech-chart-crt"
            onWheel={fullscreen ? undefined : handleWheel}
            onMouseDown={fullscreen ? undefined : handleMouseDown}
            onMouseMove={fullscreen ? undefined : handleMouseMove}
            onMouseUp={fullscreen ? undefined : stopDrag}
            onMouseLeave={fullscreen ? undefined : stopDrag}
          >
            <div className="sandbox-map-grid" />
            {dockingAssist ? (
              <DockingAssistPanel
                dockingAssist={dockingAssist}
                dockingAssistProjection={dockingAssistProjection}
                dockingReadouts={dockingReadouts}
                dockingCaptureActive={dockingCaptureActive}
              />
            ) : fullscreen ? (
              <div className="sandbox-map-status">FULL SCREEN</div>
            ) : (
              chartPanel
            )}
          </div>
        </div>
      </div>
      {fullscreenOverlay}
    </>
  );
}
