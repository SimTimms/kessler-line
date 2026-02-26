export const MINIMAP_SCALE = 1 / 100;

export interface WorldObjectDef {
  id: string;
  label: string;
  position: [number, number, number]; // world coords
  minimapColor: string;
  minimapRadius?: number; // sphere radius in minimap scene units
  minimapScenePos?: [number, number, number]; // override coords for minimap scene (no scale applied)
}

export const SPACE_STATION_DEF: WorldObjectDef = {
  id: 'space-station',
  label: 'Space Station',
  position: [0, 0, -500],
  minimapColor: '#00cfff',
  minimapRadius: 0.5,
};

export const FUEL_STATION_DEF: WorldObjectDef = {
  id: 'fuel-station',
  label: 'Fuel Station',
  position: [0, 0, 160],
  minimapColor: '#00cfff',
  minimapRadius: 0.5,
};

export const NEPTUNE_DEF: WorldObjectDef = {
  id: 'neptune',
  label: 'Neptune',
  position: [0, -7000, 0],
  minimapColor: '#4488ff',
  minimapRadius: 0.15,
  minimapScenePos: [0, 0, -22],
};

export const RED_PLANET_DEF: WorldObjectDef = {
  id: 'red-planet',
  label: 'Red Planet',
  position: [3500, -5000, -12000],
  minimapColor: '#ff3300',
  minimapRadius: 0.12,
};

export const RADIO_BEACON_DEFS: WorldObjectDef[] = [
  { id: 'beacon-0', label: 'Radio Beacon 1', position: [80, 0, -1760], minimapColor: '#00ff88' },
  { id: 'beacon-1', label: 'Radio Beacon 2', position: [-220, 0, -850], minimapColor: '#00ff88' },
  { id: 'beacon-2', label: 'Radio Beacon 3', position: [360, 0, -1200], minimapColor: '#00ff88' },
  { id: 'beacon-3', label: 'Radio Beacon 4', position: [-440, 0, -1520], minimapColor: '#00ff88' },
  { id: 'beacon-4', label: 'Radio Beacon 5', position: [620, 0, -620], minimapColor: '#00ff88' },
  { id: 'beacon-5', label: 'Radio Beacon 6', position: [-110, 0, -310], minimapColor: '#00ff88' },
  { id: 'beacon-6', label: 'Radio Beacon 7', position: [190, 0, -2180], minimapColor: '#00ff88' },
  { id: 'beacon-7', label: 'Radio Beacon 8', position: [-580, 0, -1050], minimapColor: '#00ff88' },
  { id: 'beacon-8', label: 'Radio Beacon 9', position: [470, 0, -1900], minimapColor: '#00ff88' },
  { id: 'beacon-9', label: 'Radio Beacon 10', position: [-320, 0, -430], minimapColor: '#00ff88' },
];

export const BEACON_AUDIO: Record<number, string> = {
  0: '/beacon-001.mp3',
  1: '/radio.mp3',
};
