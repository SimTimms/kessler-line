import { useEffect, useState } from 'react';
import {
  Zap,
  Shield,
  Droplets,
  Wind,
  Gauge,
  Activity,
  Crosshair,
  ArrowLeftRight,
} from 'lucide-react';
import {
  power,
  hullIntegrity,
  fuel,
  o2,
  shipAcceleration,
  getShipSpeedMps,
  shipVelocity,
} from '../Ship/Spaceship';
import { selectedTargetName, selectedTargetVelocity } from '../../context/TargetSelection';
import { cargo, type CargoItem, reduceCargoItem } from '../../context/Inventory';
import { triggerEject } from '../../context/EjectEvent';
import './PowerHUD.css';

interface EjectState {
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
  const [targetName, setTargetName] = useState<string | null>(null);
  const [relSpeed, setRelSpeed] = useState(0);
  const [displayCargo, setDisplayCargo] = useState<CargoItem[]>([]);
  const [ejectState, setEjectState] = useState<EjectState | null>(null);

  useEffect(() => {
    let rafId: number;
    const update = () => {
      setDisplayPower(Math.floor(power));
      setDisplayHull(Math.floor(hullIntegrity));
      setDisplayFuel(Math.floor(fuel));
      setDisplayO2(Math.floor(o2));
      setTargetName(selectedTargetName);
      setDisplayGForce(shipAcceleration.current / 9.81);
      setDisplayVelocity(getShipSpeedMps());
      // Relative speed = magnitude of (shipVelocity − targetVelocity)
      setRelSpeed(shipVelocity.distanceTo(selectedTargetVelocity) * 1);
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
        </div>
        <div className="power-hud-row" style={{ color: hullColor }}>
          <Shield size={13} strokeWidth={1.5} />
          {displayHull}
        </div>
        <div className="power-hud-row" style={{ color: fuelColor }}>
          <Droplets size={13} strokeWidth={1.5} />
          {displayFuel}
        </div>
        <div className="power-hud-row" style={{ color: o2Color }}>
          <Wind size={13} strokeWidth={1.5} />
          {displayO2}
        </div>
        <div className="power-hud-row" style={{ color: gForceColor }}>
          <Gauge size={13} strokeWidth={1.5} />
          {displayGForce.toFixed(1)}g
        </div>
        <div className="power-hud-row" style={{ color: 'rgba(0,200,255,1)' }}>
          <Activity size={13} strokeWidth={1.5} />
          {displayVelocity.toFixed(1)} m/s
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
        {targetName && (
          <>
            <div className="power-hud-target">
              <Crosshair size={13} strokeWidth={1.5} />
              {targetName}
            </div>
            <div className="power-hud-target">
              <ArrowLeftRight size={13} strokeWidth={1.5} />
              {relSpeed.toFixed(1)} m/s
              {targetName === 'Docking Bay' && relSpeed < 4 && (
                <span className="power-hud-hint">[docking velocity]</span>
              )}
            </div>
          </>
        )}
      </div>

      {ejectState && (
        <div className="power-dialog">
          {ejectState.step === 'confirm' && (
            <>
              <p className="power-dialog-title">CARGO MANAGEMENT</p>
              <p className="power-dialog-body">
                Eject {ejectState.item.quantity}x {ejectState.item.name.toUpperCase()} into space?
              </p>
              <div className="power-dialog-actions">
                <button
                  type="button"
                  className="power-btn power-btn-cancel"
                  onClick={() => setEjectState(null)}
                >
                  NO
                </button>
                <button
                  type="button"
                  className="power-btn power-btn-danger"
                  onClick={() => setEjectState({ ...ejectState, step: 'quantity' })}
                >
                  YES
                </button>
              </div>
            </>
          )}

          {ejectState.step === 'quantity' && (
            <>
              <p className="power-dialog-title">SELECT QUANTITY TO EJECT</p>
              <p className="power-dialog-amount">
                {ejectState.amount}x {ejectState.item.name.toUpperCase()}
              </p>
              <input
                className="power-dialog-range"
                type="range"
                min={1}
                max={ejectState.item.quantity}
                value={ejectState.amount}
                onChange={(e) => setEjectState({ ...ejectState, amount: parseInt(e.target.value) })}
              />
              <div className="power-dialog-actions">
                <button
                  type="button"
                  className="power-btn power-btn-cancel"
                  onClick={() => setEjectState(null)}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className="power-btn power-btn-danger"
                  onClick={() => {
                    triggerEject(ejectState.amount);
                    reduceCargoItem(ejectState.item.name, ejectState.amount);
                    setEjectState(null);
                  }}
                >
                  CONFIRM EJECT
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
