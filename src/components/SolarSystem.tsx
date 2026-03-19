import Sun from './Sun';
import OrbitingPlanet from './OrbitingPlanet';
import { SOLAR_SYSTEM_SCALE as _SCALE, SUN_RADIUS_BASE } from '../config/solarConfig';

// Re-export so existing consumers (NeptuneNoFlyRing, MiniMapScene, etc.) keep working
export { SOLAR_SYSTEM_SCALE } from '../config/solarConfig';

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
// Orbital: 1 Earth year = 30 real seconds
const ov = (years: number) => (2 * Math.PI) / (years * 30);

// Spin: proportional to EarthPlanet's internal 0.04 rad/s (1 Earth day = reference)
// Negative values = retrograde rotation
const sv = (earthDays: number) => 0.04 / earthDays;

// ─── Planet configs ────────────────────────────────────────────────────────────
// Orbital order is preserved so consumers can index by position (e.g. PLANETS[7]
// is Neptune, PLANETS[2] is Earth).

export const PLANETS = [
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
  },
  {
    // 3 — Mars
    name: 'Mars',
    radius: r(3_390), // ≈  71
    orbitRadius: orbit(1.524 * SUN_RADIUS), // ≈ 1672
    orbitalSpeed: ov(1.881 * ORBIT_SPEED),
    spinSpeed: sv(1.03),
    axialTilt: 25.2 * (Math.PI / 180),
    initialAngle: 4.2,
    color: '#c1440e',
    emissive: '#110200',
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
  },
] as const;

// ─── World scale ──────────────────────────────────────────────────────────────
// Sourced from solarConfig — re-exported above for backward-compat.
// Use the private alias here to avoid circular reference.
const SOLAR_SYSTEM_SCALE = _SCALE;

// ─── Gravity parameters ───────────────────────────────────────────────────────
// Surface gravity (world-space units/s²) and sphere-of-influence multiplier.
// mu = SURFACE_GRAVITY × worldRadius²   (gives correct surface acceleration)
// soiRadius = worldRadius × SOI_MULTIPLIER
const SURFACE_GRAVITY = 5.0;
const SOI_MULTIPLIER = 8.0;
const ORBIT_ALTITUDE_MULTIPLIER = 4;
const gravParams = (localRadius: number) => {
  const worldRadius = localRadius * SOLAR_SYSTEM_SCALE;
  return {
    gravityMu: SURFACE_GRAVITY * worldRadius * worldRadius,
    gravitySoiRadius: worldRadius * SOI_MULTIPLIER,
    gravitySurfaceRadius: worldRadius,
    gravityOrbitAltitude: worldRadius * ORBIT_ALTITUDE_MULTIPLIER,
  };
};

// ─── Component ───────────────────────────────────────────────────────────────

interface SolarSystemProps {
  position?: [number, number, number];
  scale?: number;
}

export default function SolarSystem({ position = [0, 0, 0], scale = 1 }: SolarSystemProps) {
  return (
    <group position={position} scale={scale}>
      <Sun radius={SUN_RADIUS} />

      {PLANETS.map((p) => (
        <OrbitingPlanet
          key={p.name}
          planetName={p.name}
          orbitRadius={p.orbitRadius}
          radius={p.radius}
          color={p.name === 'Earth' ? '#ffffff' : p.name === 'Mars' ? '#ffffff' : p.color}
          textureUrl={
            p.name === 'Earth' ? '/earth.jpg' :
            p.name === 'Mars'  ? '/mars.jpg'  :
            undefined
          }
          emissive={p.name === 'Earth' ? '#000000' : p.emissive}
          orbitalSpeed={p.orbitalSpeed}
          spinSpeed={p.spinSpeed}
          axialTilt={p.axialTilt}
          initialAngle={p.initialAngle}
          rings={'rings' in p ? p.rings : false}
          showColonies={p.name === 'Mars'}
          {...gravParams(p.radius)}
        />
      ))}
    </group>
  );
}
