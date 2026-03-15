import { useState } from 'react';
import {
  cascadePhase,
  setCascadePhase,
  chatterState,
  radioChatterMessage,
  type CascadePhase,
} from '../../context/CinematicState';
import {
  RADIO_CHATTER_LINES,
  RADIO_CHATTER_CASCADE_LINES,
  RADIO_CHATTER_POST_CASCADE_LINES,
} from '../../narrative';

const PHASES: CascadePhase[] = ['pre', 'during', 'post'];
const LABELS = ['PRE', 'CASCADE', 'POST'];
const CHATTER_ARRAYS = [RADIO_CHATTER_LINES, RADIO_CHATTER_CASCADE_LINES, RADIO_CHATTER_POST_CASCADE_LINES];

export default function DebugCascadePanel() {
  const [value, setValue] = useState<number>(() => PHASES.indexOf(cascadePhase.current));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = Number(e.target.value);
    setValue(idx);
    setCascadePhase(PHASES[idx]);
    chatterState.lines = CHATTER_ARRAYS[idx];
    chatterState.index = 0;
    radioChatterMessage.current = CHATTER_ARRAYS[idx][0];
  }

  return (
    <div className="debug-cascade-panel">
      <div className="debug-cascade-label">DEBUG: CASCADE PHASE</div>
      <div className="debug-cascade-track">
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={value}
          onChange={handleChange}
          className="debug-cascade-slider"
        />
        <div className="debug-cascade-ticks">
          {LABELS.map((l, i) => (
            <span key={l} style={{ color: i === value ? '#fff' : 'rgba(255,255,255,0.35)' }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
