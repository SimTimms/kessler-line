import { useEffect } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import type { RadioBroadcastDef } from '../config/worldConfig';
import { shipPosRef } from '../context/ShipPos';
import { isWithinRadioRange } from '../context/RadioState';
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

  useEffect(() => {
    if (!def?.hailRange) return;

    let raf = 0;
    const worldPos = new THREE.Vector3();

    const tick = () => {
      if (!groupRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const status = getHailStatus(def.id);
      if (status === 'accepted') {
        raf = requestAnimationFrame(tick);
        return;
      }

      groupRef.current.getWorldPosition(worldPos);
      const dist = shipPosRef.current.distanceTo(worldPos);
      const inHailRange = dist <= def.hailRange!;
      const inRadioRange = isWithinRadioRange(dist);
      const broadcastEntry = getRadioBroadcasts().find((e) => e.id === def.id);
      const hailAllowed = broadcastEntry ? isRadioHailEnabled(broadcastEntry) : true;

      if (inHailRange && inRadioRange && hailAllowed) {
        if (canOfferHailAgain(def.id) && !hasIncomingHail(def.id)) {
          setIncomingHail(def.id);
        }
      } else if (hasIncomingHail(def.id)) {
        dismissIncomingHail(def.id);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [def, groupRef]);
}
