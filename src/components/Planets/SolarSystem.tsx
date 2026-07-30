import Sun from '../Environment/Sun';
import OrbitingPlanet from './OrbitingPlanet';
import {
  SOLAR_SYSTEM_SCALE as _SCALE,
  SUN_RADIUS_BASE,
  SUN_SCALE_MULTIPLIER,
  ORBIT_ALTITUDE_MULTIPLIER,
  DEFAULT_PLANET_SURFACE_GRAVITY,
  PLANET_SOI_MULTIPLIER,
} from '../../config/solarConfig';
import { PLANET_GLOW_TEXTURE_URL } from '../../config/visualConfig';
import { PLANETS } from './SolarSystemConfig';
import type { PlanetType } from './SolarSystemType';

export { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';

export function getPlanet(name: string): PlanetType | undefined {
  return PLANETS.find((p) => p.name === name);
}

const SOLAR_SYSTEM_SCALE = _SCALE;

const gravParams = (localRadius: number, surfaceGravity = DEFAULT_PLANET_SURFACE_GRAVITY) => {
  const worldRadius = localRadius * SOLAR_SYSTEM_SCALE;
  return {
    gravityMu: surfaceGravity * worldRadius * worldRadius,
    gravitySoiRadius: worldRadius * PLANET_SOI_MULTIPLIER,
    gravitySurfaceRadius: worldRadius,
    gravityOrbitAltitude: worldRadius * ORBIT_ALTITUDE_MULTIPLIER,
  };
};

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
      <Sun radius={SUN_RADIUS_BASE * SUN_SCALE_MULTIPLIER} />

      {planets.map((p) => (
        <OrbitingPlanet
          key={p.name}
          planetName={p.name}
          orbitRadius={p.orbitRadius}
          orbitY={p.orbitY}
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
