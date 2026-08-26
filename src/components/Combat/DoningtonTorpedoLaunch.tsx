import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';
import {
  EVENT_TORPEDO_LAUNCH,
  type TorpedoLaunchDetail,
} from '../../config/torpedoConfig';
import {
  getNarrativePrimaryFieldOrigin,
  NARRATIVE_DONINGTON_STATION_ID,
} from '../../scenes/NarrativeConfig/narrativeSceneConfig';

/** Delay in seconds before the torpedo fires after scene load. */
const LAUNCH_DELAY_S = 10;

/** Local offset of Donington Station's dock within the primary field. */
const DOCK_LOCAL_OFFSET = new THREE.Vector3(300, -20, 0);

/**
 * Renderless component that fires a single torpedo from Donington Station
 * toward the player ship after a fixed delay.
 */
export default function DoningtonTorpedoLaunch() {
  const fired = useRef(false);

  // TODO: temporarily disabled – remove the `false &&` to re-enable
  useEffect(() => {
    if (false as boolean) {
    const timer = window.setTimeout(() => {
      if (fired.current) return;
      fired.current = true;

      const origin = getNarrativePrimaryFieldOrigin().add(DOCK_LOCAL_OFFSET);

      // Forward direction: from station toward the player at launch time.
      const forward = new THREE.Vector3()
        .copy(shipPosRef.current)
        .sub(origin)
        .normalize();
      if (forward.lengthSq() < 1e-8) forward.set(0, 0, -1);

      const detail: TorpedoLaunchDetail = {
        id: `donington-torpedo-${Date.now()}`,
        mode: 'horizontal',
        origin: { x: origin.x, y: 0, z: origin.z },
        launcherVelocity: { x: 0, y: 0, z: 0 },
        launcherForward: { x: forward.x, y: forward.y, z: forward.z },
        launcherId: NARRATIVE_DONINGTON_STATION_ID,
        getTargetPosition: (target) => target.copy(shipPosRef.current),
      };

      window.dispatchEvent(
        new CustomEvent(EVENT_TORPEDO_LAUNCH, { detail })
      );
    }, LAUNCH_DELAY_S * 1000);

    return () => window.clearTimeout(timer);
    }
  }, []);

  return null;
}
