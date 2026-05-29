import { type LucideIcon } from 'lucide-react';
import {
  getScannerAccentColorDim,
  getScannerAccentColorMuted,
} from '../../config/scanRanges';
import './HudButton.css';

const LEVELS = [1, 2, 3, 4, 5] as const;

export const HudButton = ({
  name,
  isActive,
  onClickEvent,
  icon: Icon,
  accentColor = '#00cfff',
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
  accentColor?: string;
  power: number;
  highlight?: boolean;
  onPowerChange: (level: number) => void;
  disabled?: boolean;
  flashingPipLevel?: number;
  flashingPipOn?: boolean;
}) => {
  const accentDim = getScannerAccentColorDim(accentColor);
  const accentMuted = getScannerAccentColorMuted(accentColor);

  return (
  <div className={`hud-btn ${highlight ? 'hud-btn-highlight' : ''} `}>
    <button
      className={`hud-btn `}
      disabled={disabled}
      onClick={onClickEvent}
      style={{
        background: isActive ? 'rgba(0,200,255,0.0)' : 'rgba(60,60,60,0)',
        color: isActive ? accentColor : accentDim,
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
              background: lit || flashing ? accentColor : isActive ? accentMuted : accentDim,
              border: 'none',
              boxShadow: flashing ? `0 0 8px color-mix(in srgb, ${accentColor} 65%, transparent)` : 'none',
              transition: 'background 0.12s',
            }}
          />
        );
      })}
    </div>
  </div>
  );
};
