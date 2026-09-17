import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useFrameUpdate } from './useFrameUpdate';
import * as THREE from 'three';
import type { RadioBroadcastDef } from '../config/worldConfig';
import { shipPosRef } from '../context/ShipPos';
import { isWithinPassiveRadioRange } from '../context/RadioState';
import {
  dismissIncomingHail,
  hasIncomingHail,
  setIncomingHail,
} from '../context/IncomingHailState';
import { canOfferHailAgain, getHailStatus } from '../context/HailState';
import {
  getRadioBroadcasts,
  registerRadioBroadcastFromDef,
  unregisterRadioBroadcast,
  isRadioHailEnabled,
} from '../context/RadioBroadcastRegistry';

/** Scratch vector reused by the hail-range tick. */
const worldPos = new THREE.Vector3();

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

  useFrameUpdate(
    () => {
      // Re-checked inside the callback so TypeScript narrows def, and because
      // enabled only gates subscription, not each tick.
      if (!def?.hailRange || !groupRef.current) return;
      if (getHailStatus(def.id) === 'accepted') return;

      groupRef.current.getWorldPosition(worldPos);
      const dist = shipPosRef.current.distanceTo(worldPos);
      const inHailRange = dist <= def.hailRange;
      const inPassiveRange = isWithinPassiveRadioRange(dist);
      const broadcastEntry = getRadioBroadcasts().find((e) => e.id === def.id);
      const hailAllowed = broadcastEntry ? isRadioHailEnabled(broadcastEntry) : true;

      if (inHailRange && inPassiveRange && hailAllowed) {
        if (canOfferHailAgain(def.id) && !hasIncomingHail(def.id)) {
          setIncomingHail(def.id);
        }
      } else if (hasIncomingHail(def.id)) {
        dismissIncomingHail(def.id);
      }
    },
    { enabled: Boolean(def?.hailRange) }
  );
}
