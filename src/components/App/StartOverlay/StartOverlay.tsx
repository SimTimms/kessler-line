import { memo, useCallback, useRef, useState } from 'react';
import { hasSlot, NARRATIVE_AUTOSAVE_SLOT, NARRATIVE_MANUAL_SLOT } from '../../../context/SaveStore';
import { GAME_MODES, type TutorialMenuSelection } from '../../../config/gameModes';
import { startSpaceAtmosphereAmbient } from '../../../sound/SoundManager';
import { TUTORIAL_MENU_ITEMS } from './tutorialMenuItems';
import { ASTEROID_DATA } from './asteroidData';

interface StartOverlayProps {
  onStart: () => void;
  onTutorialSelect: (selection: TutorialMenuSelection) => void;
  onNarrativeLoad: () => void;
}

const DISMISS_DELAY_MS = 1500;

const AMBIENT_ON_SELECT: ReadonlySet<TutorialMenuSelection> = new Set([
  GAME_MODES.modelConfig,
  GAME_MODES.shipNavigationConfig,
  GAME_MODES.shipConfig,
  GAME_MODES.inventoryConfig,
  GAME_MODES.salvageConfig,
  GAME_MODES.droneConfig,
  GAME_MODES.longDistanceTravelConfig,
  GAME_MODES.combatConfig,
  GAME_MODES.hudConfig,
  GAME_MODES.narrativeConfig,
]);

const StartOverlay = memo(function StartOverlay({
  onTutorialSelect,
  onNarrativeLoad,
}: StartOverlayProps) {
  const [dismissing, setDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNarrativeSave = hasSlot(NARRATIVE_MANUAL_SLOT) || hasSlot(NARRATIVE_AUTOSAVE_SLOT);

  const dismiss = useCallback((action: () => void) => {
    if (timerRef.current) return; // already dismissing
    setDismissing(true);
    timerRef.current = window.setTimeout(action, DISMISS_DELAY_MS);
  }, []);

  return (
    <div className={`start-overlay${dismissing ? ' dismissing' : ''}`}>
      <div className="start-panel">
        <div className="start-title-group">
          <img
            src="/textures/supervivencia.png"
            alt=""
            className="start-hero-ship"
            aria-hidden="true"
          />
          <div className="start-title">
            {'supervivencia'.split('').map((letter, i) => (
              <span key={i} className="kessler-letter">
                {letter}
              </span>
            ))}
          </div>
          <div className="start-subtitle">terca</div>
        </div>

        <div className="start-menu-slider">
          <div className="start-menu-page start-menu-page--root">
            {TUTORIAL_MENU_ITEMS.map((item) => {
              const handleClick = () => {
                const selection = item.selection;
                if (!selection) return;
                if (AMBIENT_ON_SELECT.has(selection)) {
                  startSpaceAtmosphereAmbient();
                }
                dismiss(() => onTutorialSelect(selection));
              };

              if (item.id === 'narrative-config') {
                return (
                  <div key={item.id} className="start-button-row">
                    <button type="button" className="start-button" onClick={handleClick}>
                      {item.label}
                    </button>
                    <button
                      type="button"
                      className={`start-button start-button--load${hasNarrativeSave ? '' : ' start-button--load-disabled'}`}
                      disabled={!hasNarrativeSave}
                      onClick={() => {
                        startSpaceAtmosphereAmbient();
                        dismiss(() => onNarrativeLoad());
                      }}
                    >
                      Load
                    </button>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`start-button${item.placeholder ? ' start-button--placeholder' : ''}`}
                  disabled={item.placeholder}
                  onClick={handleClick}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="start-asteroids" aria-hidden="true">
        {ASTEROID_DATA.map((style, i) => (
          <div key={i} className="start-asteroid" style={style} />
        ))}
      </div>
    </div>
  );
});

export default StartOverlay;
