import { useEffect, useState } from 'react';
import { power, hullIntegrity, fuel, shipVelocity } from './Spaceship';
import { selectedTargetName, selectedTargetVelocity } from '../context/TargetSelection';

// 1 game unit = 1 metre — adjust this constant to rescale if needed
const METRES_PER_UNIT = 1;

export default function PowerHUD() {
  const [displayPower, setDisplayPower] = useState(100);
  const [displayHull, setDisplayHull] = useState(100);
  const [displayFuel, setDisplayFuel] = useState(100);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [relSpeed, setRelSpeed] = useState(0);

  useEffect(() => {
    let rafId: number;
    const update = () => {
      setDisplayPower(Math.floor(power));
      setDisplayHull(Math.floor(hullIntegrity));
      setDisplayFuel(Math.floor(fuel));
      setTargetName(selectedTargetName);
      // Relative speed = magnitude of (shipVelocity − targetVelocity)
      setRelSpeed(shipVelocity.distanceTo(selectedTargetVelocity) * METRES_PER_UNIT);
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const powerColor = displayPower > 50 ? '#00ff88' : displayPower > 20 ? '#ffaa00' : '#ff3333';
  const hullColor = displayHull > 50 ? '#00ff88' : displayHull > 20 ? '#ffaa00' : '#ff3333';
  const fuelColor = displayFuel > 50 ? '#00ff88' : displayFuel > 20 ? '#ffaa00' : '#ff3333';

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: 16,
      fontFamily: 'monospace',
      fontSize: 18,
      pointerEvents: 'none',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ color: powerColor }}>PWR: {displayPower}</div>
      <div style={{ color: hullColor }}>HUL: {displayHull}</div>
      <div style={{ color: fuelColor }}>FUL: {displayFuel}</div>
      {targetName && (
        <>
          <div style={{ color: '#00cfff', marginTop: 8 }}>TGT: {targetName}</div>
          <div style={{ color: '#00cfff' }}>
            REL: {relSpeed.toFixed(1)} m/s
            {targetName === 'Docking Bay' && relSpeed < 4 && (
              <span> [docking velocity]</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
