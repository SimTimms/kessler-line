import { type LucideIcon } from 'lucide-react';

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
  <div
    className={highlight ? 'hud-btn-highlight' : undefined}
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      width: 100,
      opacity: disabled ? 0.3 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}
  >
    <button
      className="hud-btn"
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
              cursor: disabled ? 'default' : 'pointer',
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
    <div style={{ fontSize: 12, color: '#888' }}>{name}</div>
  </div>
);
