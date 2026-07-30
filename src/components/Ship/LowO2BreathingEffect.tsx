import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { O2_DANGER_THRESHOLD } from '../../config/damageConfig';
import { o2, shipDestroyed } from '../../context/ShipState';
import { setLowO2BreathingSound } from '../../sound/SoundManager';

/**
 * Starts the sickly-breathing loop when player O2 hits the HUD "dangerous"
 * (red) threshold, and stops it once oxygen recovers above that level.
 */
export default function LowO2BreathingEffect() {
  const wasDangerous = useRef(false);

  useEffect(() => {
    return () => {
      setLowO2BreathingSound(false);
    };
  }, []);

  useFrame(() => {
    const dangerous = !shipDestroyed.current && o2 <= O2_DANGER_THRESHOLD;
    if (dangerous === wasDangerous.current) return;
    wasDangerous.current = dangerous;
    setLowO2BreathingSound(dangerous);
  });

  return null;
}
