import type { MoonType } from './SolarSystemConfig';

export type PlanetType = {
  name: string;
  radius: number;
  orbitRadius: number;
  /** Visual-only vertical offset for the rendered planet model. */
  orbitY: number;
  orbitalSpeed: number;
  spinSpeed: number;
  axialTilt: number;
  initialAngle: number;
  color: string;
  emissive: string;
  rings?: boolean;
  moons?: MoonType[];
  /** Surface gravity (world units/s²); defaults to DEFAULT_PLANET_SURFACE_GRAVITY. */
  surfaceGravity?: number;
  /** Optional radial glow PNG (public/ path); falls back to PLANET_GLOW_TEXTURE_URL then procedural. */
  glowTextureUrl?: string;
  factionControl?: {
    name: string;
    influenceRadius: number;
    color: string;
  };
};
