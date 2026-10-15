import { useCallback, useEffect, useRef, useState } from 'react';
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
import MinimapOptions from './MinimapOptions';
import './SandboxHtmlMiniMap.css';

export type PanelMode = 'chart' | 'dock' | 'pad' | 'orbit';

interface SandboxHtmlMiniMapProps {
  showSolarSystem?: boolean;
  showOptions?: boolean;
  fullWidth?: boolean;
  defaultMode?: PanelMode;
}

export default function SandboxHtmlMiniMap({
  showSolarSystem = true,
  showOptions = true,
  fullWidth = false,
  defaultMode = 'chart',
}: SandboxHtmlMiniMapProps) {
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
  });

  // Panel toggle — lets the user switch between chart, dock, pad, and orbit views.
  const [panelMode, setPanelMode] = useState<PanelMode>(defaultMode);

  const hasDock = Boolean(dockingAssist && dockingAssist.captureMode === 'nose');
  const hasPad = Boolean(dockingAssist && dockingAssist.captureMode === 'hover');
  const hasOrbit = Boolean(orbitAssist);

  // Auto-switch when an assist panel appears; fall back to chart when data disappears.
  const prevAssistRef = useRef({ dock: false, pad: false, orbit: false });
  useEffect(() => {
    if (defaultMode) {
      setPanelMode(defaultMode);
      return;
    }
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

  // In chart view the CRT background is transparent (.mech-chart-crt--3d).
  const chartActive = panelMode === 'chart' && !displayingAssist;

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
      className={`${fullWidth ? ' sandbox-map-overlay--full-width' : 'sandbox-map-overlay mech-chart'}${fullscreen ? ' sandbox-map-overlay--fullscreen' : ''}${isDragging ? ' sandbox-map-overlay--dragging' : ''}${overlayModeClass}`}
    >
      <div className="mech-chart-bezel">
        {showOptions && (
          <MinimapOptions
            panelMode={panelMode}
            setPanelMode={setPanelMode}
            hasDock={hasDock}
            hasPad={hasPad}
            hasOrbit={hasOrbit}
            fullscreen={fullscreen}
            followShip={followShip}
            openFullscreen={openFullscreen}
            closeFullscreen={closeFullscreen}
            displayingAssist={displayingAssist}
            showSolarSystem={showSolarSystem}
            toggleFollowShip={toggleFollowShip}
          />
        )}
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
