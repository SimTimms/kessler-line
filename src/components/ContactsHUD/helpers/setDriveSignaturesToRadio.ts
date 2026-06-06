import { KM_PER_UNIT } from '../../../config/commsConfig';
import { getDriveSignatures } from '../../../context/DriveSignatureRegistry';
import { driveSignatureOnRef, driveSignatureRangeRef } from '../../../context/DriveSignatureScan';
import { radioOnRef } from '../../../context/RadioState';
import { radioRangeRef } from '../../../context/RadioState';
import type { DriveContact } from '../ContactsHUD';
import * as THREE from 'three';

const tmpVec = new THREE.Vector3();
let prevSig = '';

interface SetDriveSignaturesToRadioProps {
  shipPos: THREE.Vector3;
  setInRangeDrives: (drives: DriveContact[]) => void;
}
export function setDriveSignaturesToRadio({
  shipPos,
  setInRangeDrives,
}: SetDriveSignaturesToRadioProps) {
  const range = driveSignatureRangeRef.current;
  const sigs = getDriveSignatures();
  const inRange: DriveContact[] = [];

  if (driveSignatureOnRef.current) {
    for (const sig of sigs) {
      sig.getPosition(tmpVec);
      const dist = tmpVec.distanceTo(shipPos);
      if (dist <= range) {
        const km = dist * KM_PER_UNIT;
        const distLabel =
          km >= 1_000_000
            ? `${(km / 1_000_000).toFixed(2)} Gm`
            : km >= 1_000
              ? `${(km / 1_000).toFixed(1)} Mm`
              : `${km.toFixed(0)} km`;
        const radioActive = radioOnRef.current && dist <= radioRangeRef.current;
        inRange.push({
          id: sig.id,
          name: sig.label,
          distanceLabel: distLabel,
          distanceRaw: dist,
          radioActive,
        });
      }
    }

    const sig = inRange
      .map((c) => `${c.id}:${c.radioActive ? 1 : 0}`)
      .sort()
      .join('|');
    if (sig !== prevSig) {
      prevSig = sig;
      setInRangeDrives(inRange);
    }
  } else if (prevSig !== '') {
    prevSig = '';
    setInRangeDrives([]);
  }
}
