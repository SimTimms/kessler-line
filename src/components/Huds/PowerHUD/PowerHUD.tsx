import { useEffect, useState } from 'react';
import { Zap, Shield, Droplets, Wind, Activity, AlertTriangle, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  power,
  hullIntegrity,
  fuel,
  o2,
  shipCrew,
  ammo,
  ammoCapacity,
  getShipSpeedMps,
} from '../../../context/ShipState';
import { SHIP_CREW_CAPACITY } from '../../../config/dockTransferConfig';
import { cargo, type CargoItem, reduceCargoItem } from '../../../context/Inventory';
import { triggerEject } from '../../../context/EjectEvent';
import './PowerHUD.css';
import '../HelmetHUD/HelmetHUD.css';
import {
  velocityLevel,
  resourceLevel,
  levelToColor,
  formatResourceRate,
  type WarnLevel,
} from './PowerHUDHelpers';
import { resourceRateRefs } from '../../../context/ResourceRates';
import Cargo from './Cargo/Cargo';
import CargoHoldPanel from './Cargo/CargoHoldPanel';
import PartnerCargoHoldPanel from './Cargo/PartnerCargoHoldPanel';
import MiningHUD from './Mining/MiningHUD';
import { DOCK_TRANSFER_UI_CHANGED, getDockTransferUi } from '../../../context/DockTransferUi';
import '../../../context/MiningState';
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
  AMMO: 'ammo',
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

function ResourceBarTab({
  tag,
  display,
  ratePerSec,
  level,
  disabled,
  ventable,
  onClick,
}: {
  tag: string;
  display: string;
  ratePerSec: number;
  level: WarnLevel;
  disabled: boolean;
  ventable: boolean;
  onClick?: () => void;
}) {
  const rateLabel = formatResourceRate(ratePerSec);
  const levelClass =
    level === 'red'
      ? ' resource-bar-tab--crit'
      : level === 'orange'
        ? ' resource-bar-tab--warn'
        : '';

  return (
    <button
      type="button"
      className={`resource-bar-tab${disabled ? ' resource-bar-tab--disabled' : ''}`}
      title={ventable ? `${tag} — click to vent` : tag}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="resource-bar-tag">{tag}</span>
      <span className={`resource-bar-val${levelClass}`}>{display}</span>
      {tag !== 'HUL' && tag !== 'AMMO' && (
        <span
          className={`resource-bar-rate-power${ratePerSec > 0 ? ' resource-bar-rate--gain' : ' resource-bar-rate--loss'}`}
        >
          {rateLabel ? rateLabel : 0}
        </span>
      )}
    </button>
  );
}

function HelmetVitalsView({
  bars,
  disableElements,
  ammoCount,
  ammoMax,
  onVentRequest,
}: {
  bars: VitalBarDef[];
  disableElements: string[];
  ammoCount: number;
  ammoMax: number;
  onVentRequest: (kind: VentResourceKind) => void;
}) {
  const requestVent = (kind: VentResourceKind) => {
    if (canVentResource(kind)) onVentRequest(kind);
  };
  const ammoPct = ammoMax > 0 ? (ammoCount / ammoMax) * 100 : 0;
  const ammoLevel = resourceLevel(ammoPct);
  const ammoDisabled = disableElements.includes(RESOURCE_HUD_ELEMENTS.AMMO);
  return (
    <div className="resource-bar-tabs" aria-live="polite">
      {bars.map((bar) => {
        const disabled = disableElements.includes(bar.id);
        const ventKind = ventKindForBarId(bar.id);
        const ventable = ventKind !== null && !disabled && canVentResource(ventKind);
        return (
          <ResourceBarTab
            key={bar.id}
            tag={bar.tag}
            display={bar.display}
            ratePerSec={bar.ratePerSec}
            level={bar.level}
            disabled={disabled}
            ventable={ventable}
            onClick={ventable && ventKind ? () => requestVent(ventKind) : undefined}
          />
        );
      })}
      <ResourceBarTab
        tag="AMMO"
        display={`${ammoCount}/${ammoMax}`}
        ratePerSec={0}
        level={ammoLevel}
        disabled={ammoDisabled}
        ventable={false}
      />
    </div>
  );
}

