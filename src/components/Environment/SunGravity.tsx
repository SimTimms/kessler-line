import { useEffect } from 'react';
import * as THREE from 'three';
import { gravityBodies } from '../../context/GravityRegistry';
import { PLANETS } from '../Planets/SolarSystem';
import { SUN_WORLD_RADIUS, SOLAR_SYSTEM_SCALE as S } from '../../config/solarConfig';

// Derive mu_sun from Earth's observed orbital speed and radius so that
// the Sun's gravity exactly accounts for each planet's orbital motion.
// Any ship in a planet's orbit will be dragged along with the planet's
// solar orbit, keeping the relative (ship ↔ planet) orbit stable.
//
//   v_earth   = orbitalSpeed [rad/s] × orbitRadius [local units] × scale
//   mu_sun    = v_earth² × r_earth   (from circular orbit condition v² = mu/r)
const _earth = PLANETS[2]; // Earth
const vEarth = _earth.orbitalSpeed * _earth.orbitRadius * S;
const rEarth = _earth.orbitRadius * S;
const MU_SUN = vEarth * vEarth * rEarth;

// Sun never moves — re-use a single Vector3 forever
const SUN_POSITION = new THREE.Vector3(0, 0, 0);

export default function SunGravity() {
  useEffect(() => {
    gravityBodies.set('Sun', {
      position: SUN_POSITION,
      velocity: new THREE.Vector3(0, 0, 0), // static body
      mu: MU_SUN,
      soiRadius: 50_000 * S, // covers the whole solar system (200_000 at scale=4)
      surfaceRadius: SUN_WORLD_RADIUS, // SUN_RADIUS_BASE × SOLAR_SYSTEM_SCALE
      orbitAltitude: SUN_WORLD_RADIUS * 4, // ideal orbit altitude above surface
    });
    return () => {
      gravityBodies.delete('Sun');
    };
  }, []);

  return null;
}
