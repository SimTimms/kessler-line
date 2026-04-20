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
  AlertTriangle,
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
import { selectedTargetName, selectedTargetVelocity, selectedTargetPosition, targetFlashUntil } from '../../context/TargetSelection';
import { shipPosRef } from '../../context/ShipPos';
import { cargo, type CargoItem, reduceCargoItem } from '../../context/Inventory';
import { triggerEject } from '../../context/EjectEvent';
import './PowerHUD.css';

import * as THREE from 'three';

const _toTarget = new THREE.Vector3();
const _relVel = new THREE.Vector3();

/** Signed closing speed: negative = approaching, positive = receding. */
function getSignedRelSpeed(): number {
  _toTarget.copy(selectedTargetPosition).sub(shipPosRef.current);
  const dist = _toTarget.length();
  if (dist < 0.01) return 0;
  _toTarget.divideScalar(dist);
  _relVel.copy(shipVelocity).sub(selectedTargetVelocity);
  return _relVel.dot(_toTarget); // positive = moving away, negative = closing in
}

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
  const [relSpeedFlash, setRelSpeedFlash] = useState(false);
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
      setDisplayGForce((shipAcceleration.current * 10) / 9.81);
      setDisplayVelocity(getShipSpeedMps());
      setRelSpeed(selectedTargetName ? getSignedRelSpeed() : 0);
      setRelSpeedFlash(Date.now() < targetFlashUntil);
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
        {targetName && (
          <>
            <div className="power-hud-target">
              <Crosshair size={13} strokeWidth={1.5} />
              {targetName}
            </div>
            <div className={`power-hud-target${relSpeedFlash ? ' power-hud-target--flash' : ''}`}>
              <ArrowLeftRight size={13} strokeWidth={1.5} />
              {relSpeed.toFixed(1)} m/s
              {targetName === 'Docking Bay' && Math.abs(relSpeed) < 4 && (
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
