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
import {
  KEY_THRUST_FORWARD,
  KEY_THRUST_REVERSE,
  KEY_YAW_LEFT,
  KEY_YAW_RIGHT,
  KEY_STRAFE_LEFT,
  KEY_STRAFE_RIGHT,
  KEY_RADIAL_OUT,
  KEY_RADIAL_IN,
  KEY_UNDOCK_CARGO,
} from '../../config/keybindings';

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
      if (e.code === KEY_THRUST_FORWARD) thrustForward.current = true;
      if (e.code === KEY_THRUST_REVERSE) thrustReverse.current = true;
      if (e.code === KEY_YAW_LEFT) thrustLeft.current = true;
      if (e.code === KEY_YAW_RIGHT) thrustRight.current = true;
      if (e.code === KEY_STRAFE_RIGHT) thrustStrafeLeft.current = true;
      if (e.code === KEY_STRAFE_LEFT) thrustStrafeRight.current = true;
      if (e.code === KEY_RADIAL_OUT) thrustRadialOut.current = true;
      if (e.code === KEY_RADIAL_IN) thrustRadialIn.current = true;
      if (e.code === KEY_UNDOCK_CARGO) {
        if (dockedTo.current) {
          dockedTo.current = null;
          window.dispatchEvent(new CustomEvent('ShipUndocked'));
          if (groupRef.current) {
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current.quaternion);
            const releaseDir = forward.multiplyScalar(-1);
            groupRef.current.position.addScaledVector(releaseDir, 1); // ensure clear separation from bay
            // Push away from the docking bay, not toward it.
            velocity.current.copy(releaseDir.multiplyScalar(8)); // 8 m/s release velocity
          }
          releaseParticleTrigger.current = true;
        } else {
          window.dispatchEvent(new CustomEvent('CargoRelease'));
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === KEY_THRUST_FORWARD) thrustForward.current = false;
      if (e.code === KEY_THRUST_REVERSE) thrustReverse.current = false;
      if (e.code === KEY_YAW_LEFT) thrustLeft.current = false;
      if (e.code === KEY_YAW_RIGHT) thrustRight.current = false;
      if (e.code === KEY_STRAFE_RIGHT) thrustStrafeLeft.current = false;
      if (e.code === KEY_STRAFE_LEFT) thrustStrafeRight.current = false;
      if (e.code === KEY_RADIAL_OUT) thrustRadialOut.current = false;
      if (e.code === KEY_RADIAL_IN) thrustRadialIn.current = false;
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
