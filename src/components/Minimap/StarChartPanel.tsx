import type { CSSProperties } from 'react';
import { describeMarker, markerClass, shipIconCssTransform } from './minimapHelpers';
import type {
  ChartNavLine,
  ChartVelocityPath,
  HoverCardState,
  OrbitRing,
  ScannerRings,
  VisibleMarker,
} from './minimapTypes';

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
  visibleMarkers: VisibleMarker[];
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
