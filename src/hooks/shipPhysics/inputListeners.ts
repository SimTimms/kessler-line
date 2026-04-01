import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import {
  damageHull,
  MAIN_ENGINE_HIT_RADIUS,
  MAIN_ENGINE_LOCAL_POS,
  mainEngineDisabled,
  railgunTargetEngine,
} from '../../context/ShipState';
import { playImpactSoundOverlap, playRailgunHit } from '../../sound/SoundManager';
import { RAILGUN_DAMAGE_MIN, RAILGUN_DAMAGE_MAX } from '../../config/damageConfig';

export interface InputListenersResult {
  thrustForward: React.MutableRefObject<boolean>;
  thrustReverse: React.MutableRefObject<boolean>;
  thrustLeft: React.MutableRefObject<boolean>;
  thrustRight: React.MutableRefObject<boolean>;
  thrustStrafeLeft: React.MutableRefObject<boolean>;
  thrustStrafeRight: React.MutableRefObject<boolean>;
  thrustRadialOut: React.MutableRefObject<boolean>;
  thrustRadialIn: React.MutableRefObject<boolean>;
  releaseParticleTrigger: React.MutableRefObject<boolean>;
}

export function useInputListeners({
  dockedTo,
  velocity,
  groupRef,
}: {
  dockedTo: React.MutableRefObject<string | null>;
  velocity: React.MutableRefObject<THREE.Vector3>;
  groupRef: React.RefObject<THREE.Group>;
}): InputListenersResult {
  const thrustForward = useRef(false);
  const thrustReverse = useRef(false);
  const thrustLeft = useRef(false); // A: yaw left
  const thrustRight = useRef(false); // D: yaw right
  const thrustStrafeLeft = useRef(false); // Q: strafe port
  const thrustStrafeRight = useRef(false); // E: strafe starboard
  const thrustRadialOut = useRef(false); // R: radial out (away from planet)
  const thrustRadialIn = useRef(false); // F: radial in (toward planet)
  const releaseParticleTrigger = useRef(false);
  const lastRailgunTarget = useRef<'reverseA' | 'reverseB' | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') thrustForward.current = true;
      if (e.code === 'KeyS') thrustReverse.current = true;
      if (e.code === 'KeyA') thrustLeft.current = true;
      if (e.code === 'KeyD') thrustRight.current = true;
      if (e.code === 'KeyE') thrustStrafeLeft.current = true;
      if (e.code === 'KeyQ') thrustStrafeRight.current = true;
      if (e.code === 'KeyR') thrustRadialOut.current = true;
      if (e.code === 'KeyF') thrustRadialIn.current = true;
      if (e.code === 'Space' && dockedTo.current) {
        dockedTo.current = null;
        window.dispatchEvent(new CustomEvent('ShipUndocked'));
        if (groupRef.current) {
          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current.quaternion);
          velocity.current.copy(forward.multiplyScalar(4)); // 4 m/s release velocity
        }
        releaseParticleTrigger.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') thrustForward.current = false;
      if (e.code === 'KeyS') thrustReverse.current = false;
      if (e.code === 'KeyA') thrustLeft.current = false;
      if (e.code === 'KeyD') thrustRight.current = false;
      if (e.code === 'KeyE') thrustStrafeLeft.current = false;
      if (e.code === 'KeyQ') thrustStrafeRight.current = false;
      if (e.code === 'KeyR') thrustRadialOut.current = false;
      if (e.code === 'KeyF') thrustRadialIn.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onRailgunHit = (event: Event) => {
      const detail = (event as CustomEvent<{ targetEngine?: 'reverseA' | 'reverseB' | null }>)
        .detail;
      lastRailgunTarget.current = detail?.targetEngine ?? railgunTargetEngine.current;
      playImpactSoundOverlap();
      playRailgunHit();
      const damage = RAILGUN_DAMAGE_MIN + Math.random() * (RAILGUN_DAMAGE_MAX - RAILGUN_DAMAGE_MIN);
      damageHull(damage);
    };
    window.addEventListener('RailgunHit', onRailgunHit);

    const onDamagePoints = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          points: Array<{ x: number; y: number; z: number; nx: number; ny: number; nz: number }>;
        }>
      ).detail;
      if (!detail?.points?.length || !groupRef.current) return;

      const group = groupRef.current;
      const localPoint = new THREE.Vector3();
      let closestA = Infinity;
      let closestB = Infinity;
      for (const point of detail.points) {
        localPoint.set(point.x, point.y, point.z);
        group.worldToLocal(localPoint);

        const distA = localPoint.distanceTo(MAIN_ENGINE_LOCAL_POS.reverseA);
        const distB = localPoint.distanceTo(MAIN_ENGINE_LOCAL_POS.reverseB);
        if (distA < closestA) closestA = distA;
        if (distB < closestB) closestB = distB;
      }

      const hitA = closestA <= MAIN_ENGINE_HIT_RADIUS;
      const hitB = closestB <= MAIN_ENGINE_HIT_RADIUS;
      const target = lastRailgunTarget.current ?? railgunTargetEngine.current;

      if (target === 'reverseA' && hitA) {
        mainEngineDisabled.reverseA.current = true;
      } else if (target === 'reverseB' && hitB) {
        mainEngineDisabled.reverseB.current = true;
      }

      lastRailgunTarget.current = null;
      railgunTargetEngine.current = null;
    };
    window.addEventListener('RailgunDamagePoints', onDamagePoints);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('RailgunHit', onRailgunHit);
      window.removeEventListener('RailgunDamagePoints', onDamagePoints);
    };
    // dockedTo and velocity are stable refs — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupRef]);

  return {
    thrustForward,
    thrustReverse,
    thrustLeft,
    thrustRight,
    thrustStrafeLeft,
    thrustStrafeRight,
    thrustRadialOut,
    thrustRadialIn,
    releaseParticleTrigger,
  };
}
