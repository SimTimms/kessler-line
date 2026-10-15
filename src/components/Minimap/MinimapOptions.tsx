import type { PanelMode } from './SandboxHtmlMiniMap';

interface MinimapOptionsProps {
  panelMode: PanelMode;
  setPanelMode: (mode: PanelMode) => void;
  hasDock: boolean;
  hasPad: boolean;
  hasOrbit: boolean;
  fullscreen: boolean;
  followShip: boolean;
  openFullscreen: () => void;
  closeFullscreen: () => void;
  displayingAssist: boolean;
  showSolarSystem: boolean;
  toggleFollowShip: () => void;
}
export default function MinimapOptions({
  panelMode,
  setPanelMode,
  hasDock,
  hasPad,
  hasOrbit,
  fullscreen,
  followShip,
  openFullscreen,
  closeFullscreen,
  displayingAssist,
  showSolarSystem,
  toggleFollowShip,
}: MinimapOptionsProps) {
  return (
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
  );
}
