import { useEffect, useState } from 'react';
import type React from 'react';
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
import { power, hullIntegrity, fuel, o2, shipVelocity, shipAcceleration } from './Spaceship';
import { selectedTargetName, selectedTargetVelocity } from '../context/TargetSelection';
import { cargo, type CargoItem, reduceCargoItem } from '../context/Inventory';
import { triggerEject } from '../context/EjectEvent';

// 1 game unit = 1 metre — adjust this constant to rescale if needed
const METRES_PER_UNIT = 1;

const dialogStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(0, 8, 18, 0.95)',
  border: '1px solid rgba(0, 200, 255, 0.4)',
  borderRadius: 6,
  padding: '24px 32px',
  fontFamily: 'monospace',
  color: '#00cfff',
  minWidth: 280,
  textAlign: 'center',
  boxShadow: '0 0 32px rgba(0, 200, 255, 0.15)',
  pointerEvents: 'auto',
  zIndex: 100,
};

const cancelBtn: React.CSSProperties = {
  padding: '8px 20px',
  fontFamily: 'monospace',
  fontSize: 13,
  letterSpacing: '0.05em',
  background: 'transparent',
  color: 'rgba(0, 200, 255, 0.5)',
  border: '1px solid rgba(0, 200, 255, 0.3)',
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
};

const dangerBtn: React.CSSProperties = {
  padding: '8px 20px',
  fontFamily: 'monospace',
  fontSize: 13,
  letterSpacing: '0.05em',
  background: 'rgba(255, 80, 80, 0.12)',
  color: '#ff6666',
  border: '1px solid rgba(255, 80, 80, 0.6)',
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
  boxShadow: '0 0 8px rgba(255, 80, 80, 0.15)',
};

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
      setDisplayVelocity(shipVelocity.length());
      // Relative speed = magnitude of (shipVelocity − targetVelocity)
      setRelSpeed(shipVelocity.distanceTo(selectedTargetVelocity) * METRES_PER_UNIT);
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
      {/* Stats overlay — pointer-events:none so mouse passes through to the canvas */}
      <div
        className="power-hud"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          fontFamily: 'monospace',
          fontSize: 14,
          pointerEvents: 'none',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(2px)',
          gap: 4,
          zIndex: 100,
          padding: 10,
          background: 'rgba(0,200,255,0.1)',
          border: '1px solid rgba(0,200,255,0.2)',
        }}
      >
        <div style={{ color: powerColor, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={13} strokeWidth={1.5} />
          {displayPower}
        </div>
        <div style={{ color: hullColor, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={13} strokeWidth={1.5} />
          {displayHull}
        </div>
        <div style={{ color: fuelColor, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Droplets size={13} strokeWidth={1.5} />
          {displayFuel}
        </div>
        <div style={{ color: o2Color, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wind size={13} strokeWidth={1.5} />
          {displayO2}
        </div>
        <div style={{ color: gForceColor, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gauge size={13} strokeWidth={1.5} />
          {displayGForce.toFixed(1)}g
        </div>
        <div style={{ color: 'rgba(0,200,255,1)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={13} strokeWidth={1.5} />
          {displayVelocity.toFixed(1)} m/s
        </div>
        {displayCargo.length > 0 && (
          <>
            <div style={{ color: 'rgba(0, 200, 255, 0.4)', marginTop: 8, fontSize: 14 }}>
              ───────
            </div>
            <div style={{ color: '#a0e8ff', fontSize: 14, letterSpacing: '0.05em' }}>
              CARGO HOLD
            </div>
            {displayCargo.map((item) => (
              <div
                key={item.name}
                title="Click to eject"
                style={{
                  color: '#00ff88',
                  fontSize: 14,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  userSelect: 'none',
                  textDecoration: 'underline dotted',
                }}
                onClick={() => setEjectState({ item, step: 'confirm', amount: item.quantity })}
              >
                {item.quantity}x {item.name.toUpperCase()}
              </div>
            ))}
          </>
        )}
        {targetName && (
          <>
            <div
              style={{
                color: '#00cfff',
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Crosshair size={13} strokeWidth={1.5} />
              {targetName}
            </div>
            <div style={{ color: '#00cfff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeftRight size={13} strokeWidth={1.5} />
              {relSpeed.toFixed(1)} m/s
              {targetName === 'Docking Bay' && relSpeed < 4 && <span> [docking velocity]</span>}
            </div>
          </>
        )}
      </div>

      {/* Eject dialog */}
      {ejectState && (
        <div style={dialogStyle}>
          {ejectState.step === 'confirm' && (
            <>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: 'rgba(0, 200, 255, 0.5)',
                }}
              >
                CARGO MANAGEMENT
              </p>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#a0e8ff', lineHeight: 1.6 }}>
                Eject {ejectState.item.quantity}x {ejectState.item.name.toUpperCase()} into space?
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button style={cancelBtn} onClick={() => setEjectState(null)}>
                  NO
                </button>
                <button
                  style={dangerBtn}
                  onClick={() => setEjectState({ ...ejectState, step: 'quantity' })}
                >
                  YES
                </button>
              </div>
            </>
          )}

          {ejectState.step === 'quantity' && (
            <>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: 'rgba(0, 200, 255, 0.5)',
                }}
              >
                SELECT QUANTITY TO EJECT
              </p>
              <p
                style={{
                  margin: '0 0 16px',
                  fontSize: 22,
                  color: '#ff6666',
                  letterSpacing: '0.06em',
                }}
              >
                {ejectState.amount}x {ejectState.item.name.toUpperCase()}
              </p>
              <input
                type="range"
                min={1}
                max={ejectState.item.quantity}
                value={ejectState.amount}
                onChange={(e) => setEjectState({ ...ejectState, amount: parseInt(e.target.value) })}
                style={{ width: '100%', marginBottom: 20, accentColor: '#ff6666' }}
              />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button style={cancelBtn} onClick={() => setEjectState(null)}>
                  CANCEL
                </button>
                <button
                  style={dangerBtn}
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
