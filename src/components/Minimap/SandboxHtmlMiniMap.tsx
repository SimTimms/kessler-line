import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { PLANETS } from '../Planets/SolarSystem';
import { SOLAR_SYSTEM_SCALE, SUN_WORLD_RADIUS } from '../../config/solarConfig';
import { shipPosRef } from '../../context/ShipPos';
import {
  orbitStatusRef,
  shipQuaternion,
  shipVelocity,
} from '../../context/ShipState';
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
import { getDockCaptureProfile } from '../../utils/dockingCapture';
import type { DockCaptureMode } from '../../config/dockCaptureConfig';
import { SHIP_DOCKING_PORT_LOCAL } from '../../config/shipConfig';
import { gravityBodies, type GravityBody } from '../../context/GravityRegistry';
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
  /** Hover pads use rings; nose ports use a port-relative reticle. */
  captureMode: Extract<DockCaptureMode, 'nose' | 'hover'>;
  shipX: number;
  shipZ: number;
  dockX: number;
  dockZ: number;
  distanceToCenter: number;
  lateralX: number;
  lateralZ: number;
  /**
   * Nose mode: dock bay position relative to the ship docking port, in ship-local
   * axes where +forward is the flight nose (−local Z).
   */
  portRelX: number;
  portRelForward: number;
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

type OrbitAssistData = {
  bodyId: string;
  bodyLabel: string;
  bodyX: number;
  bodyZ: number;
  shipX: number;
  shipZ: number;
  surfaceRadius: number;
  idealOrbitRadius: number;
  soiRadius: number;
  altitude: number;
  periAlt: number;
  apoAlt: number;
  /** Current tangential speed (relative to body). */
  tangSpeedMps: number;
  /** Circular speed at ideal altitude. */
  circSpeedMps: number;
  /** Required circular speed at current altitude √(μ/r). */
  requiredSpeedMps: number;
  /** World-XZ unit direction of required circular velocity. */
  requiredDirX: number;
  requiredDirZ: number;
  /** Optional nav / selected target for the blue cue. */
  targetX: number | null;
  targetZ: number | null;
  isOrbiting: boolean;
  shipHeadingDeg: number;
  /** Predicted path in world XZ (includes gravity). */
  predictedPath: Array<{ x: number; z: number }>;
};

type OrbitAssistReadouts = {
  altText: string;
  periText: string;
  apoText: string;
  speedText: string;
  circText: string;
  reqText: string;
  dvText: string;
  statusText: string;
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
  const isHover = dockingAssist.captureMode === 'hover';

  return (
    <>
      {isHover ? (
        <div className="sandbox-map-docking-rings" aria-hidden="true">
          <div className="sandbox-map-docking-ring sandbox-map-docking-ring--outer" />
          <div className="sandbox-map-docking-ring sandbox-map-docking-ring--mid" />
          <div className="sandbox-map-docking-ring sandbox-map-docking-ring--inner" />
        </div>
      ) : (
        <div className="sandbox-map-docking-port-frame" aria-hidden="true">
          <div className="sandbox-map-docking-port-reticle" />
          <div className="sandbox-map-docking-port-crosshair sandbox-map-docking-port-crosshair--h" />
          <div className="sandbox-map-docking-port-crosshair sandbox-map-docking-port-crosshair--v" />
          <div
            className="sandbox-map-docking-port-heading"
            style={{ transform: `translate(-50%, -50%) rotate(${dockingAssist.headingErrorDeg}deg)` }}
          />
        </div>
      )}
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
      {dockingAssistProjection && isHover && (
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
      )}
      {dockingAssistProjection && !isHover && (
        <>
          <svg className="sandbox-map-docking-port-vectors" aria-hidden>
            <line
              className="sandbox-map-docking-port-link"
              x1="50%"
              y1="50%"
              x2={dockingAssistProjection.dockSx}
              y2={dockingAssistProjection.dockSy}
            />
          </svg>
          <div
            className="sandbox-map-docking-port-target"
            style={
              {
                left: `${dockingAssistProjection.dockSx}px`,
                top: `${dockingAssistProjection.dockSy}px`,
              } as CSSProperties
            }
            title={dockingAssist.dockLabel}
          />
          <div
            className="sandbox-map-marker sandbox-map-marker--ship sandbox-map-marker--ship-port"
            style={
              {
                left: '50%',
                top: '50%',
                // Nose / docking port is at the top of ship-nav-icon; keep that on HUD center.
                transform: 'translate(-50%, 0%)',
              } as CSSProperties
            }
            title="Your ship (port at center)"
          />
        </>
      )}
      {dockingReadouts && (
        <>
          <div className="sandbox-map-docking-mps">MPS {dockingReadouts.relSpeedText}</div>
          <div className="sandbox-map-docking-ideal">
            IDEAL {dockingReadouts.idealSpeedText} MPS
          </div>
          {!isHover && (
            <div className="sandbox-map-docking-port-readouts">
              <span>RNG {dockingReadouts.rangeText}</span>
              <span>HDG {dockingAssist.headingErrorDeg.toFixed(0)}°</span>
            </div>
          )}
        </>
      )}
      {dockingCaptureActive && <div className="sandbox-map-docking-wait">DOCKING, PLEASE WAIT</div>}
    </>
  );
}

