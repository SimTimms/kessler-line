import { Suspense } from 'react';
import SalvageField from '../SalvageConfig/SalvageField';
import { BAKERFIELD_FALLS_DOCK_CONFIG } from '../../config/landingPads/bakerfield-falls';
import { NARRATIVE_BAKERFIELD_ID_PREFIX } from './narrativeSceneConfig';

interface BakersfieldProps {
  secondaryFieldOrigin: [number, number, number];
}
export default function Bakersfield({ secondaryFieldOrigin }: BakersfieldProps) {
  return (
    <Suspense fallback={null}>
      <SalvageField
        origin={secondaryFieldOrigin}
        idPrefix={NARRATIVE_BAKERFIELD_ID_PREFIX}
        showDroneFleet={false}
        showDroneAtmosphere
        dockLabelOverride="Bakerfield Falls"
        dockConfigOverride={BAKERFIELD_FALLS_DOCK_CONFIG}
        dockRadioBroadcastEnabled
        dockDriveSignatureEnabled
        dockRadioDialogue={[
          'BAKERFIELD FALLS BROADCASTING.',
          'DOCKMASTER HANK JOHNSON STANDING BY FOR PARCEL RECEIPT.',
        ]}
        dockRadioDockingBay="B1"
      />
    </Suspense>
  );
}
