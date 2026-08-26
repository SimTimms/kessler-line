import { MARS_DEF } from './worldConfig';

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  waypoint?: [number, number, number];
  waypointLabel?: string;
}

export const MISSION_DEFS: Record<string, MissionDef> = {
  'bill-churchill-parcel-run': {
    id: 'bill-churchill-parcel-run',
    title: 'Parcel Delivery',
    description:
      'Deliver the sealed parcel from Bill Churchill at Donington Station to Hank Johnson at Bakerfield Falls.',
    waypoint: [...MARS_DEF.position],
    waypointLabel: 'Bakerfield Falls',
  },
  'elias-voss-satellite-deployment': {
    id: 'elias-voss-satellite-deployment',
    title: 'Satellite Deployment',
    description:
      'Tow the satellite container to a stable Mars orbit and release it.',
    waypoint: [...MARS_DEF.position],
    waypointLabel: 'Mars',
  },
  'elias-voss-comms-relay': {
    id: 'elias-voss-comms-relay',
    title: 'Comms Buffer Recovery',
    description:
      'Dock with the comms buffer satellite in Mars orbit and download the emergency communication logs.',
    waypoint: [...MARS_DEF.position],
    waypointLabel: 'Comms Buffer Satellite',
  },
};

export function getMissionDef(id: string): MissionDef | undefined {
  return MISSION_DEFS[id];
}
