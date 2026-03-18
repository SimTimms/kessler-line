import { useRef, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../context/SolarSystemMinimap';
import { gravityBodies } from '../context/GravityRegistry';

const _planetWorldPos = new THREE.Vector3();

interface OrbitingPlanetProps {
  planetName: string;
  orbitRadius: number;
  radius: number; // world-space sphere radius (in SolarSystem local space)
  color: string;
  textureUrl?: string;
  emissive?: string;
  orbitalSpeed: number; // rad/s
  spinSpeed: number; // rad/s (negative = retrograde)
  axialTilt: number; // radians
  initialAngle: number; // radians
  rings?: boolean;
  gravityMu?: number; // GM in world-space units (optional)
  gravitySoiRadius?: number; // sphere of influence radius in world-space units (optional)
  gravitySurfaceRadius?: number; // physical surface radius in world-space units (optional)
  gravityOrbitAltitude?: number; // ideal orbit altitude above surface (optional)
}

export default function OrbitingPlanet({
  planetName,
  orbitRadius,
  radius,
  color,
  textureUrl,
  emissive = '#000000',
  orbitalSpeed,
  spinSpeed,
  axialTilt,
  initialAngle,
  rings = false,
  gravityMu,
  gravitySoiRadius,
  gravitySurfaceRadius,
  gravityOrbitAltitude,
}: OrbitingPlanetProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const planetCenterRef = useRef<THREE.Group>(null);
  const prevWorldPosRef = useRef(new THREE.Vector3());
  const hasPrevWorldPosRef = useRef(false);
  const texture = useTexture(
    textureUrl ??
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9L5bQAAAAASUVORK5CYII='
  );

  const soiRing = useMemo(() => {
    if (gravitySoiRadius === undefined || gravitySurfaceRadius === undefined) return null;
    const soiLocalRadius = (gravitySoiRadius / gravitySurfaceRadius) * radius;
    const segments = 128;
    const arr = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      arr[i * 3]     = Math.cos(theta) * soiLocalRadius;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = Math.sin(theta) * soiLocalRadius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineDashedMaterial({
      color: 0x4499ff,
      dashSize: soiLocalRadius * 0.04,
      gapSize:  soiLocalRadius * 0.04,
      opacity: 0.35,
      transparent: true,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, [gravitySoiRadius, gravitySurfaceRadius, radius]);

  useEffect(() => {
    if (orbitRef.current) orbitRef.current.rotation.y = initialAngle;
    hasPrevWorldPosRef.current = false;

    if (
      gravityMu !== undefined &&
      gravitySoiRadius !== undefined &&
      gravitySurfaceRadius !== undefined &&
      gravityOrbitAltitude !== undefined
    ) {
      gravityBodies.set(planetName, {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        mu: gravityMu,
        soiRadius: gravitySoiRadius,
        surfaceRadius: gravitySurfaceRadius,
        orbitAltitude: gravityOrbitAltitude,
      });
    }

    return () => {
      gravityBodies.delete(planetName);
    };
  }, [
    initialAngle,
    planetName,
    gravityMu,
    gravitySoiRadius,
    gravitySurfaceRadius,
    gravityOrbitAltitude,
  ]);

  useFrame((_, delta) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += orbitalSpeed * delta;
      const θ = orbitRef.current.rotation.y;
      solarPlanetPositions[planetName] = {
        x: Math.cos(θ) * orbitRadius,
        z: -Math.sin(θ) * orbitRadius,
      };
    }
    if (spinRef.current) spinRef.current.rotation.y += spinSpeed * delta;

    // Update gravity body world position each frame
    if (planetCenterRef.current && gravityBodies.has(planetName)) {
      planetCenterRef.current.getWorldPosition(_planetWorldPos);
      const body = gravityBodies.get(planetName)!;
      if (hasPrevWorldPosRef.current && delta > 0) {
        body.velocity
          .subVectors(_planetWorldPos, prevWorldPosRef.current)
          .multiplyScalar(1 / delta);
      } else {
        body.velocity.set(0, 0, 0);
      }
      prevWorldPosRef.current.copy(_planetWorldPos);
      hasPrevWorldPosRef.current = true;
      body.position.copy(_planetWorldPos);
    }
  });

  return (
    <group ref={orbitRef}>
      <group ref={planetCenterRef} position={[orbitRadius, 0, 0]}>
        {/* Axial tilt applied once; spin group rotates around the tilted axis */}
        <group rotation-x={axialTilt}>
          <group ref={spinRef}>
            <mesh>
              <sphereGeometry args={[radius, 64, 64]} />
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                roughness={0.8}
                map={textureUrl ? texture : null}
                fog={false}
              />
            </mesh>

            {rings && (
              <mesh rotation-x={Math.PI / 2}>
                <ringGeometry args={[radius * 1.4, radius * 2.3, 64]} />
                <meshStandardMaterial
                  color="#c2a878"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.75}
                  fog={false}
                />
              </mesh>
            )}
          </group>
        </group>

        {/* Sphere of influence boundary — blue dashed ring in the XZ plane */}
        {soiRing && <primitive object={soiRing} />}
      </group>
    </group>
  );
}
