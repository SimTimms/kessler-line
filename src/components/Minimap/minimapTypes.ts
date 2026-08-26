import type { DockCaptureMode } from '../../config/dockCaptureConfig';

export type MarkerKind =
  | 'planet'
  | 'ship'
  | 'nav'
  | 'drive'
  | 'mag'
  | 'radio'
  | 'proximity'
  | 'hard'
  | 'landingPad';

export type Marker = {
  id: string;
  label: string;
  x: number;
  z: number;
  kind: MarkerKind;
  color?: string;
  inRange?: boolean;
  size?: number;
  radiusWorld?: number;
  entityId?: string;
  radioCapable?: boolean;
};

export type UnifiedMarker = Omit<Marker, 'kind'> & {
  scanners: Set<MarkerKind>;
  primaryKind: MarkerKind;
};

export type VisibleUnifiedMarker = UnifiedMarker & { sx: number; sy: number; pxSize: number };

export type HoverCardState = {
  marker: Marker | UnifiedMarker;
  x: number;
  y: number;
};

export type DockingAssistData = {
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

export type DockingReadouts = {
  speedIndicatorPct: number;
  speedSafeTopPct: number;
  alignPct: number;
  relSpeedText: string;
  idealSpeedText: string;
  xText: string;
  zText: string;
  rangeText: string;
};

export type DockingAssistProjection = {
  shipSx: number;
  shipSy: number;
  dockSx: number;
  dockSy: number;
};

export type OrbitAssistData = {
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

export type OrbitAssistReadouts = {
  altText: string;
  periText: string;
  apoText: string;
  speedText: string;
  circText: string;
  reqText: string;
  dvText: string;
  statusText: string;
};

export type OrbitAssistProjection = {
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
  progradeTipSx: number;
  progradeTipSy: number;
  shipFacingDeg: number;
  shipRingPx: number;
};

export type VisibleMarker = Marker & { sx: number; sy: number; pxSize: number };

export type OrbitRing = { id: string; sx: number; sy: number; pxRadius: number; color: string };

export type ScannerRings = {
  shipSx: number;
  shipSy: number;
  rings: Array<{ id: string; pxRadius: number; color: string }>;
};

export type ChartNavLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};

export type ChartVelocityPath = {
  points: string;
  color: string;
};

/** World-space nav endpoint + predicted velocity/trajectory path (projected each render). */
export type VectorWorld = {
  nav: { x: number; z: number } | null;
  velocityPath: Array<{ x: number; z: number }>;
  shipX: number;
  shipZ: number;
};

export type PanCenter = { x: number; z: number };
