import { useEffect, useState } from 'react';
import { Zap, Shield, Droplets, Wind, Gauge, Activity, AlertTriangle, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  power,
  hullIntegrity,
  fuel,
  o2,
  shipCrew,
  shipAcceleration,
  getShipSpeedMps,
} from '../../../context/ShipState';
import { SHIP_CREW_CAPACITY } from '../../../config/dockTransferConfig';
import { cargo, type CargoItem, reduceCargoItem } from '../../../context/Inventory';
import { triggerEject } from '../../../context/EjectEvent';
import './PowerHUD.css';
import '../HelmetHUD/HelmetHUD.css';
import {
  velocityLevel,
  gforceLevel,
  resourceLevel,
  levelToColor,
  formatResourceRate,
  type WarnLevel,
} from './PowerHUDHelpers';
import { resourceRateRefs } from '../../../context/ResourceRates';
import Cargo from './Cargo/Cargo';
import { VentResourceModal } from './VentResourceModal';
import { canVentResource } from '../../../context/ventResource';
import type { VentResourceKind } from '../../../config/ventResourceConfig';

interface StatDef {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  ratePerSec: number;
  level: WarnLevel;
  group: 'orange' | 'blue';
}

export const MOVEMENT_HUD_ELEMENTS = {
  VELOCITY: 'velocity',
  GFORCE: 'gforce',
} as const;

export const INVENTORY_HUD_ELEMENTS = {
  CREW_STATUS: 'crew-status',
  CARGO_CAPACITY: 'cargo-capacity',
} as const;

export const HULL_HUD_ELEMENTS = {
  HULL: 'hull',
} as const;

