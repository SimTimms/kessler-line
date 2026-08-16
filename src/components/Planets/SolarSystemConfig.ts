import {
  SOLAR_SYSTEM_SCALE as _SCALE,
  SUN_RADIUS_BASE,
  MERCURY_SURFACE_GRAVITY,
  VENUS_SURFACE_GRAVITY,
  EARTH_SURFACE_GRAVITY,
  MARS_SURFACE_GRAVITY,
  JUPITER_SURFACE_GRAVITY,
  SATURN_SURFACE_GRAVITY,
  URANUS_SURFACE_GRAVITY,
  NEPTUNE_SURFACE_GRAVITY,
} from '../../config/solarConfig';
import type { PlanetType } from './SolarSystemType';

const ORBIT_SPEED = 510;
const r = (realKm: number) => Math.pow(realKm / 696_340, 0.2) * SUN_RADIUS_BASE;

const MARS_LOCAL_RADIUS = r(13_390);

const orbit = (au: number) => 5500 * Math.pow(au / 30.07, 0.4);
const ov = (years: number) => (2 * Math.PI) / (years * 21_600);
const sv = (earthDays: number) => 0.04 / earthDays;
const moonWorldRadius = (realKm: number, minLocal = 0, sizeScale = 0.15) => {
  const local = Math.max(Math.pow(realKm / 696_340, 0.2) * SUN_RADIUS_BASE, minLocal);
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

export const PLANETS: PlanetType[] = [
  {
    // 0 — Mercury
    name: 'Mercury',
    radius: r(2_440), // ≈  63
    orbitRadius: orbit(0.387 * SUN_RADIUS_BASE), // ≈  963
    orbitY: -60,
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
    orbitRadius: orbit(0.723 * SUN_RADIUS_BASE), // ≈ 1236
    orbitY: 0,
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
    orbitRadius: orbit(1.0 * SUN_RADIUS_BASE), // ≈ 1409
    orbitY: -0,
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
    orbitRadius: orbit(1.524 * SUN_RADIUS_BASE), // ≈ 1672
    orbitY: -46,
    orbitalSpeed: ov(1.881 * ORBIT_SPEED),
    spinSpeed: sv(1.03) * 0.1,
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
    orbitRadius: orbit(5.203 * SUN_RADIUS_BASE), // ≈ 2727
    orbitY: 0,
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
    orbitRadius: orbit(9.537 * SUN_RADIUS_BASE), // ≈ 3472
    orbitY: -200,
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
    orbitRadius: orbit(19.19 * SUN_RADIUS_BASE), // ≈ 4596
    orbitY: 0,
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
    orbitRadius: orbit(30.07 * SUN_RADIUS_BASE), // = 5500
    orbitY: -60,
    orbitalSpeed: ov(164.8 * ORBIT_SPEED),
    spinSpeed: sv(0.67),
    axialTilt: 28.3 * (Math.PI / 180),
    initialAngle: 1.2,
    color: '#4169e8',
    emissive: '#000818',
    surfaceGravity: NEPTUNE_SURFACE_GRAVITY,
  },
] satisfies PlanetType[];
