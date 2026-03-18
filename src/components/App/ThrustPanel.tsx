import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { thrustMultiplier, MAX_THRUST_MULTIPLIER } from '../../context/ShipState';

interface ThrustPanelProps {
  thrustLevel: number;
  setThrustLevel: Dispatch<SetStateAction<number>>;
}

const ThrustPanel = memo(function ThrustPanel({ thrustLevel, setThrustLevel }: ThrustPanelProps) {
  const isDanger = thrustLevel >= 2;

  return (
    <div
      className="thrust-panel"
      style={{
        position: 'fixed',
        bottom: 8,
        right: '140px',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'monospace',
        fontSize: 12,
        background: 'rgba(0,0,0,0.15)',
        backdropFilter: 'blur(10px)',
        padding: '8px 16px',
        border: `1px solid ${isDanger ? 'rgba(255,40,140,0.25)' : 'rgba(0,200,255,0.23)'}`,
        userSelect: 'none',
      }}
    >
      <div
        className="thrust-label-text"
        style={{
          color: isDanger ? 'rgba(255,40,140,0.85)' : '#00cfff',
          letterSpacing: 1,
          fontWeight: 'bold',
        }}
      >
        THRUST: {thrustLevel.toFixed(1)}x{isDanger ? '  ⚠ DANGER' : ''}
      </div>
      <input
        type="range"
        min={0.5}
        max={MAX_THRUST_MULTIPLIER}
        step={0.5}
        value={thrustLevel}
        className={isDanger ? 'thrust-slider danger' : 'thrust-slider'}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setThrustLevel(v);
          thrustMultiplier.current = v;
        }}
      />
      <div
        className="thrust-ticks"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: 200,
          color: '#666',
          fontSize: 10,
        }}
      >
        <span>0.5×</span>
        <span>{MAX_THRUST_MULTIPLIER}×</span>
      </div>
    </div>
  );
});

export default ThrustPanel;
