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
}: {
  name: string;
  isActive: boolean;
  onClickEvent: () => void;
  icon: LucideIcon;
  power: number;
  highlight?: boolean;
  onPowerChange: (level: number) => void;
}) => (
  <div
    className={highlight ? 'hud-btn-highlight' : undefined}
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      width: 100,
    }}
  >
    <button
      className="hud-btn"
      onClick={onClickEvent}
      style={{
        background: isActive ? 'rgba(0,200,255,0.0)' : 'rgba(60,60,60,0)',
        color: isActive ? '#00cfff' : '#888',
        cursor: 'pointer',
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
        return (
          <div
            key={d}
            onClick={() => onPowerChange(d)}
            style={{
              width: 7,
              height: 7,
              background: lit ? '#00cfff' : '#1e1e1e',
              cursor: 'pointer',
              border: `1px solid ${lit ? 'rgba(0,207,255,0.55)' : 'rgba(100,100,100,0.35)'}`,
              transition: 'background 0.12s, border-color 0.12s',
            }}
          />
        );
      })}
    </div>
    <div style={{ fontSize: 12, color: '#888' }}>{name}</div>
  </div>
);
