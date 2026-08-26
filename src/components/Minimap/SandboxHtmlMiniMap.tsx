import { useCallback, useEffect, useRef, useState } from 'react';
import { hasDockPermission } from '../../context/DockPermissionState';
import {
  minimapViewportEnabled,
  minimapViewportBounds,
  minimapViewportZoomHalfSpan,
  minimapViewportPanCenter,
} from '../../context/MinimapViewportState';
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
  showSolarSystem?: boolean;
}

export default function SandboxHtmlMiniMap({ showSolarSystem = true }: SandboxHtmlMiniMapProps) {
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);
  const clearHoverCard = useCallback(() => setHoverCard(null), []);

  const {
    containerRef,
    overlayRef,
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

  // ── 3D minimap viewport sync ──────────────────────────────────────────
  const chartActive = panelMode === 'chart' && !displayingAssist;

  // Write zoom/pan to shared refs every render so the Canvas renderer stays in sync.
  minimapViewportZoomHalfSpan.current = zoomHalfSpan;
  minimapViewportPanCenter.current = panCenter;

  // Drive the enabled flag and continuously update screen-space bounds via RAF.
  useEffect(() => {
    if (!chartActive) {
      minimapViewportEnabled.current = false;
      return;
    }

    minimapViewportEnabled.current = true;

    let rafId = 0;
    const syncBounds = () => {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const b = minimapViewportBounds.current;
        b.left = rect.left;
        b.top = rect.top;
        b.width = rect.width;
        b.height = rect.height;
      }
      rafId = requestAnimationFrame(syncBounds);
    };
    rafId = requestAnimationFrame(syncBounds);

    return () => {
      minimapViewportEnabled.current = false;
      cancelAnimationFrame(rafId);
    };
  }, [chartActive, fullscreen, containerRef]);

  const dockingCaptureActive = useDockingCaptureActive();
  useDockPermissionVersion();
  useMinimapKeyboardClose(fullscreen, setFullscreen);
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

  // Compute grid background-position so the grid is anchored in world space.
  // Without this the grid is fixed in screen space, so when followShip keeps
  // the ship centred the grid appears to move with the ship.
  const gridStyle = (chartEl: HTMLElement | null): React.CSSProperties | undefined => {
    if (!chartEl) return undefined;
    const h = chartEl.getBoundingClientRect().height;
    const scale = h / (2 * zoomHalfSpan);
    return { backgroundPosition: `${-panCenter.x * scale}px ${-panCenter.z * scale}px` };
  };

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

  const overlayModeClass =
    panelMode === 'dock' || panelMode === 'pad'
      ? ' sandbox-map-overlay--docking'
      : panelMode === 'orbit'
        ? ' sandbox-map-overlay--orbit'
        : '';

  return (
    <div
      ref={overlayRef}
      className={`sandbox-map-overlay mech-chart${fullscreen ? ' sandbox-map-overlay--fullscreen' : ''}${isDragging ? ' sandbox-map-overlay--dragging' : ''}${overlayModeClass}`}
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
            {!displayingAssist && showSolarSystem && !fullscreen ? (
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
            {fullscreen ? (
              <button
                type="button"
                className="event-log-tab"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={closeFullscreen}
                title="Exit full screen (Esc)"
              >
                CLS
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
          className={`mech-chart-crt${chartActive ? ' mech-chart-crt--3d' : ''}`}
          onWheel={fullscreen ? undefined : handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          <div className="sandbox-map-grid" style={gridStyle(containerRef.current)} />
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
          ) : (
            chartPanel
          )}
        </div>
      </div>
    </div>
  );
}
