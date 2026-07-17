import { type LucideIcon } from 'lucide-react';
import {
  getScannerAccentColorDim,
  getScannerAccentColorMuted,
  SCANNER_RANGE_MODE_ARIA,
  SCANNER_RANGE_MODE_LABELS,
  SCANNER_RANGE_ON_LEVELS,
  type ScannerPowerLevel,
} from '../../config/scanRanges';
import './HudButton.css';

export const HudButton = ({
  name,
  isActive,
  onClickEvent,
  icon: Icon,
  accentColor = '#00c8ff',
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
  void name;
  void Icon;
  const accentDim = getScannerAccentColorDim(accentColor);
  const accentMuted = getScannerAccentColorMuted(accentColor);

  return (
    <div className={`hud-btn ${highlight ? 'hud-btn-highlight' : ''} `}>
      <button
        className="hud-btn"
        disabled={disabled}
        onClick={() => {
          if (isActive) onClickEvent();
        }}
        style={{
          background: 'rgba(60,60,60,0)',
          color: isActive ? accentDim : '#ff4d4d',
          cursor: disabled ? 'default' : 'pointer',
          userSelect: 'none',
          outline: 'none',
          padding: 1,
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          fontSize: 12,
          minWidth: 18,
        }}
        aria-label="Off"
        aria-pressed={!isActive}
      >
        O
      </button>
      <div className="hud-btn-levels" role="group" aria-label="Range">
        {SCANNER_RANGE_ON_LEVELS.map((level: ScannerPowerLevel) => {
          const selected = power === level;
          const flashing = flashingPipLevel === level && flashingPipOn;
          return (
            <button
              key={level}
              type="button"
              className={`hud-btn-range${selected || flashing ? ' hud-btn-range--on' : ''}`}
              disabled={disabled}
              aria-label={SCANNER_RANGE_MODE_ARIA[level]}
              aria-pressed={selected}
              onClick={() => {
                if (!disabled) onPowerChange(level);
              }}
              style={{
                color: selected || flashing ? accentColor : isActive ? accentMuted : accentDim,
                borderColor: selected || flashing ? accentColor : 'transparent',
                boxShadow: flashing
                  ? `0 0 8px color-mix(in srgb, ${accentColor} 65%, transparent)`
                  : 'none',
              }}
            >
              {SCANNER_RANGE_MODE_LABELS[level]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
