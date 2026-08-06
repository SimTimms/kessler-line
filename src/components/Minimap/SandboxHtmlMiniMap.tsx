import { useCallback, useState } from 'react';
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

  const assistActive = Boolean(dockingAssist || orbitAssist);
  const dockingCaptureActive = useDockingCaptureActive();
  useDockPermissionVersion();
  useMinimapKeyboardClose(onClose, fullscreen, setFullscreen);
  useExitFullscreenOnAssist(assistActive, fullscreen, setFullscreen);
  useMinimapOverlayFlag(fullscreen || assistActive);

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

  const handleRequestDockPermissionFromAssist = () => {
    const stationId = dockingAssist?.stationId;
    if (!stationId) return;
    window.dispatchEvent(
      new CustomEvent(EVENT_OPEN_COMMS_CONTACT, {
        detail: { contactId: stationId },
      })
    );
  };

  const chartPanel = !assistActive ? (
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
                dockPermissionRequired={dockPermissionRequired}
                dockPermissionGranted={dockPermissionGranted}
                onRequestDockPermission={handleRequestDockPermissionFromAssist}
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
