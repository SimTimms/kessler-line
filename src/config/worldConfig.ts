import { SOLAR_SYSTEM_SCALE } from './solarConfig';

// Scale factor relative to the authored baseline (scale = 4).
// All world positions were authored at SOLAR_SYSTEM_SCALE = 4, so dividing by 4
// gives the scale-1 base, then multiplying by SOLAR_SYSTEM_SCALE gives any target scale.
const S = SOLAR_SYSTEM_SCALE / 4;

export const MINIMAP_SCALE = 1 / 600; // handled separately — do not scale here

export interface WorldObjectDef {
  id: string;
  label: string;
  position: [number, number, number]; // world coords
  minimapColor: string;
  minimapRadius?: number; // sphere radius in minimap scene units
  minimapScenePos?: [number, number, number]; // override coords for minimap scene (no scale applied)
  contactable?: boolean;
  orbit?: {
    planetName: string;
    radius: number; // world-space orbital radius
    speed: number; // rad/s
    phase?: number; // radians
  };
}

export const ASTEROID_DOCK_DEF: WorldObjectDef = {
  id: 'asteroid-dock',
  label: 'Asteroid Dock',
  position: [-8000 * S, 0, 6000 * S],
  minimapColor: '#ff9900',
  minimapRadius: 0.5,
  contactable: true,
};

export const SPACE_STATION_DEF: WorldObjectDef = {
  id: 'space-station',
  label: 'Space Station',
  position: [0, 0, -1500 * S],
  minimapColor: '#00cfff',
  minimapRadius: 0.5,
};

export const FUEL_STATION_DEF: WorldObjectDef = {
  id: 'fuel-station',
  label: 'Sirix Station',
  position: [6084 * S, 0, -6584 * S],
  minimapColor: '#00cfff',
  minimapRadius: 0.5,
  contactable: true,
};

export const NEPTUNE_DEF: WorldObjectDef = {
  id: 'neptune',
  label: 'Neptune',
  position: [0, 0, 0],
  minimapColor: '#00aaff',
  minimapRadius: 0.5,
};

export const RED_PLANET_DEF: WorldObjectDef = {
  id: 'red-planet',
  label: 'Red Planet',
  position: [3500 * S, -5000 * S, -12000 * S],
  minimapColor: '#ff3300',
  minimapRadius: 0.5,
};

export const EARTH_DEF: WorldObjectDef = {
  id: 'earth',
  label: 'Earth',
  position: [800 * S, 0, -1000 * S],
  minimapColor: '#2277ff',
  minimapRadius: 0.5,
};

export const GREEN_PLANET_DEF: WorldObjectDef = {
  id: 'green-planet',
  label: 'Green Planet',
  position: [2000 * S, -2000 * S, -500 * S],
  minimapColor: '#00ff00',
  minimapRadius: 0.5,
};

export const MERCURY_DEF: WorldObjectDef = {
  id: 'mercury',
  label: 'Mercury',
  position: [300 * S, 0, -400 * S],
  minimapColor: '#a0978f',
  minimapRadius: 0.5,
};

export const VENUS_DEF: WorldObjectDef = {
  id: 'venus',
  label: 'Venus',
  position: [600 * S, 0, -700 * S],
  minimapColor: '#e8cda0',
  minimapRadius: 0.5,
};

export const MARS_DEF: WorldObjectDef = {
  id: 'mars',
  label: 'Mars',
  position: [3500 * S, 0, -12000 * S],
  minimapColor: '#c1440e',
  minimapRadius: 0.5,
};

export const JUPITER_DEF: WorldObjectDef = {
  id: 'jupiter',
  label: 'Jupiter',
  position: [8000 * S, 0, -5000 * S],
  minimapColor: '#c88b3a',
  minimapRadius: 0.5,
};

export const SATURN_DEF: WorldObjectDef = {
  id: 'saturn',
  label: 'Saturn',
  position: [-6000 * S, 0, 4000 * S],
  minimapColor: '#e4d191',
  minimapRadius: 0.5,
};

export const URANUS_DEF: WorldObjectDef = {
  id: 'uranus',
  label: 'Uranus',
  position: [-4000 * S, 0, -3000 * S],
  minimapColor: '#b2e0e8',
  minimapRadius: 0.5,
};

export const SOLAR_SYSTEM_PLANETS: WorldObjectDef[] = [
  MERCURY_DEF,
  VENUS_DEF,
  EARTH_DEF,
  MARS_DEF,
  JUPITER_DEF,
  SATURN_DEF,
  URANUS_DEF,
  NEPTUNE_DEF,
];

