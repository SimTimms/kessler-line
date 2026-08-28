// Comms Relay Mission — constants and configuration.

import { getPlanet, SOLAR_SYSTEM_SCALE } from '../../../components/Planets/SolarSystem';

export const COMMS_RELAY_MISSION_ID = 'elias-voss-comms-relay';
export const COMMS_RELAY_HAIL_CONTACT_ID = 'elias-voss-emergency-broadcast';
export const COMMS_RELAY_DIALOGUE_TREE_ID = 'elias-voss-emergency-broadcast';
export const COMMS_BUFFER_SATELLITE_ID = 'comms-buffer-satellite';
export const COMMS_BUFFER_SATELLITE_LABEL = 'Comms Buffer Satellite';

/** Prerequisite missions — completing either one triggers the emergency broadcast. */
export const COMMS_RELAY_PREREQUISITE_MISSIONS = [
  'bill-churchill-parcel-run',
  'elias-voss-satellite-deployment',
] as const;

/** Delay (ms) after prerequisite completion before the emergency broadcast fires. */
export const COMMS_RELAY_HAIL_DELAY_MS = 20_000;

// ── Satellite orbit parameters ────────────────────────────────────────────────
// The comms buffer satellite orbits Mars at a fixed radius. These values are
// relative to Mars's world-space radius so the orbit scales with the solar system.

const marsConfig = getPlanet('Mars');
const MARS_R = (marsConfig?.radius ?? 0) * SOLAR_SYSTEM_SCALE;

/** Orbital radius as a multiplier of Mars world radius. */
export const BUFFER_ORBIT_RADIUS_FACTOR = 2.6;
export const BUFFER_ORBIT_RADIUS = MARS_R * BUFFER_ORBIT_RADIUS_FACTOR;
export const BUFFER_ORBIT_PHASE = (140 / 180) * Math.PI;
export const BUFFER_ORBIT_INCLINATION_Z = 0;
export const BUFFER_ORBIT_INCLINATION_X = 0;
