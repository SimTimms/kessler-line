import { thrustMultiplier } from '../../context/ShipState';
import { setEngineHiss } from '../../context/SoundManager';

interface EngineAudioParams {
  mainThrust: boolean;
  rcsThrust: boolean;
}

export function updateEngineAudio({ mainThrust, rcsThrust }: EngineAudioParams) {
  const anyThrusting = mainThrust || rcsThrust;
  const cutoff = rcsThrust && !mainThrust ? 900 : 420;
  const volume = Math.min(0.14, 0.04 + 0.05 * Math.sqrt(thrustMultiplier.current));
  setEngineHiss(anyThrusting, volume, cutoff);
  return anyThrusting;
}
