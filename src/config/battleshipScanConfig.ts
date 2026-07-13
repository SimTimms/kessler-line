import { LUNAR_MOON_CENTER } from './lunarLandscapeConfig';
import type { MoonOrbitConfig } from '../utils/moonOrbit';

/** Scanner/collision registration flags for a battleship world object. */
export type BattleshipScanConfig = {
  id: string;
  label: string;
  magnetic?: boolean;
  driveSignature?: boolean;
  /** Registers a mesh-bounds collider for proximity scan + ship collision. */
  proximity?: boolean;
  /** Registers a collider for physical collisions without enabling proximity scan labels. */
  physicalCollision?: boolean;
};

/** Tutorial battleship — far from the lunar container, visible on all scanner bands. */
export const TUTORIAL_BATTLESHIP_SCAN: BattleshipScanConfig = {
  id: 'tutorial-battleship',
  label: 'HMS Dreadnought',
  magnetic: true,
  driveSignature: true,
  proximity: true,
};

/** Inclined lunar orbit — current apex is the highest Y; ship dips below and returns. */
export const TUTORIAL_BATTLESHIP_ORBIT: MoonOrbitConfig = {
  center: LUNAR_MOON_CENTER,
  apexPosition: [4000, -500, 5000],
  speed: 0.015,
};
