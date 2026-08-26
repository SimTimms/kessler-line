import type { CSSProperties } from 'react';
import * as THREE from 'three';
import { RadioTower, Radar, Magnet, HardDrive, PlaneLanding } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  describeMarker,
  describeUnifiedMarker,
  isUnifiedMarker,
  markerClass,
  shipIconCssTransform,
} from './minimapHelpers';
import { selectTarget } from '../../context/TargetSelection';
import type {
  ChartNavLine,
  ChartVelocityPath,
  HoverCardState,
  Marker,
  MarkerKind,
  OrbitRing,
  ScannerRings,
  VisibleMarker,
  VisibleUnifiedMarker,
} from './minimapTypes';

const RING_COLORS: Partial<Record<MarkerKind, string>> = {
  proximity: '#d885ff',
  mag: '#ffd24d',
  drive: '#00d6ff',
  radio: '#45ff88',
  hard: '#ffffff',
  landingPad: '#5fffa8',
};

/** Placement order for orbit icons: radio → drive → mag → proximity → hard → landingPad. */
const RING_ORDER: MarkerKind[] = ['radio', 'drive', 'mag', 'proximity', 'hard', 'landingPad'];

const RING_ICONS: Partial<Record<MarkerKind, LucideIcon>> = {
  proximity: Radar,
  mag: Magnet,
  drive: HardDrive,
  radio: RadioTower,
  landingPad: PlaneLanding,
};

const ORBIT_RADIUS_PX = 18;
const ORBIT_ICON_SIZE = 14;
const CENTER_DOT_SIZE = 2;

function handleMarkerTargetClick(marker: { label: string; x: number; z: number; entityId?: string }) {
  selectTarget(
    marker.label,
    undefined,
    new THREE.Vector3(marker.x, 0, marker.z),
    marker.entityId ?? marker.label,
  );
}

function UnifiedMarkerRings({ marker }: { marker: VisibleUnifiedMarker }) {
  const ordered = RING_ORDER.filter((k) => marker.scanners.has(k));
  const count = ordered.length;
  return (
    <>
      <span
        className="sandbox-map-marker-center-dot"
        style={{ width: `${CENTER_DOT_SIZE}px`, height: `${CENTER_DOT_SIZE}px` }}
      />
      {ordered.map((kind, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2;
        const x = Math.cos(angle) * ORBIT_RADIUS_PX;
        const y = Math.sin(angle) * ORBIT_RADIUS_PX;
        const color = RING_COLORS[kind] ?? '#fff';
        const Icon = RING_ICONS[kind];
        return Icon ? (
          <span
            key={kind}
            className="sandbox-map-marker-orbit-icon"
            style={
              {
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
              } as CSSProperties
            }
          >
            <Icon size={ORBIT_ICON_SIZE} strokeWidth={2} />
          </span>
        ) : (
          <span
            key={kind}
            className="sandbox-map-marker-orbit-dot"
            style={
              {
                position: 'absolute' as const,
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                background: color,
                boxShadow: `0 0 3px ${color}`,
              } as CSSProperties
            }
          />
        );
      })}
    </>
  );
}

export default function StarChartPanel({
  orbitRings,
  scannerRings,
  chartNavLine,
  chartVelocityPath,
  visibleMarkers,
  shipHeadingDeg,
  setHoverCard,
  hoverCard,
}: {
  orbitRings: OrbitRing[];
  scannerRings: ScannerRings | null;
  chartNavLine: ChartNavLine | null;
  chartVelocityPath: ChartVelocityPath | null;
  visibleMarkers: (VisibleMarker | VisibleUnifiedMarker)[];
  shipHeadingDeg: number;
  setHoverCard: React.Dispatch<React.SetStateAction<HoverCardState | null>>;
  hoverCard: HoverCardState | null;
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
              borderColor: '#FFF',
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
      {visibleMarkers.map((marker) => {
        const unified = isUnifiedMarker(marker);
        if (unified) {
          return (
            <div
              key={marker.id}
              className="sandbox-map-marker sandbox-map-marker--unified"
              style={
                {
                  left: `${marker.sx}px`,
                  top: `${marker.sy}px`,
                  opacity: marker.inRange === false ? 0.45 : 1,
                  cursor: 'pointer',
                } as CSSProperties
              }
              title={marker.label}
              onClick={() => handleMarkerTargetClick(marker)}
              onMouseEnter={(e) => setHoverCard({ marker, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) =>
                setHoverCard((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
              }
              onMouseLeave={() => setHoverCard(null)}
            >
              <UnifiedMarkerRings marker={marker} />
            </div>
          );
        }
        const plain = marker as VisibleMarker;
        return (
          <div
            key={plain.id}
            className={markerClass(plain.kind)}
            style={
              {
                left: `${plain.sx}px`,
                top: `${plain.sy}px`,
                '--marker-color': plain.color ?? undefined,
                '--marker-size': `${plain.pxSize}px`,
                opacity: plain.inRange === false ? 0.45 : 1,
                cursor: !['ship', 'planet', 'nav'].includes(plain.kind) ? 'pointer' : undefined,
                transform:
                  plain.kind === 'ship'
                    ? shipIconCssTransform(shipHeadingDeg)
                    : plain.kind === 'nav'
                      ? 'translate(-50%, -50%) rotate(45deg)'
                      : 'translate(-50%, -50%)',
              } as CSSProperties
            }
            title={plain.label}
            onClick={
              !['ship', 'planet', 'nav'].includes(plain.kind)
                ? () => handleMarkerTargetClick(plain)
                : undefined
            }
            onMouseEnter={(e) => setHoverCard({ marker: plain, x: e.clientX, y: e.clientY })}
            onMouseMove={(e) =>
              setHoverCard((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
            }
            onMouseLeave={() => setHoverCard(null)}
          >
            {plain.kind === 'radio' && (
              <RadioTower size={12} strokeWidth={2} className="sandbox-map-marker-radio-icon" />
            )}
          </div>
        );
      })}
      {hoverCard && (
        <div
          className="sandbox-map-hover-card"
          style={{
            left: `${hoverCard.x + 14}px`,
            top: `${hoverCard.y - 8}px`,
          }}
        >
          <div className="sandbox-map-hover-title">{hoverCard.marker.label}</div>
          {(isUnifiedMarker(hoverCard.marker)
            ? describeUnifiedMarker(hoverCard.marker)
            : describeMarker(hoverCard.marker as Marker)
          ).map((line) => (
            <div key={line} className="sandbox-map-hover-line">
              {line}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
