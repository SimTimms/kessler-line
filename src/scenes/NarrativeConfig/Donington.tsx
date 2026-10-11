import { Suspense, useMemo } from 'react';
import SalvageField from '../SalvageConfig/SalvageField';
import NormalTravelZoneRing from '../../components/FastTravel/NormalTravelZoneRing';
import CarrierGRB from '../../components/Ships/CarrierGRB';
import {
  NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS,
  NARRATIVE_MARS_ZONE_ID,
  NARRATIVE_PRIMARY_ZONE_ID,
  NARRATIVE_SECONDARY_ZONE_ID,
  getNarrativeMarsZoneCenter,
  getNarrativeMarsNormalTravelRadius,
} from './narrativeSceneConfig';
import { DONINGTON_STATION_DOCK_CONFIG } from '../../config/landingPads/donington-station';

interface DoningtonProps {
  primaryFieldOrigin: [number, number, number];
  secondaryFieldOrigin: [number, number, number];
}
export default function Donington({ primaryFieldOrigin, secondaryFieldOrigin }: DoningtonProps) {
  const marsZoneCenter = useMemo((): [number, number, number] => {
    const o = getNarrativeMarsZoneCenter();
    return [o.x, o.y, o.z];
  }, []);

  const marsZoneRadius = useMemo(() => getNarrativeMarsNormalTravelRadius(), []);

  return (
    <Suspense fallback={null}>
      <NormalTravelZoneRing
        id={NARRATIVE_PRIMARY_ZONE_ID}
        center={primaryFieldOrigin}
        radius={NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS}
      />
      <NormalTravelZoneRing
        id={NARRATIVE_SECONDARY_ZONE_ID}
        center={secondaryFieldOrigin}
        radius={NARRATIVE_FIELD_NORMAL_TRAVEL_RADIUS}
      />
      <NormalTravelZoneRing
        id={NARRATIVE_MARS_ZONE_ID}
        center={marsZoneCenter}
        radius={marsZoneRadius}
      />
      <SalvageField
        origin={primaryFieldOrigin}
        idPrefix={''}
        showDroneFleet={false}
        dockLabelOverride="Donington Station"
        dockConfigOverride={DONINGTON_STATION_DOCK_CONFIG}
        dockRadioBroadcastEnabled
        dockDriveSignatureEnabled
        dockRadioDialogue={[
          'DONINGTON STATION BROADCASTING.',
          'BILL CHURCHILL AVAILABLE FOR PARCEL HANDOFF.',
        ]}
        dockRadioDockingBay="A1"
      />
      <CarrierGRB
        position={[
          primaryFieldOrigin[0] + 4200,
          primaryFieldOrigin[1] - 200,
          primaryFieldOrigin[2] + 200,
        ]}
        scale={5}
      />
    </Suspense>
  );
}