export function HelmetCargoHUD() {
  const [displayCargo, setDisplayCargo] = useState<CargoItem[]>([]);
  const [ejectState, setEjectState] = useState<EjectState | null>(null);
  const [dockTransferUi, setDockTransferUi] = useState(getDockTransferUi);

  useEffect(() => {
    let rafId: number;
    let prevCargoLen = -1;
    const update = () => {
      rafId = requestAnimationFrame(update);
      const cl = cargo.length;
      if (cl !== prevCargoLen) {
        prevCargoLen = cl;
        setDisplayCargo(cl > 0 ? [...cargo] : []);
      }
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const onUi = () => setDockTransferUi(getDockTransferUi());
    window.addEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
    return () => window.removeEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
  }, []);

  const cargoTransferEnabled = dockTransferUi.partnerId != null;

  return (
    <>
      <div className="cargo-hold-flyout-stack power-hud--cargo-flyout">
        <MiningHUD />
        <PartnerCargoHoldPanel />
        <CargoHoldPanel
          items={displayCargo}
          transferEnabled={cargoTransferEnabled}
          onEjectItem={(item) => setEjectState({ item, step: 'confirm', amount: item.quantity })}
        />
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
  const [displayAmmo, setDisplayAmmo] = useState(() => ammo);
  const [displayAmmoCapacity, setDisplayAmmoCapacity] = useState(() => ammoCapacity);
  const [displayVelocity, setDisplayVelocity] = useState(0);
  const [displayCargo, setDisplayCargo] = useState<CargoItem[]>([]);
  const [displayCrew, setDisplayCrew] = useState(() => Math.floor(shipCrew));
  const [ejectState, setEjectState] = useState<EjectState | null>(null);
  const [ventKind, setVentKind] = useState<VentResourceKind | null>(null);
  const [dockTransferUi, setDockTransferUi] = useState(getDockTransferUi);

  useEffect(() => {
    let rafId: number;
    let prevPower = -1,
      prevHull = -1,
      prevFuel = -1,
      prevO2 = -1;
    let prevAmmo = -1,
      prevAmmoCap = -1,
      prevCrew = -1;
    let prevVelocity = -1,
      prevCargoLen = -1;

    const update = () => {
      rafId = requestAnimationFrame(update);

      const p = Math.floor(power);
      const h = Math.floor(hullIntegrity);
      const f = Math.floor(fuel);
      const o = Math.floor(o2);
      const a = ammo;
      const ac = ammoCapacity;
      const v = getShipSpeedMps();
      const cr = Math.floor(shipCrew);
      const cl = cargo.length;

      if (p !== prevPower) {
        prevPower = p;
        setDisplayPower(p);
      }
      if (h !== prevHull) {
        prevHull = h;
        setDisplayHull(h);
      }
      if (f !== prevFuel) {
        prevFuel = f;
        setDisplayFuel(f);
      }
      if (o !== prevO2) {
        prevO2 = o;
        setDisplayO2(o);
      }
      if (a !== prevAmmo) {
        prevAmmo = a;
        setDisplayAmmo(a);
      }
      if (ac !== prevAmmoCap) {
        prevAmmoCap = ac;
        setDisplayAmmoCapacity(ac);
      }
      if (cr !== prevCrew) {
        prevCrew = cr;
        setDisplayCrew(cr);
      }
      const vRounded = Math.round(v * 10);
      if (vRounded !== prevVelocity) {
        prevVelocity = vRounded;
        setDisplayVelocity(v);
      }
      if (cl !== prevCargoLen) {
        prevCargoLen = cl;
        setDisplayCargo(cl > 0 ? [...cargo] : []);
      }
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const onUi = () => setDockTransferUi(getDockTransferUi());
    window.addEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
    return () => window.removeEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
  }, []);

  const cargoTransferEnabled = dockTransferUi.partnerId != null;

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
          ammoCount={displayAmmo}
          ammoMax={displayAmmoCapacity}
          onVentRequest={setVentKind}
        />
        {ventKind && <VentResourceModal kind={ventKind} onClose={() => setVentKind(null)} />}
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

        <div className="power-hud-divider">───────</div>
        <MiningHUD />
        <PartnerCargoHoldPanel />
        <CargoHoldPanel
          items={displayCargo}
          transferEnabled={cargoTransferEnabled}
          onEjectItem={(item) => setEjectState({ item, step: 'confirm', amount: item.quantity })}
        />
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
