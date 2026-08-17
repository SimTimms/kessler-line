import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EVENT_OPEN_COMMS_CONTACT } from '../../context/CommsUiEvents';
import { hasDockPermission } from '../../context/DockPermissionState';
import DockingAssistPanel from './DockingAssistPanel';
import OrbitAssistPanel from './OrbitAssistPanel';
import StarChartPanel from './StarChartPanel';
import type { HoverCardState } from './minimapTypes';
import {
  useDockPermissionVersion,
  useDockingCaptureActive,
  useExitFullscreenOnAssist,
  useMinimapKeyboardClose,
  useMinimapOverlayFlag,
} from './useMinimapEvents';
import { useMinimapProjections } from './useMinimapProjections';
import { useMinimapTelemetry } from './useMinimapTelemetry';
import { useMinimapViewport } from './useMinimapViewport';
import './SandboxHtmlMiniMap.css';

type PanelMode = 'chart' | 'dock' | 'pad' | 'orbit';

interface SandboxHtmlMiniMapProps {
  onClose: () => void;
  showSolarSystem?: boolean;
}

export default function SandboxHtmlMiniMap({
  onClose,
  showSolarSystem = true,
}: SandboxHtmlMiniMapProps) {
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);
  const clearHoverCard = useCallback(() => setHoverCard(null), []);

  const {
    containerRef,
    fullscreenContainerRef,
    fullscreenRootRef,
    activeChartRef,
    zoomHalfSpan,
    panCenter,
    setPanCenter,
    followShip,
    fullscreen,
    setFullscreen,
    isDragging,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    stopDrag,
    toggleFollowShip,
    openFullscreen,
    closeFullscreen,
  } = useMinimapViewport({ showSolarSystem, clearHoverCard });

  const { markers, vectorWorld, shipHeadingDeg, dockingAssist, orbitAssist } = useMinimapTelemetry({
    showSolarSystem,
    followShip,
    setPanCenter,
    zoomHalfSpan,
  });

  // Panel toggle — lets the user switch between chart, dock, pad, and orbit views.
  const [panelMode, setPanelMode] = useState<PanelMode>('chart');

  const hasDock = Boolean(dockingAssist && dockingAssist.captureMode === 'nose');
  const hasPad = Boolean(dockingAssist && dockingAssist.captureMode === 'hover');
  const hasOrbit = Boolean(orbitAssist);

  // Auto-switch when an assist panel appears; fall back to chart when data disappears.
  const prevAssistRef = useRef({ dock: false, pad: false, orbit: false });
  useEffect(() => {
    const prev = prevAssistRef.current;
    if (hasDock && !prev.dock) setPanelMode('dock');
    else if (hasPad && !prev.pad) setPanelMode('pad');
    else if (hasOrbit && !prev.orbit) setPanelMode('orbit');
    else if (panelMode === 'dock' && !hasDock) setPanelMode('chart');
    else if (panelMode === 'pad' && !hasPad) setPanelMode('chart');
    else if (panelMode === 'orbit' && !hasOrbit) setPanelMode('chart');
    prev.dock = hasDock;
    prev.pad = hasPad;
    prev.orbit = hasOrbit;
  }, [hasDock, hasPad, hasOrbit, panelMode]);

  const displayingAssist =
    (panelMode === 'dock' && hasDock) ||
    (panelMode === 'pad' && hasPad) ||
    (panelMode === 'orbit' && hasOrbit);
  const dockingCaptureActive = useDockingCaptureActive();
  useDockPermissionVersion();
  useMinimapKeyboardClose(onClose, fullscreen, setFullscreen);
  useExitFullscreenOnAssist(displayingAssist, fullscreen, setFullscreen);
  useMinimapOverlayFlag(fullscreen || displayingAssist);

  const {
    dockingAssistProjection,
    dockingReadouts,
    orbitAssistProjection,
    orbitAssistReadouts,
    visibleMarkers,
    chartNavLine,
    chartVelocityPath,
    orbitRings,
    scannerRings,
  } = useMinimapProjections({
    containerRef,
    activeChartRef,
    fullscreen,
    showSolarSystem,
    zoomHalfSpan,
    panCenter,
    markers,
    vectorWorld,
    dockingAssist,
    orbitAssist,
  });

  const dockPermissionRequired = Boolean(dockingAssist?.stationId);
  const dockPermissionGranted = hasDockPermission(dockingAssist?.stationId ?? null);

  const chartPanel = (
    <StarChartPanel
      orbitRings={orbitRings}
      scannerRings={scannerRings}
      chartNavLine={chartNavLine}
      chartVelocityPath={chartVelocityPath}
      visibleMarkers={visibleMarkers}
      shipHeadingDeg={shipHeadingDeg}
      setHoverCard={setHoverCard}
      hoverCard={hoverCard}
    />
  );

  const fullscreenOverlay =
    fullscreen && !displayingAssist
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

  const overlayModeClass =
    panelMode === 'dock' || panelMode === 'pad'
      ? ' sandbox-map-overlay--docking'
      : panelMode === 'orbit'
        ? ' sandbox-map-overlay--orbit'
        : '';

  return (
    <>
      <div
        className={`sandbox-map-overlay mech-chart${isDragging && !fullscreen ? ' sandbox-map-overlay--dragging' : ''}${overlayModeClass}`}
      >
        <div className="mech-chart-bezel">
          <div className="mech-chart-tabs">
            <button
              type="button"
              className={`event-log-tab${panelMode === 'chart' ? ' event-log-tab--active' : ''}`}
              onClick={() => setPanelMode('chart')}
            >
              MAP
            </button>
            {hasDock && (
              <button
                type="button"
                className={`event-log-tab${panelMode === 'dock' ? ' event-log-tab--active' : ''}`}
                onClick={() => setPanelMode('dock')}
              >
                DOCK
              </button>
            )}
            {hasPad && (
              <button
                type="button"
                className={`event-log-tab${panelMode === 'pad' ? ' event-log-tab--active' : ''}`}
                onClick={() => setPanelMode('pad')}
              >
                PAD
              </button>
            )}
            {hasOrbit && (
              <button
                type="button"
                className={`event-log-tab${panelMode === 'orbit' ? ' event-log-tab--active' : ''}`}
                onClick={() => setPanelMode('orbit')}
              >
                ORB
              </button>
            )}
            <div className="mech-chart-tab-actions">
              {!displayingAssist && showSolarSystem ? (
                <button
                  type="button"
                  className="event-log-tab"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={openFullscreen}
                  title="Open full-screen star chart"
                >
                  FLL
                </button>
              ) : null}
              <button
                type="button"
                className={`event-log-tab${followShip ? ' event-log-tab--active' : ''}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={toggleFollowShip}
                title={followShip ? 'Auto-follow ship enabled' : 'Auto-follow ship disabled'}
                disabled={displayingAssist}
              >
                CTR
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
            {(panelMode === 'dock' || panelMode === 'pad') && dockingAssist ? (
              <DockingAssistPanel
                dockingAssist={dockingAssist}
                dockingAssistProjection={dockingAssistProjection}
                dockingReadouts={dockingReadouts}
                dockingCaptureActive={dockingCaptureActive}
                dockPermissionRequired={dockPermissionRequired}
                dockPermissionGranted={dockPermissionGranted}
              />
            ) : panelMode === 'orbit' && orbitAssist ? (
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
