import { thrustMultiplier } from '../../context/ShipState';
import { setEngineHiss, setEngineRumble } from '../../sound/SoundManager';

interface EngineAudioParams {
  mainThrust: boolean;
  rcsThrust: boolean;
  fwdThrust: boolean;
}

export function updateEngineAudio({ mainThrust, rcsThrust, fwdThrust }: EngineAudioParams) {
  const anyThrusting = mainThrust || rcsThrust;
  // Procedural hiss for RCS and reverse thrust only.
  const hissActive = (rcsThrust || (mainThrust && !fwdThrust));
  const cutoff = rcsThrust && !mainThrust ? 900 : 420;
  const hissVolume = Math.min(0.14, 0.04 + 0.05 * Math.sqrt(thrustMultiplier.current));
  setEngineHiss(hissActive, hissVolume, cutoff);
  // Engine rumble mp3 for forward thrust only.
  // Normalise thrustMultiplier (0.5–1000) to a 0–1 range for audio scaling.
  const t = Math.min(1, (thrustMultiplier.current - 0.5) / 999.5);
  const rumbleVolume = 0.05 + 0.25 * t; // 0.05 → 0.30
  const rumblePitch = 0.8 + 0.4 * t;    // 0.8× → 1.2× playback rate
  setEngineRumble(fwdThrust, rumbleVolume, rumblePitch);
  return anyThrusting;
}
