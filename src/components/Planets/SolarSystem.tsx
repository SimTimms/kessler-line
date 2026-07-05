import Sun from '../Environment/Sun';
import OrbitingPlanet from './OrbitingPlanet';
import {
  SOLAR_SYSTEM_SCALE as _SCALE,
  SUN_RADIUS_BASE,
  SUN_SCALE_MULTIPLIER,
  ORBIT_ALTITUDE_MULTIPLIER,
  DEFAULT_PLANET_SURFACE_GRAVITY,
  MERCURY_SURFACE_GRAVITY,
  VENUS_SURFACE_GRAVITY,
  EARTH_SURFACE_GRAVITY,
  MARS_SURFACE_GRAVITY,
  JUPITER_SURFACE_GRAVITY,
  SATURN_SURFACE_GRAVITY,
  URANUS_SURFACE_GRAVITY,
  NEPTUNE_SURFACE_GRAVITY,
  PLANET_SOI_MULTIPLIER,
} from '../../config/solarConfig';
import { PLANET_GLOW_TEXTURE_URL } from '../../config/visualConfig';

// Re-export so existing consumers (NeptuneNoFlyRing, MiniMapScene, etc.) keep working
export { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';

// ─── Sizing helpers ────────────────────────────────────────────────────────────
// True 1:1 scale makes planets invisible at these orbital distances, so display
// radii use a power-0.4 compression that preserves relative ordering.
//   display_radius = SUN_RADIUS_BASE × (planet_km / 696340)^0.2

const SUN_RADIUS = SUN_RADIUS_BASE;
const ORBIT_SPEED = 510;
const r = (realKm: number) => Math.pow(realKm / 696_340, 0.2) * SUN_RADIUS;

// ─── Orbital radius helper ─────────────────────────────────────────────────────
// True-scale orbits would bury all inner planets inside the Sun's visual radius.
// Power-0.40 compression anchored to Neptune at 5500 units — same exponent as
// the planet size formula — keeps the two scales self-consistent so the visual
// ratio between orbit spacing and planet size matches reality's relative ordering.
//   orbit(au) = 5500 × (au / 30.07)^0.40

const orbit = (au: number) => 5500 * Math.pow(au / 30.07, 0.4);

// ─── Speed helpers ─────────────────────────────────────────────────────────────
// Orbital: 1 Earth year = 6 real hours (21,600 seconds)
const ov = (years: number) => (2 * Math.PI) / (years * 21_600);

// Spin: proportional to EarthPlanet's internal 0.04 rad/s (1 Earth day = reference)
// Negative values = retrograde rotation
const sv = (earthDays: number) => 0.04 / earthDays;

// ─── Moon helpers (world-space units — used by MarsSystem) ───────────────────
/** Display radius in world units (local radius × SOLAR_SYSTEM_SCALE). */
const moonWorldRadius = (realKm: number, minLocal = 0, sizeScale = 0.15) => {
  const local = Math.max(Math.pow(realKm / 696_340, 0.2) * SUN_RADIUS, minLocal);
  return local * sizeScale * _SCALE;
};

const moonOrbitRadius = (
  parentLocalRadius: number,
  moonSemiMajorKm: number,
  parentRadiusKm: number,
  visualMultiplier = 3
) => (moonSemiMajorKm / parentRadiusKm) * parentLocalRadius * _SCALE * visualMultiplier;

/** 10% of physically correct speed for 1 Earth year = 6 real hours. */
const moonOrbitSpeed = (periodSec: number, rate = 0.1) => ((2 * Math.PI) / periodSec) * rate;

export type MoonType = {
  name: string;
  /** World-space display radius. */
  radius: number;
  /** World-space orbital radius around the parent planet. */
  orbitRadius: number;
  orbitalSpeed: number;
  /** Inclination to parent equatorial plane (radians). */
  inclination: number;
  initialPhase: number;
};

// ─── Planet configs ────────────────────────────────────────────────────────────
// Orbital order is preserved so consumers can index by position (e.g. PLANETS[7]
// is Neptune, PLANETS[2] is Earth).
export type PlanetType = {
  name: string;
  radius: number;
  orbitRadius: number;
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

const MARS_LOCAL_RADIUS = r(3_390);

export const PLANETS: PlanetType[] = [
  {
    // 0 — Mercury
    name: 'Mercury',
    radius: r(2_440), // ≈  63
    orbitRadius: orbit(0.387 * SUN_RADIUS), // ≈  963
    orbitalSpeed: ov(0.241 * ORBIT_SPEED),
    spinSpeed: sv(58.6), // very slow spin
    axialTilt: 0.03 * (Math.PI / 180),
    initialAngle: 0.3,
    color: '#b5a7a7',
    emissive: '#050505',
    surfaceGravity: MERCURY_SURFACE_GRAVITY,
  },
  {
    // 1 — Venus
    name: 'Venus',
    radius: r(6_051), // ≈  90
    orbitRadius: orbit(0.723 * SUN_RADIUS), // ≈ 1236
    orbitalSpeed: ov(0.615 * ORBIT_SPEED),
    spinSpeed: sv(-243), // retrograde, very slow
    axialTilt: 2.6 * (Math.PI / 180),
    initialAngle: 1.4,
    color: '#e8cda0',
    emissive: '#1a1000',
    surfaceGravity: VENUS_SURFACE_GRAVITY,
  },
  {
    // 2 — Earth
    name: 'Earth',
    radius: r(6_371), // ≈  92
    orbitRadius: orbit(1.0 * SUN_RADIUS), // ≈ 1409
    orbitalSpeed: ov(1.0 * ORBIT_SPEED),
    spinSpeed: sv(1.0),
    axialTilt: 23.4 * (Math.PI / 180),
    initialAngle: 2.5,
    color: '#2a7bde',
    emissive: '#001220',
    surfaceGravity: EARTH_SURFACE_GRAVITY,
  },
  {
    // 3 — Mars
    name: 'Mars',
    radius: MARS_LOCAL_RADIUS, // ≈  71
    orbitRadius: orbit(1.524 * SUN_RADIUS), // ≈ 1672
    orbitalSpeed: ov(1.881 * ORBIT_SPEED),
    spinSpeed: sv(1.03),
    axialTilt: 25.2 * (Math.PI / 180),
    initialAngle: 4.2,
    color: '#c1440e',
    emissive: '#110200',
    surfaceGravity: MARS_SURFACE_GRAVITY,
    moons: [
      {
        name: 'Phobos',
        radius: moonWorldRadius(11.267, 18),
        orbitRadius: moonOrbitRadius(MARS_LOCAL_RADIUS, 9_376, 3_390),
        orbitalSpeed: moonOrbitSpeed(18.8),
        inclination: 1.093 * (Math.PI / 180),
        initialPhase: 0.5,
      },
      {
        name: 'Deimos',
        radius: moonWorldRadius(6.2, 12),
        orbitRadius: moonOrbitRadius(MARS_LOCAL_RADIUS, 23_459, 3_390),
        orbitalSpeed: moonOrbitSpeed(74.7),
        inclination: 0.93 * (Math.PI / 180),
        initialPhase: 2.1,
      },
    ],
    factionControl: {
      name: 'No Controlling Faction',
      influenceRadius: 130,
      color: '#fc037f',
    },
  },
  {
    // 4 — Jupiter
    name: 'Jupiter',
    radius: r(71_492), // ≈ 241
    orbitRadius: orbit(5.203 * SUN_RADIUS), // ≈ 2727
    orbitalSpeed: ov(11.86 * ORBIT_SPEED),
    spinSpeed: sv(0.41), // fastest spin in the solar system
    axialTilt: 3.1 * (Math.PI / 180),
    initialAngle: 0.9,
    color: '#c88b3a',
    emissive: '#100800',
    surfaceGravity: JUPITER_SURFACE_GRAVITY,
  },
  {
    // 5 — Saturn
    name: 'Saturn',
    radius: r(60_268), // ≈ 225
    orbitRadius: orbit(9.537 * SUN_RADIUS), // ≈ 3472
    orbitalSpeed: ov(29.46 * ORBIT_SPEED),
    spinSpeed: sv(0.44),
    axialTilt: 26.7 * (Math.PI / 180),
    initialAngle: 5.5,
    color: '#e4d191',
    emissive: '#100e00',
    rings: true,
    surfaceGravity: SATURN_SURFACE_GRAVITY,
  },
  {
    // 6 — Uranus
    name: 'Uranus',
    radius: r(25_559), // ≈ 160
    orbitRadius: orbit(19.19 * SUN_RADIUS), // ≈ 4596
    orbitalSpeed: ov(84.01 * ORBIT_SPEED),
    spinSpeed: sv(-0.72), // retrograde
    axialTilt: 97.8 * (Math.PI / 180), // nearly on its side
    initialAngle: 3.5,
    color: '#7de8e8',
    emissive: '#001a1a',
    surfaceGravity: URANUS_SURFACE_GRAVITY,
  },
  {
    // 7 — Neptune  (dedicated rendering via OrbitingNeptune)
    name: 'Neptune',
    radius: r(24_622), // ≈ 157 display; GLB scale = radius / NEPTUNE_GLB_UNIT_RADIUS
    orbitRadius: orbit(30.07 * SUN_RADIUS), // = 5500
    orbitalSpeed: ov(164.8 * ORBIT_SPEED),
    spinSpeed: sv(0.67),
    axialTilt: 28.3 * (Math.PI / 180),
    initialAngle: 1.2,
    color: '#4169e8',
    emissive: '#000818',
    surfaceGravity: NEPTUNE_SURFACE_GRAVITY,
  },
] satisfies PlanetType[];

export function getPlanet(name: string): PlanetType | undefined {
  return PLANETS.find((p) => p.name === name);
}

// ─── World scale ──────────────────────────────────────────────────────────────
// Sourced from solarConfig — re-exported above for backward-compat.
// Use the private alias here to avoid circular reference.
const SOLAR_SYSTEM_SCALE = _SCALE;

// ─── Gravity parameters ───────────────────────────────────────────────────────
// mu = surfaceGravity × worldRadius²   (gives correct surface acceleration)
const gravParams = (localRadius: number, surfaceGravity = DEFAULT_PLANET_SURFACE_GRAVITY) => {
  const worldRadius = localRadius * SOLAR_SYSTEM_SCALE;
  return {
    gravityMu: surfaceGravity * worldRadius * worldRadius,
    gravitySoiRadius: worldRadius * PLANET_SOI_MULTIPLIER,
    gravitySurfaceRadius: worldRadius,
    gravityOrbitAltitude: worldRadius * ORBIT_ALTITUDE_MULTIPLIER,
  };
};

// ─── Component ───────────────────────────────────────────────────────────────

interface SolarSystemProps {
  position?: [number, number, number];
  scale?: number;
  planets?: PlanetType[];
}

export default function SolarSystem({
  position = [0, 0, 0],
  scale = 1,
  planets = PLANETS,
}: SolarSystemProps) {
  return (
    <group position={position} scale={scale}>
      <Sun radius={SUN_RADIUS * SUN_SCALE_MULTIPLIER} />

      {planets.map((p) => (
        <OrbitingPlanet
          key={p.name}
          planetName={p.name}
          orbitRadius={p.orbitRadius}
          radius={p.radius}
          color={
            p.name === 'Earth' || p.name === 'Mars' || p.name === 'Neptune' || p.name === 'Venus'
              ? '#ffffff'
              : p.color
          }
          glowColor={p.color}
          glowTextureUrl={p.glowTextureUrl ?? PLANET_GLOW_TEXTURE_URL ?? undefined}
          textureUrl={
            p.name === 'Earth'
              ? '/earth.jpg'
              : p.name === 'Mars'
                ? '/mars.jpg'
                : p.name === 'Neptune'
                  ? '/neptune.jpg'
                  : p.name === 'Venus'
                    ? '/assets/venus.jpeg'
                    : undefined
          }
          emissive={p.name === 'Earth' ? '#000000' : p.emissive}
          orbitalSpeed={p.orbitalSpeed}
          spinSpeed={p.spinSpeed}
          axialTilt={p.axialTilt}
          initialAngle={p.initialAngle}
          rings={'rings' in p ? p.rings : false}
          showGlowSprite={false}
          showColonies={p.name === 'Mars'}
          useBumpMap={p.name === 'Mars' || p.name === 'Neptune'}
          {...gravParams(p.radius, p.surfaceGravity ?? DEFAULT_PLANET_SURFACE_GRAVITY)}
        />
      ))}
    </group>
  );
}
