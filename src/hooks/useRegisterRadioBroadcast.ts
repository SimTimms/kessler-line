import { useEffect } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import type { RadioBroadcastDef } from '../config/worldConfig';
import {
  registerRadioBroadcastFromDef,
  unregisterRadioBroadcast,
} from '../context/RadioBroadcastRegistry';

/** Registers a scene radio broadcast while mounted (unregisters on unmount). */
export function useRegisterRadioBroadcast(
  groupRef: RefObject<THREE.Object3D | null>,
  def: RadioBroadcastDef | undefined
): void {
  useEffect(() => {
    if (!def) return;

    registerRadioBroadcastFromDef(def, (target) => {
      if (groupRef.current) groupRef.current.getWorldPosition(target);
      else target.set(def.position[0], def.position[1], def.position[2]);
      return target;
    });

    return () => unregisterRadioBroadcast(def.id);
  }, [def, groupRef]);
}