function OrbitAssistPanel({
  orbitAssist,
  orbitAssistProjection,
  orbitAssistReadouts,
}: {
  orbitAssist: OrbitAssistData;
  orbitAssistProjection: {
    bodySx: number;
    bodySy: number;
    shipSx: number;
    shipSy: number;
    surfacePx: number;
    idealPx: number;
    predictedPoints: string;
    targetSx: number | null;
    targetSy: number | null;
    reqTipSx: number;
    reqTipSy: number;
    shipRingPx: number;
  } | null;
  orbitAssistReadouts: OrbitAssistReadouts | null;
}) {
  return (
    <>
      {orbitAssistProjection && (
        <>
          <svg className="sandbox-map-orbit-assist-vectors" aria-hidden>
            <circle
              className="sandbox-map-orbit-assist-surface"
              cx={orbitAssistProjection.bodySx}
              cy={orbitAssistProjection.bodySy}
              r={Math.max(2, orbitAssistProjection.surfacePx)}
            />
            <circle
              className="sandbox-map-orbit-assist-ideal"
              cx={orbitAssistProjection.bodySx}
              cy={orbitAssistProjection.bodySy}
              r={Math.max(3, orbitAssistProjection.idealPx)}
            />
            {orbitAssistProjection.predictedPoints.length > 0 && (
              <polyline
                className="sandbox-map-orbit-assist-path"
                points={orbitAssistProjection.predictedPoints}
              />
            )}
            {orbitAssistProjection.targetSx != null &&
              orbitAssistProjection.targetSy != null && (
                <line
                  className="sandbox-map-orbit-assist-target"
                  x1={orbitAssistProjection.shipSx}
                  y1={orbitAssistProjection.shipSy}
                  x2={orbitAssistProjection.targetSx}
                  y2={orbitAssistProjection.targetSy}
                />
              )}
            <line
              className="sandbox-map-orbit-assist-req"
              x1={orbitAssistProjection.shipSx}
              y1={orbitAssistProjection.shipSy}
              x2={orbitAssistProjection.reqTipSx}
              y2={orbitAssistProjection.reqTipSy}
            />
            <circle
              className="sandbox-map-orbit-assist-ship-ring"
              cx={orbitAssistProjection.shipSx}
              cy={orbitAssistProjection.shipSy}
              r={orbitAssistProjection.shipRingPx}
            />
          </svg>
          <div
            className="sandbox-map-marker sandbox-map-marker--ship"
            style={
              {
                left: `${orbitAssistProjection.shipSx}px`,
                top: `${orbitAssistProjection.shipSy}px`,
                transform: shipIconCssTransform(orbitAssist.shipHeadingDeg),
              } as CSSProperties
            }
            title="Your Ship"
          />
          {orbitAssistReadouts && (
            <div
              className="sandbox-map-orbit-assist-req-label"
              style={{
                left: `${orbitAssistProjection.shipSx}px`,
                top: `${orbitAssistProjection.shipSy + orbitAssistProjection.shipRingPx + 10}px`,
              }}
            >
              <span>CIRC</span>
              <span>{orbitAssistReadouts.reqText} MPS</span>
            </div>
          )}
        </>
      )}
      {orbitAssistReadouts && (
        <>
          <div className="sandbox-map-orbit-assist-body">{orbitAssist.bodyLabel}</div>
          <div className="sandbox-map-orbit-assist-readouts">
            <span>ALT {orbitAssistReadouts.altText}</span>
            <span>
              Pe {orbitAssistReadouts.periText} / Ap {orbitAssistReadouts.apoText}
            </span>
            <span>
              V {orbitAssistReadouts.speedText} / REQ {orbitAssistReadouts.reqText}
            </span>
            <span>ΔV {orbitAssistReadouts.dvText}</span>
          </div>
          <div
            className={`sandbox-map-orbit-assist-status${orbitAssist.isOrbiting ? ' sandbox-map-orbit-assist-status--ok' : ''}`}
          >
            {orbitAssistReadouts.statusText}
          </div>
        </>
      )}
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
const _portWorldPos = new THREE.Vector3();
const _shipInvQuat = new THREE.Quaternion();
const _dockInShipLocal = new THREE.Vector3();

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
/** Extra framing around planet / path when computing orbit-assist zoom. */
const ORBIT_ASSIST_FRAME = 1.22;
const EVENT_DOCKING_CAPTURE_STARTED = 'DockingCaptureStarted';
const EVENT_DOCKING_CAPTURE_ENDED = 'DockingCaptureEnded';

function idealOrbitRadiusForBody(body: {
  surfaceRadius: number;
  orbitAltitude: number;
  soiRadius: number;
}): number {
  return Math.min(body.surfaceRadius + body.orbitAltitude, body.soiRadius * 0.9);
}

function formatOrbitDistance(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}k`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

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
  const [orbitAssist, setOrbitAssist] = useState<OrbitAssistData | null>(null);
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

  // Dock / orbit assist takes over the corner chart — exit fullscreen so we don't leave it dimmed/empty.
  useEffect(() => {
    if ((dockingAssist || orbitAssist) && fullscreen) {
      setFullscreen(false);
    }
  }, [dockingAssist, orbitAssist, fullscreen]);

  // Hide scene Html labels (speed / target name) while the map overlay covers them.
  useEffect(() => {
    minimapOverlayActiveRef.current = fullscreen || Boolean(dockingAssist) || Boolean(orbitAssist);
    return () => {
      minimapOverlayActiveRef.current = false;
    };
  }, [fullscreen, dockingAssist, orbitAssist]);

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
        captureMode: Extract<DockCaptureMode, 'nose' | 'hover'>;
        x: number;
        z: number;
        relSpeedMps: number;
        idealSpeedMps: number;
        headingErrorDeg: number;
        portRelX: number;
        portRelForward: number;
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
      _portWorldPos
        .set(SHIP_DOCKING_PORT_LOCAL[0], SHIP_DOCKING_PORT_LOCAL[1], SHIP_DOCKING_PORT_LOCAL[2])
        .applyQuaternion(shipQuaternion)
        .add(ship);
      _shipInvQuat.copy(shipQuaternion).invert();
      for (const col of collidables) {
        if (!col.id.startsWith('docking-bay-')) continue;
        const profile = getDockCaptureProfile(col);
        if (profile.mode !== 'nose' && profile.mode !== 'hover') continue;
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
        const idealSpeedMps = Math.max(0.35, (profile.maxRelativeSpeed ?? 2) * 0.55);
        _dockInShipLocal.subVectors(_dockWorldPos, _portWorldPos).applyQuaternion(_shipInvQuat);
        // Flight nose is −local Z → positive forward when dock is ahead of the port.
        const portRelX = _dockInShipLocal.x;
        const portRelForward = -_dockInShipLocal.z;
        if (!nearestDock || planarDist < nearestDockDistance.current) {
          nearestDock = {
            id: col.id,
            label: col.label ?? col.stationId ?? col.id,
            stationId: col.stationId ?? null,
            captureMode: profile.mode,
            x: _dockWorldPos.x,
            z: _dockWorldPos.z,
            relSpeedMps: relSpeed,
            idealSpeedMps,
            headingErrorDeg,
            portRelX,
            portRelForward,
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
        const distanceToCenter =
          nearestDock.captureMode === 'nose'
            ? Math.hypot(nearestDock.portRelX, nearestDock.portRelForward)
            : Math.hypot(lateralX, lateralZ);
        if (
          nearestDock.captureMode === 'hover' &&
          lastPadScanDockIdRef.current !== nearestDock.id
        ) {
          lastPadScanDockIdRef.current = nearestDock.id;
          beginPadScan(nearestDock.id);
        } else if (nearestDock.captureMode !== 'hover') {
          lastPadScanDockIdRef.current = null;
        }
        setDockingAssist({
          dockId: nearestDock.id,
          dockLabel: nearestDock.label,
          stationId: nearestDock.stationId,
          captureMode: nearestDock.captureMode,
          shipX: ship.x,
          shipZ: ship.z,
          dockX: nearestDock.x,
          dockZ: nearestDock.z,
          distanceToCenter,
          lateralX,
          lateralZ,
          portRelX: nearestDock.portRelX,
          portRelForward: nearestDock.portRelForward,
          relSpeedMps: nearestDock.relSpeedMps,
          idealSpeedMps: nearestDock.idealSpeedMps,
          headingErrorDeg: nearestDock.headingErrorDeg,
          shipHeadingDeg: (Math.atan2(_shipForward.x, _shipForward.z) * 180) / Math.PI,
        });
        setOrbitAssist(null);
      } else {
        lastPadScanDockIdRef.current = null;
        setDockingAssist(null);

        let primaryId: string | null = null;
        let primaryBody: GravityBody | null = null;
        let primaryAccel = 0;
        const statusId = orbitStatusRef.current.bodyId;
        if (statusId && statusId !== 'Sun') {
          const statusBody = gravityBodies.get(statusId);
          if (statusBody) {
            const dist = Math.hypot(
              statusBody.position.x - ship.x,
              statusBody.position.z - ship.z
            );
            if (dist > statusBody.surfaceRadius && dist < statusBody.soiRadius) {
              primaryId = statusId;
              primaryBody = statusBody;
            }
          }
        }
        if (!primaryBody) {
          for (const [id, body] of gravityBodies) {
            if (id === 'Sun') continue;
            const dx = body.position.x - ship.x;
            const dz = body.position.z - ship.z;
            const dist2 = dx * dx + dz * dz;
            const dist = Math.sqrt(dist2);
            if (dist > body.surfaceRadius && dist < body.soiRadius) {
              const accel = body.mu / dist2;
              if (accel > primaryAccel) {
                primaryAccel = accel;
                primaryId = id;
                primaryBody = body;
              }
            }
          }
        }

        if (primaryBody && primaryId) {
          const idealR = idealOrbitRadiusForBody(primaryBody);
          const relX = ship.x - primaryBody.position.x;
          const relZ = ship.z - primaryBody.position.z;
          const r = Math.hypot(relX, relZ);
          const rx = relX / Math.max(r, 1e-6);
          const rz = relZ / Math.max(r, 1e-6);
          const relVx = shipVelocity.x - primaryBody.velocity.x;
          const relVz = shipVelocity.z - primaryBody.velocity.z;
          const tangSpeed = Math.abs(-rz * relVx + rx * relVz);
          const circSpeed = Math.sqrt(primaryBody.mu / Math.max(idealR, 1));
          const requiredSpeed = Math.sqrt(primaryBody.mu / Math.max(r, 1));
          const tx = -rz;
          const tz = rx;
          const tangDot = relVx * tx + relVz * tz;
          const tangentSign = tangDot >= 0 ? 1 : -1;
          const requiredDirX = tx * tangentSign;
          const requiredDirZ = tz * tangentSign;
          let targetX: number | null = null;
          let targetZ: number | null = null;
          if (selectedTargetName !== null && selectedTargetPosition.lengthSq() > 0.01) {
            targetX = selectedTargetPosition.x;
            targetZ = selectedTargetPosition.z;
          } else if (hasNavTarget()) {
            targetX = navTargetPosRef.current.x;
            targetZ = navTargetPosRef.current.z;
          }
          const status = orbitStatusRef.current;
          const surfaceR =
            status.bodyId === primaryId && status.surfaceRadius > 0
              ? status.surfaceRadius
              : primaryBody.surfaceRadius;
          const periAlt =
            status.bodyId === primaryId && status.periapsis > 0
              ? Math.max(0, status.periapsis - surfaceR)
              : Math.max(0, r - surfaceR);
          const apoAlt =
            status.bodyId === primaryId && status.apoapsis > 0
              ? Math.max(0, status.apoapsis - surfaceR)
              : Math.max(0, r - surfaceR);
          const predictedPath =
            Math.hypot(shipVelocity.x, shipVelocity.z) > SHIP_DIRECTION_MIN_SPEED
              ? sampleShipTrajectoryXZ(
                  ship.x,
                  ship.z,
                  shipVelocity.x,
                  shipVelocity.z,
                  MINIMAP_TRAJECTORY_STEPS,
                  MINIMAP_TRAJECTORY_DT
                )
              : [{ x: ship.x, z: ship.z }];
          _shipForward.set(0, 0, 1).applyQuaternion(shipQuaternion);
          setOrbitAssist({
            bodyId: primaryId,
            bodyLabel: primaryId.toUpperCase(),
            bodyX: primaryBody.position.x,
            bodyZ: primaryBody.position.z,
            shipX: ship.x,
            shipZ: ship.z,
            surfaceRadius: primaryBody.surfaceRadius,
            idealOrbitRadius: idealR,
            soiRadius: primaryBody.soiRadius,
            altitude: Math.max(0, r - primaryBody.surfaceRadius),
            periAlt,
            apoAlt,
            tangSpeedMps: tangSpeed,
            circSpeedMps: circSpeed,
            requiredSpeedMps: requiredSpeed,
            requiredDirX,
            requiredDirZ,
            targetX,
            targetZ,
            isOrbiting: status.bodyId === primaryId && status.isOrbiting,
            shipHeadingDeg: (Math.atan2(_shipForward.x, _shipForward.z) * 180) / Math.PI,
            predictedPath,
          });
        } else {
          setOrbitAssist(null);
        }
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
    if (dockingAssist.captureMode === 'nose') {
      const halfSpan = clamp(
        Math.max(Math.abs(dockingAssist.portRelX), Math.abs(dockingAssist.portRelForward)) +
          DOCKING_ASSIST_MARGIN,
        DOCKING_ASSIST_MIN_HALF_SPAN,
        DOCKING_ASSIST_MAX_HALF_SPAN
      );
      const scale = rect.height / (2 * halfSpan);
      const shipSx = rect.width / 2;
      const shipSy = rect.height / 2;
      // Ship-local: +X right, +forward up on screen (CSS Y grows down).
      const dockSx = shipSx + dockingAssist.portRelX * scale;
      const dockSy = shipSy - dockingAssist.portRelForward * scale;
      return { shipSx, shipSy, dockSx, dockSy };
    }
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

  const orbitAssistProjection = useMemo(() => {
    const node = containerRef.current;
    if (!node || !orbitAssist) return null;
    const rect = node.getBoundingClientRect();
    let extent = Math.max(
      orbitAssist.idealOrbitRadius,
      Math.hypot(orbitAssist.shipX - orbitAssist.bodyX, orbitAssist.shipZ - orbitAssist.bodyZ),
      orbitAssist.surfaceRadius * 1.15
    );
    for (const p of orbitAssist.predictedPath) {
      extent = Math.max(
        extent,
        Math.hypot(p.x - orbitAssist.bodyX, p.z - orbitAssist.bodyZ)
      );
    }
    // Keep framing inside SOI so the ideal ring stays readable.
    extent = Math.min(extent, orbitAssist.soiRadius * 0.98);
    const halfSpan = Math.max(extent * ORBIT_ASSIST_FRAME, orbitAssist.surfaceRadius * 1.2);
    const scale = rect.height / (2 * halfSpan);
    const bodySx = rect.width / 2;
    const bodySy = rect.height / 2;
    const shipSx = (orbitAssist.shipX - orbitAssist.bodyX) * scale + bodySx;
    const shipSy = (orbitAssist.shipZ - orbitAssist.bodyZ) * scale + bodySy;
    const predictedPoints = orbitAssist.predictedPath
      .map((p) => {
        const sx = (p.x - orbitAssist.bodyX) * scale + bodySx;
        const sy = (p.z - orbitAssist.bodyZ) * scale + bodySy;
        return `${sx},${sy}`;
      })
      .join(' ');
    const shipRingPx = clamp(Math.min(rect.width, rect.height) * 0.09, 10, 18);
    const reqTipSx = shipSx + orbitAssist.requiredDirX * shipRingPx;
    const reqTipSy = shipSy + orbitAssist.requiredDirZ * shipRingPx;
    let targetSx: number | null = null;
    let targetSy: number | null = null;
    if (orbitAssist.targetX != null && orbitAssist.targetZ != null) {
      targetSx = (orbitAssist.targetX - orbitAssist.bodyX) * scale + bodySx;
      targetSy = (orbitAssist.targetZ - orbitAssist.bodyZ) * scale + bodySy;
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
      reqTipSx,
      reqTipSy,
      shipRingPx,
    };
  }, [orbitAssist]);

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

  const assistActive = Boolean(dockingAssist || orbitAssist);

  const chartPanel = !assistActive ? (
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
    fullscreen && !assistActive
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

  const chartTitle = dockingAssist ? 'DOCK' : orbitAssist ? 'ORB' : 'STAR';
  const chartSub = dockingAssist
    ? dockingAssist.captureMode === 'nose'
      ? 'PORT'
      : 'HOVER'
    : orbitAssist
      ? orbitAssist.isOrbiting
        ? 'ORBIT'
        : 'SOI'
      : null;
  const overlayModeClass = dockingAssist
    ? ' sandbox-map-overlay--docking'
    : orbitAssist
      ? ' sandbox-map-overlay--orbit'
      : '';

  return (
    <>
      <div
        className={`sandbox-map-overlay mech-chart${isDragging && !fullscreen ? ' sandbox-map-overlay--dragging' : ''}${overlayModeClass}`}
      >
        <div className="mech-chart-bezel">
          <div className="mech-chart-head">
            <span className="mech-chart-lamp" aria-hidden />
            <span className="mech-chart-title">{chartTitle}</span>
            {chartSub ? <span className="mech-chart-sub">{chartSub}</span> : null}
            <div className="sandbox-map-actions">
              {!assistActive && showSolarSystem ? (
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
                disabled={assistActive}
              >
                {dockingAssist ? 'DOCK' : orbitAssist ? 'ORB' : `CTR ${followShip ? 'ON' : 'OFF'}`}
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
            ) : orbitAssist ? (
              <OrbitAssistPanel
                orbitAssist={orbitAssist}
                orbitAssistProjection={orbitAssistProjection}
                orbitAssistReadouts={orbitAssistReadouts}
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
