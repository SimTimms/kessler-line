import { type LucideIcon } from 'lucide-react';
import './HudButton.css';

const LEVELS = [1, 2, 3, 4, 5] as const;

export const HudButton = ({
  name,
  isActive,
  onClickEvent,
  icon: Icon,
  power,
  highlight,
  onPowerChange,
  disabled = false,
  flashingPipLevel,
  flashingPipOn = false,
}: {
  name: string;
  isActive: boolean;
  onClickEvent: () => void;
  icon: LucideIcon;
  power: number;
  highlight?: boolean;
  onPowerChange: (level: number) => void;
  disabled?: boolean;
  flashingPipLevel?: number;
  flashingPipOn?: boolean;
}) => (
  <div className={`hud-btn ${highlight ? 'hud-btn-highlight' : ''} `}>
    <button
      className={`hud-btn `}
      disabled={disabled}
      onClick={onClickEvent}
      style={{
        background: isActive ? 'rgba(0,200,255,0.0)' : 'rgba(60,60,60,0)',
        color: isActive ? '#00cfff' : '#888',
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        outline: 'none !important',
        padding: 1,
      }}
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
    <div style={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
      {LEVELS.map((d) => {
        const lit = d <= power && power > 1;
        const flashing = flashingPipLevel === d && flashingPipOn;
        return (
          <div
            key={d}
            onClick={() => {
              if (!disabled) onPowerChange(d);
            }}
            style={{
              width: 7,
              height: 7,
              background: lit || flashing ? '#00cfff' : '#1e1e1e',
              border: `1px solid ${
                lit || flashing ? 'rgba(0,207,255,0.85)' : 'rgba(100,100,100,0.35)'
              }`,
              boxShadow: flashing ? '0 0 8px rgba(0, 200, 255, 0.65)' : 'none',
              transition: 'background 0.12s, border-color 0.12s',
            }}
          />
        );
      })}
    </div>
  </div>
);
