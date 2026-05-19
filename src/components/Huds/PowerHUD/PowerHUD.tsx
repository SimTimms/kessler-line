import { useEffect, useState } from 'react';
import { Zap, Shield, Droplets, Wind, Gauge, Activity, AlertTriangle, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  power,
  hullIntegrity,
  fuel,
  o2,
  shipAcceleration,
  getShipSpeedMps,
} from '../../../context/ShipState';
import { cargo, type CargoItem, reduceCargoItem } from '../../../context/Inventory';
import { triggerEject } from '../../../context/EjectEvent';
import './PowerHUD.css';
import {
  velocityLevel,
  gforceLevel,
  resourceLevel,
  levelToColor,
  type WarnLevel,
} from './PowerHUDHelpers';
import Cargo from './Cargo/Cargo';

interface StatDef {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  level: WarnLevel;
  group: 'orange' | 'blue';
}

export const POWER_HUD_ELEMENTS = {
  POWER: 'power',
  HULL: 'hull',
  PROPELLENT: 'propellant',
  O2: 'o2',
  VELOCITY: 'velocity',
  GFORCE: 'gforce',
  CREW_STATUS: 'crew-status',
  CARGO_CAPACITY: 'cargo-capacity',
} as const;

function StatCell({
  stat,
  disabled,
  highlight,
}: {
  stat: StatDef;
  disabled: boolean;
  highlight: boolean;
}) {
  const Icon = stat.icon;
  return (
    <div className={`flex-column ${disabled ? 'hud-button-disabled' : ''} ${stat.group}`}>
      <div className="power-hud-label">{stat.label}</div>
      <div
        className={`hud-btn ${highlight ? 'hud-btn-highlight' : ''}`}
        style={{ color: levelToColor(stat.level) }}
      >
        <Icon size={13} strokeWidth={1.5} />
        {stat.value}
        <WarningBadge level={stat.level} />
      </div>
    </div>
  );
}

function WarningBadge({ level }: { level: WarnLevel }) {
  if (!level) return null;
  const color = level === 'red' ? 'rgba(255, 40, 140, 0.85)' : '#ffaa00';
  return (
    <>
      <AlertTriangle size={11} strokeWidth={2} style={{ color }} />
      {level === 'red' && (
        <span style={{ color, fontSize: '10px', letterSpacing: '0.08em' }}>WARNING</span>
      )}
    </>
  );
}

export interface EjectState {
  item: CargoItem;
  step: 'confirm' | 'quantity';
  amount: number;
}

