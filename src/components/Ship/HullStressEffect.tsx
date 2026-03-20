import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  thrustMultiplier,
  MAX_THRUST_MULTIPLIER,
  shipAcceleration,
  damageHull,
  shipDestroyed,
} from '../../context/ShipState';
import { setHullStressSound, playHullCreak } from '../../sound/SoundManager';
import { HULL_STRESS_DAMAGE_INTERVAL } from '../../config/damageConfig';

const DAMAGE_INTERVAL = HULL_STRESS_DAMAGE_INTERVAL;
const CREAK_INTERVAL_MIN = 3;
const CREAK_INTERVAL_MAX = 8;

interface HullStressEffectProps {
  shipGroupRef: { current: THREE.Group | null };
}

export default function HullStressEffect(_props: HullStressEffectProps) {
  const damageAccum = useRef(0);
  const creakAccum = useRef(CREAK_INTERVAL_MIN + Math.random() * (CREAK_INTERVAL_MAX - CREAK_INTERVAL_MIN));
  const wasStressing = useRef(false);

  useEffect(() => {
    return () => { setHullStressSound(false); };
  }, []);

  useFrame((_, delta) => {
    const isStressing =
      !shipDestroyed.current &&
      thrustMultiplier.current >= MAX_THRUST_MULTIPLIER &&
      shipAcceleration.current > 0;

    if (isStressing !== wasStressing.current) {
      setHullStressSound(isStressing);
      wasStressing.current = isStressing;
    }

    if (isStressing) {
      damageAccum.current += delta;
      if (damageAccum.current >= DAMAGE_INTERVAL) {
        damageAccum.current -= DAMAGE_INTERVAL;
        damageHull(1);
      }

      creakAccum.current -= delta;
      if (creakAccum.current <= 0) {
        creakAccum.current = CREAK_INTERVAL_MIN + Math.random() * (CREAK_INTERVAL_MAX - CREAK_INTERVAL_MIN);
        playHullCreak();
      }
    } else {
      damageAccum.current = 0;
    }
  });

  return null;
}
