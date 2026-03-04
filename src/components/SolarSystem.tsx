import Sun from './Sun';
import OrbitingEarth from './OrbitingEarth';
import OrbitingNeptune from './OrbitingNeptune';
import OrbitingPlanet from './OrbitingPlanet';

// ─── Sizing helpers ────────────────────────────────────────────────────────────
// True 1:1 scale makes planets invisible at these orbital distances, so display
// radii use a power-0.4 compression that preserves relative ordering.
//   display_radius = SUN_RADIUS × (planet_km / 696340)^0.4

const SUN_RADIUS = 600;
const r = (realKm: number) => Math.pow(realKm / 696_340, 0.4) * SUN_RADIUS;

// neptune.glb has an intrinsic radius of ~7 scene units at scale=1
// (back-calculated from original scene usage). Neptune/Mars GLB scale must be
// divided by that factor so the rendered size matches the formula above.
const NEPTUNE_GLB_UNIT_RADIUS = 7;

// ─── Orbital radius helper ─────────────────────────────────────────────────────
// True-scale orbits would bury all inner planets inside the Sun's visual radius.
// Power-0.35 compression anchored to Neptune at 5500 units keeps all orbits
// outside the Sun while preserving the inner/outer planet spread.
//   orbit(au) = 5500 × (au / 30.07)^0.35

const orbit = (au: number) => 5500 * Math.pow(au / 30.07, 0.35);

// ─── Speed helpers ─────────────────────────────────────────────────────────────
// Orbital: 1 Earth year = 30 real seconds
const ov = (years: number) => (2 * Math.PI) / (years * 30);

// Spin: proportional to EarthPlanet's internal 0.04 rad/s (1 Earth day = reference)
// Negative values = retrograde rotation
const sv = (earthDays: number) => 0.04 / earthDays;

// ─── Planet configs ────────────────────────────────────────────────────────────
// Earth and Neptune are rendered by dedicated components (texture / GLB).
// All others use OrbitingPlanet with a flat-shaded sphere.

const PLANETS = [
  {
    name: 'Mercury',
    radius: r(2_440), // ≈  63
    orbitRadius: orbit(0.387), // ≈ 1200
    orbitalSpeed: ov(0.241),
    spinSpeed: sv(58.6), // very slow spin
    axialTilt: 0.03 * (Math.PI / 180),
    initialAngle: 0.3,
    color: '#b5a7a7',
    emissive: '#050505',
  },
  {
    name: 'Venus',
    radius: r(6_051), // ≈  90
    orbitRadius: orbit(0.723), // ≈ 1490
    orbitalSpeed: ov(0.615),
    spinSpeed: sv(-243), // retrograde, very slow
    axialTilt: 2.6 * (Math.PI / 180),
    initialAngle: 1.4,
    color: '#e8cda0',
    emissive: '#1a1000',
  },
  {
    name: 'Mars',
    radius: r(3_390), // ≈  71
    orbitRadius: orbit(1.524), // ≈ 1940
    orbitalSpeed: ov(1.881),
    spinSpeed: sv(1.03),
    axialTilt: 25.2 * (Math.PI / 180),
    initialAngle: 4.2,
    color: '#c1440e',
    emissive: '#110200',
  },
  {
    name: 'Jupiter',
    radius: r(71_492), // ≈ 241
    orbitRadius: orbit(5.203), // ≈ 2980
    orbitalSpeed: ov(11.86),
    spinSpeed: sv(0.41), // fastest spin in the solar system
    axialTilt: 3.1 * (Math.PI / 180),
    initialAngle: 0.9,
    color: '#c88b3a',
    emissive: '#100800',
  },
  {
    name: 'Saturn',
    radius: r(60_268), // ≈ 225
    orbitRadius: orbit(9.537), // ≈ 3680
    orbitalSpeed: ov(29.46),
    spinSpeed: sv(0.44),
    axialTilt: 26.7 * (Math.PI / 180),
    initialAngle: 5.5,
    color: '#e4d191',
    emissive: '#100e00',
    rings: true,
  },
  {
    name: 'Uranus',
    radius: r(25_559), // ≈ 160
    orbitRadius: orbit(19.19), // ≈ 4700
    orbitalSpeed: ov(84.01),
    spinSpeed: sv(-0.72), // retrograde
    axialTilt: 97.8 * (Math.PI / 180), // nearly on its side
    initialAngle: 3.5,
    color: '#7de8e8',
    emissive: '#001a1a',
  },
] as const;

// Earth and Neptune sizes for their dedicated components
const EARTH_SCALE = r(6_371); // ≈  92
const NEPTUNE_SCALE = r(24_622) / NEPTUNE_GLB_UNIT_RADIUS; // ≈  22

const EARTH_ORBIT_RADIUS = orbit(1.0); // ≈ 1620
const NEPTUNE_ORBIT_RADIUS = orbit(30.07); // = 5500

// ─── Component ────────────────────────────────────────────────────────────────

interface SolarSystemProps {
  position?: [number, number, number];
  scale?: number;
}

export default function SolarSystem({ position = [0, -1000, 0], scale = 1.3 }: SolarSystemProps) {
  return (
    <group position={position} scale={scale}>
      <Sun radius={SUN_RADIUS} />

      {PLANETS.map((p) => (
        <OrbitingPlanet
          key={p.name}
          planetName={p.name}
          orbitRadius={p.orbitRadius}
          radius={p.radius}
          color={p.color}
          emissive={p.emissive}
          orbitalSpeed={p.orbitalSpeed}
          spinSpeed={p.spinSpeed}
          axialTilt={p.axialTilt}
          initialAngle={p.initialAngle}
          rings={'rings' in p ? p.rings : false}
        />
      ))}

      <OrbitingEarth scale={EARTH_SCALE} orbitRadius={EARTH_ORBIT_RADIUS} />
      <OrbitingNeptune scale={NEPTUNE_SCALE} orbitRadius={NEPTUNE_ORBIT_RADIUS} />
    </group>
  );
}