export const RESOURCE_HUD_ELEMENTS = {
  POWER: 'power',
  PROPELLENT: 'propellant',
  O2: 'o2',
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
  const rateLabel = formatResourceRate(stat.ratePerSec);
  return (
    <div className={`flex-column ${disabled ? 'hud-button-disabled' : ''} ${stat.group}`}>
      <div className="power-hud-label">{stat.label}</div>
      <div
        className={`hud-btn ${highlight ? 'hud-btn-highlight' : ''}`}
        style={{ color: levelToColor(stat.level) }}
      >
        <Icon size={13} strokeWidth={1.5} />
        <span className="power-hud-value">{stat.value}</span>
        {rateLabel && (
          <span
            className={`power-hud-rate ${stat.ratePerSec > 0 ? 'power-hud-rate--gain' : 'power-hud-rate--loss'}`}
            title="per second"
          >
            {rateLabel}
          </span>
        )}
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

type PowerHUDLayout = 'classic' | 'helmet';

interface VitalBarDef {
  id: string;
  tag: string;
  pct: number;
  display: string;
  ratePerSec: number;
  level: WarnLevel;
}

const VITAL_SEGMENT_COUNT = 5;

function litSegmentCount(pct: number): number {
  return Math.max(0, Math.min(VITAL_SEGMENT_COUNT, Math.round((pct / 100) * VITAL_SEGMENT_COUNT)));
}

function CrewIcons({ count, size }: { count: number; size: number }) {
  return (
    <>
      {Array.from({ length: SHIP_CREW_CAPACITY }, (_, i) => (
        <User
          key={i}
          size={size}
          strokeWidth={1.5}
          className={i < count ? 'crew-icon--active' : 'crew-icon--empty'}
        />
      ))}
    </>
  );
}

function ventKindForBarId(barId: string): VentResourceKind | null {
  switch (barId) {
    case RESOURCE_HUD_ELEMENTS.PROPELLENT:
      return 'fuel';
    case RESOURCE_HUD_ELEMENTS.O2:
      return 'o2';
    case RESOURCE_HUD_ELEMENTS.POWER:
      return 'power';
    default:
      return null;
  }
}

function HelmetVitalsView({
  bars,
  disableElements,
  focusElements,
  showCrew,
  crewCount,
  showCargo,
  onVentRequest,
}: {
  bars: VitalBarDef[];
  disableElements: string[];
  focusElements: string[];
  showCrew: boolean;
  crewCount: number;
  showCargo: boolean;
  onVentRequest: (kind: VentResourceKind) => void;
}) {
  const requestVent = (kind: VentResourceKind) => {
    if (canVentResource(kind)) onVentRequest(kind);
  };
  return (
    <div className="helmet-vitals" aria-live="polite">
      {bars.map((bar) => {
        const disabled = disableElements.includes(bar.id);
        const highlight = focusElements.includes(bar.id);
        const rateLabel = formatResourceRate(bar.ratePerSec);
        const valClass =
          bar.level === 'red'
            ? 'helmet-vital-val--crit'
            : bar.level === 'orange'
              ? 'helmet-vital-val--warn'
              : '';
        const segLevelClass =
          bar.level === 'red' ? 'helmet-seg--crit' : bar.level === 'orange' ? 'helmet-seg--warn' : '';
        const litCount = litSegmentCount(bar.pct);
        const ventKind = ventKindForBarId(bar.id);
        const ventable = ventKind !== null && !disabled && canVentResource(ventKind);
        return (
          <div
            key={bar.id}
            role={ventable ? 'button' : undefined}
            tabIndex={ventable ? 0 : undefined}
            className={`helmet-vital${disabled ? ' helmet-vital--disabled' : ''}${highlight ? ' helmet-vital--highlight' : ''}${ventable ? ' helmet-vital--ventable' : ''}`}
            title={ventable ? `${bar.tag} — click to vent` : bar.tag}
            onClick={ventable && ventKind ? () => requestVent(ventKind) : undefined}
            onKeyDown={
              ventable && ventKind
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      requestVent(ventKind);
                    }
                  }
                : undefined
            }
          >
            <span
              className={`helmet-vital-rate${rateLabel ? '' : ' helmet-vital-rate--empty'}${rateLabel && bar.ratePerSec > 0 ? ' helmet-vital-rate--gain' : ''}`}
              aria-hidden={!rateLabel}
            >
              {rateLabel ?? '\u00a0'}
            </span>
            <span className={`helmet-vital-val ${valClass}`}>{bar.display}</span>
            <div className="helmet-vital-segments" aria-hidden>
              {Array.from({ length: VITAL_SEGMENT_COUNT }, (_, i) => {
                const tierFromBottom = i + 1;
                const lit = tierFromBottom <= litCount;
                return (
                  <div
                    key={tierFromBottom}
                    className={`helmet-seg helmet-seg--v${lit ? ' helmet-seg--lit' : ''}${lit ? ` ${segLevelClass}` : ''}`}
                  />
                );
              })}
            </div>
            <span className="helmet-vital-tag">{bar.tag}</span>
          </div>
        );
      })}
      {(showCrew || showCargo) && (
        <div className="helmet-vitals-meta">
          {showCrew && (
            <div
              role={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CREW_STATUS) &&
                canVentResource('crew')
                  ? 'button'
                  : undefined
              }
              tabIndex={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CREW_STATUS) &&
                canVentResource('crew')
                  ? 0
                  : undefined
              }
              className={`helmet-vitals-crew${disableElements.includes(INVENTORY_HUD_ELEMENTS.CREW_STATUS) ? ' helmet-vital--disabled' : ''}${!disableElements.includes(INVENTORY_HUD_ELEMENTS.CREW_STATUS) && canVentResource('crew') ? ' helmet-vital--ventable' : ''}`}
              title={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CREW_STATUS) && canVentResource('crew')
                  ? 'Crew — click to vent'
                  : undefined
              }
              onClick={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CREW_STATUS)
                  ? () => requestVent('crew')
                  : undefined
              }
              onKeyDown={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CREW_STATUS) &&
                canVentResource('crew')
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        requestVent('crew');
                      }
                    }
                  : undefined
              }
            >
              <CrewIcons count={crewCount} size={11} />
            </div>
          )}
          {showCargo && (
            <div
              role={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY) &&
                canVentResource('cargo')
                  ? 'button'
                  : undefined
              }
              tabIndex={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY) &&
                canVentResource('cargo')
                  ? 0
                  : undefined
              }
              className={`helmet-vitals-cargo${disableElements.includes(INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY) ? ' helmet-vital--disabled' : ''}${!disableElements.includes(INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY) && canVentResource('cargo') ? ' helmet-vital--ventable' : ''}`}
              title={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY) &&
                canVentResource('cargo')
                  ? 'Cargo — click to vent'
                  : undefined
              }
              onClick={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY)
                  ? () => requestVent('cargo')
                  : undefined
              }
              onKeyDown={
                !disableElements.includes(INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY) &&
                canVentResource('cargo')
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        requestVent('cargo');
                      }
                    }
                  : undefined
              }
            >
              {([0, 1, 2, 3] as const).map((i) => (
                <div
                  key={i}
                  className={`power-hud-cargo-slot${i === 0 ? ' power-hud-cargo-slot--filled' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PowerHUD({
  disableElements,
  focusElements,
  layout = 'classic',
}: {
  disableElements: string[];
  focusElements: string[];
  layout?: PowerHUDLayout;
}) {
  const [displayPower, setDisplayPower] = useState(100);
  const [displayHull, setDisplayHull] = useState(100);
  const [displayFuel, setDisplayFuel] = useState(100);
  const [displayO2, setDisplayO2] = useState(100);
  const [displayGForce, setDisplayGForce] = useState(0);
  const [displayVelocity, setDisplayVelocity] = useState(0);
  const [displayCargo, setDisplayCargo] = useState<CargoItem[]>([]);
  const [displayCrew, setDisplayCrew] = useState(() => Math.floor(shipCrew));
  const [ejectState, setEjectState] = useState<EjectState | null>(null);
  const [ventKind, setVentKind] = useState<VentResourceKind | null>(null);

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
      setDisplayCrew(Math.floor(shipCrew));
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const orangeStats: StatDef[] = [
    {
      id: MOVEMENT_HUD_ELEMENTS.VELOCITY,
      label: 'VELOCITY',
      icon: Activity,
      value: `${displayVelocity.toFixed(1)} m/s`,
      ratePerSec: 0,
      level: velocityLevel(displayVelocity),
      group: 'orange',
    },
    /*
    {
      id: MOVEMENT_HUD_ELEMENTS.GFORCE,
      label: 'G-FORCE',
      icon: Gauge,
      value: `${displayGForce.toFixed(1)}g`,
      ratePerSec: 0,
      level: gforceLevel(displayGForce),
      group: 'orange',
    },
    */
  ];

  const blueStats: StatDef[] = [
    {
      id: HULL_HUD_ELEMENTS.HULL,
      label: 'HULL INTEGRITY',
      icon: Shield,
      value: `${displayHull}`,
      ratePerSec: resourceRateRefs.hull.current,
      level: resourceLevel(displayHull),
      group: 'blue',
    },
    {
      id: RESOURCE_HUD_ELEMENTS.POWER,
      label: 'POWER',
      icon: Zap,
      value: `${displayPower}`,
      ratePerSec: resourceRateRefs.power.current,
      level: resourceLevel(displayPower),
      group: 'blue',
    },

    {
      id: RESOURCE_HUD_ELEMENTS.PROPELLENT,
      label: 'PROPELLENT',
      icon: Droplets,
      value: `${displayFuel}`,
      ratePerSec: resourceRateRefs.fuel.current,
      level: resourceLevel(displayFuel),
      group: 'blue',
    },
    {
      id: RESOURCE_HUD_ELEMENTS.O2,
      label: 'O2',
      icon: Wind,
      value: `${displayO2}`,
      ratePerSec: resourceRateRefs.o2.current,
      level: resourceLevel(displayO2),
      group: 'blue',
    },
  ];

  const helmetBars: VitalBarDef[] = [
    {
      id: HULL_HUD_ELEMENTS.HULL,
      tag: 'HUL',
      pct: displayHull,
      display: `${displayHull}`,
      ratePerSec: resourceRateRefs.hull.current,
      level: resourceLevel(displayHull),
    },
    {
      id: RESOURCE_HUD_ELEMENTS.POWER,
      tag: 'PWR',
      pct: displayPower,
      display: `${displayPower}`,
      ratePerSec: resourceRateRefs.power.current,
      level: resourceLevel(displayPower),
    },
    {
      id: RESOURCE_HUD_ELEMENTS.PROPELLENT,
      tag: 'FUEL',
      pct: displayFuel,
      display: `${displayFuel}`,
      ratePerSec: resourceRateRefs.fuel.current,
      level: resourceLevel(displayFuel),
    },
    {
      id: RESOURCE_HUD_ELEMENTS.O2,
      tag: 'O2',
      pct: displayO2,
      display: `${displayO2}`,
      ratePerSec: resourceRateRefs.o2.current,
      level: resourceLevel(displayO2),
    },
  ];

  if (layout === 'helmet') {
    return (
      <>
        <HelmetVitalsView
          bars={helmetBars}
          disableElements={disableElements}
          focusElements={focusElements}
          showCrew
          crewCount={displayCrew}
          showCargo
          onVentRequest={setVentKind}
        />
        {ventKind && <VentResourceModal kind={ventKind} onClose={() => setVentKind(null)} />}
        {displayCargo.length > 0 && (
          <div className="power-hud power-hud--cargo-flyout" aria-live="polite">
            <div className="power-hud-section">CARGO</div>
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
          </div>
        )}
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
          className={`flex-column blue ${disableElements.includes(INVENTORY_HUD_ELEMENTS.CREW_STATUS) ? 'hud-button-disabled' : ''}`}
        >
          <div className="power-hud-label">
            Crew <User size={14} strokeWidth={1.5} className="crew-icon--active" />
          </div>
          <div
            className={`hud-btn ${focusElements.includes(INVENTORY_HUD_ELEMENTS.CREW_STATUS) ? 'hud-btn-highlight' : ''}`}
          >
            <CrewIcons count={displayCrew} size={14} />
          </div>
        </div>
        <div
          className={`flex-column blue ${disableElements.includes(INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY) ? 'hud-button-disabled' : ''}`}
        >
          <div className="power-hud-label">
            Cargo <div className=" power-hud-cargo-slot"> </div>
          </div>
          <div
            className={`hud-btn ${focusElements.includes(INVENTORY_HUD_ELEMENTS.CARGO_CAPACITY) ? 'hud-btn-highlight' : ''}`}
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
