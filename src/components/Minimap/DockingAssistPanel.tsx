import type { CSSProperties } from 'react';
import { shipIconCssTransform } from './minimapHelpers';
import type {
  DockingAssistData,
  DockingAssistProjection,
  DockingReadouts,
} from './minimapTypes';

export default function DockingAssistPanel({
  dockingAssist,
  dockingAssistProjection,
  dockingReadouts,
  dockingCaptureActive,
  dockPermissionRequired,
  dockPermissionGranted,
  onRequestDockPermission,
}: {
  dockingAssist: DockingAssistData;
  dockingAssistProjection: DockingAssistProjection | null;
  dockingReadouts: DockingReadouts | null;
  dockingCaptureActive: boolean;
  dockPermissionRequired: boolean;
  dockPermissionGranted: boolean;
  onRequestDockPermission: () => void;
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
            style={{
              transform: `translate(-50%, -50%) rotate(${dockingAssist.headingErrorDeg}deg)`,
            }}
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
      {isHover && dockPermissionRequired && !dockingCaptureActive && (
        <button
          type="button"
          className="sandbox-map-docking-action"
          onClick={onRequestDockPermission}
          disabled={dockPermissionGranted}
          title={dockPermissionGranted ? 'Dock permission already granted' : 'Request dock permission'}
        >
          {dockPermissionGranted ? 'DOCK PERMISSION GRANTED' : 'REQUEST DOCK PERMISSION'}
        </button>
      )}
      {dockingCaptureActive && <div className="sandbox-map-docking-wait">DOCKING, PLEASE WAIT</div>}
    </>
  );
}
