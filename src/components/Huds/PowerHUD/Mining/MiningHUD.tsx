import { useEffect, useState } from 'react';
import {
  beginMining,
  EVENT_MINING_UI_CHANGED,
  getMiningUi,
  type MiningUiState,
} from '../../../../context/MiningState';
import { MINING_CYCLE_SECONDS } from '../../../../config/miningConfig';
import './MiningHUD.css';

const PROGRESS_SEGMENTS = 24;

export default function MiningHUD() {
  const [ui, setUi] = useState<MiningUiState>(() => getMiningUi());

  useEffect(() => {
    const onChange = () => setUi(getMiningUi());
    window.addEventListener(EVENT_MINING_UI_CHANGED, onChange);
    return () => window.removeEventListener(EVENT_MINING_UI_CHANGED, onChange);
  }, []);

  if (!ui.clampActive) return null;

  const litCount = Math.round(ui.progress * PROGRESS_SEGMENTS);
  const secondsLeft = Math.max(0, Math.ceil((1 - ui.progress) * MINING_CYCLE_SECONDS));

  return (
    <div className="mining-hud" aria-label="Mining module">
      <div className="mining-hud__header">
        <span className="mining-hud__title">Mining</span>
        <span className="mining-hud__status">{ui.mining ? 'EXTRACT' : 'CLAMP'}</span>
      </div>

      {!ui.mining ? (
        <button type="button" className="mining-hud__begin" onClick={() => beginMining()}>
          Begin mining
        </button>
      ) : (
        <>
          <div
            className="mining-hud__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ui.progress * 100)}
            aria-label="Mining extraction progress"
          >
            {Array.from({ length: PROGRESS_SEGMENTS }, (_, i) => (
              <span
                key={i}
                className={`mining-hud__seg${i < litCount ? ' mining-hud__seg--lit' : ''}`}
              />
            ))}
          </div>
          <div className="mining-hud__meta">
            <span>Ore cycle</span>
            <span className="mining-hud__eta">{secondsLeft}s</span>
          </div>
        </>
      )}
    </div>
  );
}