export default function PowerHUD({
  disableElements,
  focusElements,
}: {
  disableElements: string[];
  focusElements: string[];
}) {
  const [displayPower, setDisplayPower] = useState(100);
  const [displayHull, setDisplayHull] = useState(100);
  const [displayFuel, setDisplayFuel] = useState(100);
  const [displayO2, setDisplayO2] = useState(100);
  const [displayGForce, setDisplayGForce] = useState(0);
  const [displayVelocity, setDisplayVelocity] = useState(0);
  const [displayCargo, setDisplayCargo] = useState<CargoItem[]>([]);
  const [ejectState, setEjectState] = useState<EjectState | null>(null);

  useEffect(() => {
    let rafId: number;
    const update = () => {
      setDisplayPower(Math.floor(power));
      setDisplayHull(Math.floor(hullIntegrity));
      setDisplayFuel(Math.floor(fuel));
      setDisplayO2(Math.floor(o2));
      setDisplayGForce((shipAcceleration.current * 10) / 9.81);
      setDisplayVelocity(getShipSpeedMps());
      setDisplayCargo(cargo.length > 0 ? [...cargo] : []);
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const orangeStats: StatDef[] = [
    {
      id: POWER_HUD_ELEMENTS.VELOCITY,
      label: 'VELOCITY',
      icon: Activity,
      value: `${displayVelocity.toFixed(1)} m/s`,
      level: velocityLevel(displayVelocity),
      group: 'orange',
    },
    {
      id: POWER_HUD_ELEMENTS.GFORCE,
      label: 'G-FORCE',
      icon: Gauge,
      value: `${displayGForce.toFixed(1)}g`,
      level: gforceLevel(displayGForce),
      group: 'orange',
    },
  ];

  const blueStats: StatDef[] = [
    {
      id: POWER_HUD_ELEMENTS.POWER,
      label: 'POWER',
      icon: Zap,
      value: `${displayPower}`,
      level: resourceLevel(displayPower),
      group: 'blue',
    },
    {
      id: POWER_HUD_ELEMENTS.HULL,
      label: 'HULL INTEGRITY',
      icon: Shield,
      value: `${displayHull}`,
      level: resourceLevel(displayHull),
      group: 'blue',
    },
    {
      id: POWER_HUD_ELEMENTS.PROPELLENT,
      label: 'PROPELLENT',
      icon: Droplets,
      value: `${displayFuel}`,
      level: resourceLevel(displayFuel),
      group: 'blue',
    },
    {
      id: POWER_HUD_ELEMENTS.O2,
      label: 'O2',
      icon: Wind,
      value: `${displayO2}`,
      level: resourceLevel(displayO2),
      group: 'blue',
    },
  ];

  return (
    <>
      <div className="power-hud" aria-live="polite">
        {orangeStats.map((s) => (
          <StatCell
            key={s.id}
            stat={s}
            disabled={disableElements.includes(s.id)}
            highlight={focusElements.includes(s.id)}
          />
        ))}

        <div className="power-hud-divider"></div>
        <div className="power-hud-divider"></div>
        <div className="power-hud-divider"></div>

        <div
          className={`flex-column blue ${disableElements.includes(POWER_HUD_ELEMENTS.CREW_STATUS) ? 'hud-button-disabled' : ''}`}
        >
          <div className="power-hud-label">
            Crew <User size={14} strokeWidth={1.5} className="crew-icon--active" />
          </div>
          <div
            className={`hud-btn ${focusElements.includes(POWER_HUD_ELEMENTS.CREW_STATUS) ? 'hud-btn-highlight' : ''}`}
          >
            {([0, 1, 2] as const).map((i) => (
              <User
                key={i}
                size={14}
                strokeWidth={1.5}
                className={i === 0 ? 'crew-icon--active' : 'crew-icon--empty'}
              />
            ))}
          </div>
        </div>
        <div
          className={`flex-column blue ${disableElements.includes(POWER_HUD_ELEMENTS.CARGO_CAPACITY) ? 'hud-button-disabled' : ''}`}
        >
          <div className="power-hud-label">
            Cargo <div className=" power-hud-cargo-slot"> </div>
          </div>
          <div
            className={`hud-btn ${focusElements.includes(POWER_HUD_ELEMENTS.CARGO_CAPACITY) ? 'hud-btn-highlight' : ''}`}
          >
            {([0, 1, 2, 3] as const).map((i) => (
              <div
                key={i}
                className={`power-hud-cargo-slot${i === 0 ? ' power-hud-cargo-slot--filled' : ''}`}
              />
            ))}
          </div>
        </div>

        {blueStats.map((s) => (
          <StatCell
            key={s.id}
            stat={s}
            disabled={disableElements.includes(s.id)}
            highlight={focusElements.includes(s.id)}
          />
        ))}

        {displayCargo.length > 0 && (
          <>
            <div className="power-hud-divider">───────</div>
            <div className="power-hud-section">CARGO HOLD</div>
            {displayCargo.map((item) => (
              <button
                key={item.name}
                type="button"
                title="Click to eject"
                className="power-hud-cargo-item"
                onClick={() => setEjectState({ item, step: 'confirm', amount: item.quantity })}
              >
                {item.quantity}x {item.name.toUpperCase()}
              </button>
            ))}
          </>
        )}
      </div>

      {ejectState && (
        <Cargo
          ejectState={ejectState}
          setEjectState={setEjectState}
          triggerEject={triggerEject}
          reduceCargoItem={reduceCargoItem}
        />
      )}
    </>
  );
}
