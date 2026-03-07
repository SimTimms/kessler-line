import { type LucideIcon } from 'lucide-react';

const LEVELS = [1, 2, 3, 4, 5] as const;

export const HudButton = ({
  isActive,
  onClickEvent,
  icon: Icon,
  power,
  onPowerChange,
}: {
  isActive: boolean;
  onClickEvent: () => void;
  icon: LucideIcon;
  power: number;
  onPowerChange: (level: number) => void;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <button
      className="hud-btn"
      onClick={onClickEvent}
      style={{
        padding: '6px 14px',
        background: isActive ? 'rgba(0,200,255,0.05)' : 'rgba(60,60,60,0.1)',
        color: isActive ? '#00cfff' : '#888',
        borderRadius: 0,
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',
        width: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
      {LEVELS.map((d) => {
        const lit = d <= power && power > 1;
        return (
          <div
            key={d}
            onClick={() => onPowerChange(d)}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: lit ? '#00cfff' : '#1e1e1e',
              cursor: 'pointer',
              border: `1px solid ${lit ? 'rgba(0,207,255,0.55)' : 'rgba(100,100,100,0.35)'}`,
              transition: 'background 0.12s, border-color 0.12s',
            }}
          />
        );
      })}
    </div>
  </div>
);
