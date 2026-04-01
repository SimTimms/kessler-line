import RadioBeacon from './Radio/RadioBeacon';
import { RADIO_BEACON_DEFS, BEACON_AUDIO } from '../config/worldConfig';

import { OrbitingRadioBeacon } from './OrbitingRadioBeacon';
import type { OrbitingBeaconDef } from './OrbitingRadioBeacon';
import * as THREE from 'three';

interface RadioBeaconsProps {
  beaconGroupRef: React.MutableRefObject<THREE.Group | null>;
}

export const RadioBeacons = ({ beaconGroupRef }: RadioBeaconsProps) => {
  return RADIO_BEACON_DEFS.map((def, i) =>
    def.orbit ? (
      <OrbitingRadioBeacon
        key={def.id}
        def={def as OrbitingBeaconDef}
        beaconGroupRef={i === 0 ? beaconGroupRef : undefined}
        index={i}
        audioFile={BEACON_AUDIO[i]}
      />
    ) : (
      <group key={def.id} position={def.position}>
        <RadioBeacon
          beaconGroupRef={i === 0 ? beaconGroupRef : undefined}
          index={i}
          audioFile={BEACON_AUDIO[i]}
        />
      </group>
    )
  );
};
