import type {
  OrbitAssistData,
  OrbitAssistProjection,
  OrbitAssistReadouts,
} from './minimapTypes';

export default function OrbitAssistPanel({
  orbitAssist,
  orbitAssistProjection,
  orbitAssistReadouts,
}: {
  orbitAssist: OrbitAssistData;
  orbitAssistProjection: OrbitAssistProjection | null;
  orbitAssistReadouts: OrbitAssistReadouts | null;
}) {
  return (
    <>
      {orbitAssistProjection && (
        <>
          <svg className="sandbox-map-orbit-assist-vectors" aria-hidden>
            <defs>
              <marker
                id="sandbox-map-orbit-assist-planet-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L6,3 z" className="sandbox-map-orbit-assist-planet-arrowhead" />
              </marker>
            </defs>
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
            {orbitAssistProjection.targetSx != null && orbitAssistProjection.targetSy != null && (
              <line
                className="sandbox-map-orbit-assist-target"
                x1={orbitAssistProjection.shipSx}
                y1={orbitAssistProjection.shipSy}
                x2={orbitAssistProjection.targetSx}
                y2={orbitAssistProjection.targetSy}
              />
            )}
            <line
              className="sandbox-map-orbit-assist-planetdir"
              x1={orbitAssistProjection.shipSx}
              y1={orbitAssistProjection.shipSy}
              x2={orbitAssistProjection.bodySx}
              y2={orbitAssistProjection.bodySy}
              markerEnd="url(#sandbox-map-orbit-assist-planet-arrow)"
            />
            <line
              className="sandbox-map-orbit-assist-req"
              x1={orbitAssistProjection.shipSx}
              y1={orbitAssistProjection.shipSy}
              x2={orbitAssistProjection.reqTipSx}
              y2={orbitAssistProjection.reqTipSy}
            />
            <line
              className="sandbox-map-orbit-assist-prograde"
              x1={orbitAssistProjection.shipSx}
              y1={orbitAssistProjection.shipSy}
              x2={orbitAssistProjection.progradeTipSx}
              y2={orbitAssistProjection.progradeTipSy}
            />
            <g
              transform={`translate(${orbitAssistProjection.shipSx}, ${orbitAssistProjection.shipSy}) rotate(${orbitAssistProjection.shipFacingDeg})`}
            >
              <polygon
                className="sandbox-map-orbit-assist-ship-arrow"
                points="0,-11 7,8 -7,8"
              />
            </g>
            <circle
              className="sandbox-map-orbit-assist-ship-ring"
              cx={orbitAssistProjection.shipSx}
              cy={orbitAssistProjection.shipSy}
              r={orbitAssistProjection.shipRingPx}
            />
          </svg>
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
