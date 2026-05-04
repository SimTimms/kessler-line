import { useEffect, useState } from 'react';
import { Zap, Shield, Droplets, Wind, Gauge, Activity, AlertTriangle } from 'lucide-react';
import {
  power,
  hullIntegrity,
  fuel,
  o2,
  shipAcceleration,
  getShipSpeedMps,
} from '../Ship/Spaceship';
import { cargo, type CargoItem, reduceCargoItem } from '../../context/Inventory';
import { triggerEject } from '../../context/EjectEvent';
import './PowerHUD.css';

import Cargo from './Cargo/Cargo';

type WarnLevel = 'orange' | 'red' | null;

function resourceLevel(val: number): WarnLevel {
  if (val <= 20) return 'red';
  if (val <= 50) return 'orange';
  return null;
}

function gforceLevel(val: number): WarnLevel {
  if (val >= 6) return 'red';
  if (val >= 3) return 'orange';
  return null;
}

function velocityLevel(val: number): WarnLevel {
  if (val > 300) return 'red';
  if (val > 150) return 'orange';
  return null;
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

export default function PowerHUD() {
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

  const powerColor =
    displayPower > 50
      ? 'rgba(0,200,255,1)'
      : displayPower > 20
        ? '#ffaa00'
        : 'rgba(255, 40, 140, 0.85)';
  const hullColor =
    displayHull > 50
      ? 'rgba(0,200,255,1)'
      : displayHull > 20
        ? '#ffaa00'
        : 'rgba(255, 40, 140, 0.85)';
  const fuelColor =
    displayFuel > 50
      ? 'rgba(0,200,255,1)'
      : displayFuel > 20
        ? '#ffaa00'
        : 'rgba(255, 40, 140, 0.85)';
  const o2Color =
    displayO2 > 50 ? 'rgba(0,200,255,1)' : displayO2 > 20 ? '#ffaa00' : 'rgba(255, 40, 140, 0.85)';
  const gForceColor =
    displayGForce < 3
      ? 'rgba(0,200,255,1)'
      : displayGForce < 6
        ? '#ffaa00'
        : 'rgba(255, 40, 140, 0.85)';

  return (
    <>
      <div className="power-hud" aria-live="polite">
        <div className="power-hud-row" style={{ color: powerColor }}>
          <Zap size={13} strokeWidth={1.5} />
          {displayPower}
          <WarningBadge level={resourceLevel(displayPower)} />
        </div>
        <div className="power-hud-row" style={{ color: hullColor }}>
          <Shield size={13} strokeWidth={1.5} />
          {displayHull}
          <WarningBadge level={resourceLevel(displayHull)} />
        </div>
        <div className="power-hud-row" style={{ color: fuelColor }}>
          <Droplets size={13} strokeWidth={1.5} />
          {displayFuel}
          <WarningBadge level={resourceLevel(displayFuel)} />
        </div>
        <div className="power-hud-row" style={{ color: o2Color }}>
          <Wind size={13} strokeWidth={1.5} />
          {displayO2}
          <WarningBadge level={resourceLevel(displayO2)} />
        </div>
        <div className="power-hud-row" style={{ color: gForceColor }}>
          <Gauge size={13} strokeWidth={1.5} />
          {displayGForce.toFixed(1)}g
          <WarningBadge level={gforceLevel(displayGForce)} />
        </div>
        <div
          className="power-hud-row"
          style={{
            color:
              velocityLevel(displayVelocity) === 'red'
                ? 'rgba(255, 40, 140, 0.85)'
                : velocityLevel(displayVelocity) === 'orange'
                  ? '#ffaa00'
                  : 'rgba(0,200,255,1)',
          }}
        >
          <Activity size={13} strokeWidth={1.5} />
          {displayVelocity.toFixed(1)} m/s
          <WarningBadge level={velocityLevel(displayVelocity)} />
        </div>
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