export const NAV_TARGET_DEFS: WorldObjectDef[] = [
  ...SOLAR_SYSTEM_PLANETS,
  ASTEROID_DOCK_DEF,
  SPACE_STATION_DEF,
  FUEL_STATION_DEF,
];

export const RADIO_BEACON_DEFS: WorldObjectDef[] = [
  { id: 'beacon-0', label: 'Radio Beacon 1', position: [80 * S, 0, -1760 * S], minimapColor: '#00ff88' },
  { id: 'beacon-1', label: 'Radio Beacon 2', position: [-220 * S, 0, -850 * S], minimapColor: '#00ff88' },
  { id: 'beacon-2', label: 'Radio Beacon 3', position: [360 * S, 0, -1200 * S], minimapColor: '#00ff88' },
  { id: 'beacon-3', label: 'Radio Beacon 4', position: [-440 * S, 0, -1520 * S], minimapColor: '#00ff88' },
  { id: 'beacon-4', label: 'Radio Beacon 5', position: [620 * S, 0, -620 * S], minimapColor: '#00ff88' },
  { id: 'beacon-5', label: 'Radio Beacon 6', position: [-110 * S, 0, -310 * S], minimapColor: '#00ff88' },
  { id: 'beacon-6', label: 'Radio Beacon 7', position: [190 * S, 0, -2180 * S], minimapColor: '#00ff88' },
  { id: 'beacon-7', label: 'Radio Beacon 8', position: [-580 * S, 0, -1050 * S], minimapColor: '#00ff88' },
  { id: 'beacon-8', label: 'Radio Beacon 9', position: [470 * S, 0, -1900 * S], minimapColor: '#00ff88' },
  { id: 'beacon-9', label: 'Radio Beacon 10', position: [-320 * S, 0, -430 * S], minimapColor: '#00ff88' },
  {
    id: 'beacon-venus',
    label: 'Radio Beacon Venus',
    position: [0, 0, 0],
    minimapColor: '#00ff88',
    orbit: { planetName: 'Venus', radius: 420 * S, speed: 0.25, phase: 0.0 },
  },
  {
    id: 'beacon-mercury',
    label: 'Radio Beacon Mercury',
    position: [0, 0, 0],
    minimapColor: '#00ff88',
    orbit: { planetName: 'Mercury', radius: 320 * S, speed: 0.35, phase: 1.1 },
  },
];

export const BEACON_AUDIO: Record<number, string> = {
  0: '/beacon-001.mp3',
  1: '/radio.mp3',
};

export interface RadioBroadcastDef {
  id: string;
  label: string;
  position: [number, number, number];
  audioFile?: string;
  dialogue: string[];
  dockable?: boolean;
  dockingBay?: string;
}

export const RADIO_BROADCAST_DEFS: RadioBroadcastDef[] = [
  {
    id: 'asteroid-dock',
    label: 'Asteroid Dock',
    position: ASTEROID_DOCK_DEF.position,
    dockable: true,
    dockingBay: '01',
    dialogue: [
      'ASTEROID DOCK BROADCASTING.',
      'DOCKING BAY 1 AVAILABLE.',
      'ALL INCOMING VESSELS REPORT TO DISPATCH ON ARRIVAL.',
    ],
  },
  {
    id: 'station-alpha',
    label: 'Station Alpha',
    position: SPACE_STATION_DEF.position,
    dockable: true,
    dockingBay: '03',
    dialogue: [
      'STATION ALPHA BROADCASTING ON ALL FREQUENCIES.',
      'DOCKING BAY 3 CURRENTLY AVAILABLE.',
      'FUEL RESERVES AT 87%. OXYGEN SUPPLIES NOMINAL.',
      'WARNING: SOLAR STORM APPROACHING FROM SECTOR 7.',
      'ALL VESSELS ADVISED TO SEEK SHELTER IMMEDIATELY.',
    ],
  },
  {
    id: 'fuel-station',
    label: 'Sirix Station',
    position: FUEL_STATION_DEF.position,
    dockable: true,
    dockingBay: '07',
    dialogue: [
      'SIRIX STATION BROADCASTING.',
      'DOCKING AVAILABLE. FUEL RESERVES AT CAPACITY.',
      'OXYGEN TRANSFER SYSTEMS ONLINE.',
    ],
  },
];
