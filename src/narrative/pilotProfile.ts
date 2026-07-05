export interface PilotProfile {
  id: string;
  name: string;
  shipName: string;
  origin: string;
  goal: string;
  knowledge: {
    earthCommsBlackoutRumor: string;
    lastStationReport: string;
  };
  instincts: {
    resourceHoarding: string;
  };
}

/**
 * Initial player pilot profile used for authored dialogue choices.
 * This can later be expanded into save data / progression state.
 */
export const PILOT_PROFILE: PilotProfile = {
  id: 'pilot-01',
  name: 'Rhea Calder',
  shipName: 'Crubbs',
  origin: 'Outer lanes courier network',
  goal: 'Return toward Earth and find out what happened to family in the inner system.',
  knowledge: {
    earthCommsBlackoutRumor:
      'Pilot heard at a station that Earth-side comms went dark without warning.',
    lastStationReport:
      'A station brief from a few days ago mentioned unusual relay failures near Earth.',
  },
  instincts: {
    resourceHoarding:
      'Pilot believes stocking fuel, food, and life support supplies is prudent until comms stabilize.',
  },
};
