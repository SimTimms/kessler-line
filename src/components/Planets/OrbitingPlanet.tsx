import { useRef, useEffect, useMemo, Suspense } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { gravityBodies } from '../../context/GravityRegistry';
import { useRegisterPlanetCollider } from '../../hooks/useRegisterPlanetCollider';

const _planetWorldPos = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const VISIBILITY_DIST = 15_000_000; // world-space units; ~15M covers cross-system visibility

interface PlanetSurfaceMaterialProps {
  textureUrl: string;
  normalMapUrl?: string;
  color: string;
  emissive: string;
  emissiveMap: THREE.Texture | null;
  emissiveIntensity: number;
  roughness: number;
  bumpMap: THREE.Texture | null;
  bumpScale: number;
  displacementMap: THREE.Texture | null;
  displacementScale: number;
  displacementBias: number;
}

function PlanetSurfaceMaterial({
  textureUrl,
  normalMapUrl,
  color,
  emissive,
  emissiveMap,
  emissiveIntensity,
  roughness,
  bumpMap,
  bumpScale,
}: PlanetSurfaceMaterialProps) {
  const [map, normalMap] = useTexture([textureUrl, normalMapUrl ?? textureUrl]);
  map.colorSpace = THREE.SRGBColorSpace;
  // If bumpMap is present, let it drive relief; normalMap would otherwise override it.
  const materialNormalMap = bumpMap ? null : normalMapUrl ? normalMap : null;
  return (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveMap={emissiveMap}
      emissiveIntensity={emissiveIntensity}
      roughness={roughness}
      map={map}
      normalMap={materialNormalMap}
      bumpMap={bumpMap}
      bumpScale={bumpScale}
      fog={false}
      onBeforeCompile={(shader) => {
        // DEBUG: intentionally break the fragment shader for Spector.js testing
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <output_fragment>',
          `gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // MAGENTA DEBUG BREAK`
        );
      }}
    />
  );
}

interface OrbitingPlanetProps {
  planetName: string;
  orbitRadius: number;
  orbitY: number;
  radius: number; // world-space sphere radius (in SolarSystem local space)
  color: string;
  glowColor?: string; // tint for the background glow sprite (defaults to color)
  /** White/grayscale radial PNG in public/ — replaces the procedural glow when set. */
  glowTextureUrl?: string;
  textureUrl?: string;
  normalMapUrl?: string;
  emissive?: string;
  orbitalSpeed: number; // rad/s
  spinSpeed: number; // rad/s (negative = retrograde)
  axialTilt: number; // radians
  initialAngle: number; // radians
  rings?: boolean;
  showGlowSprite?: boolean;
  showColonies?: boolean; // render procedural colony-lights emissive map
  useBumpMap?: boolean; // render procedural crater bump map
  gravityMu?: number; // GM in world-space units (optional)
  gravitySoiRadius?: number; // sphere of influence radius in world-space units (optional)
  gravitySurfaceRadius?: number; // physical surface radius in world-space units (optional)
  gravityOrbitAltitude?: number; // ideal orbit altitude above surface (optional)
}

export default function OrbitingPlanet({
  planetName,
  orbitRadius,
  orbitY,
  radius,
  color,
  textureUrl,
  normalMapUrl,
  emissive = '#000000',
  orbitalSpeed,
  spinSpeed,
  axialTilt,
  initialAngle,
  rings = false,
  showColonies = false,
  useBumpMap = false,
  gravityMu,
  gravitySoiRadius,
  gravitySurfaceRadius,
  gravityOrbitAltitude,
}: OrbitingPlanetProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const planetCenterRef = useRef<THREE.Group>(null);
  const meshVisRef = useRef<THREE.Group>(null);
  const planetMeshRef = useRef<THREE.Mesh>(null);
  const prevWorldPosRef = useRef(new THREE.Vector3());
  const hasPrevWorldPosRef = useRef(false);

  const colliderSurfaceRadius = planetName === 'Mars' ? undefined : gravitySurfaceRadius;
  useRegisterPlanetCollider(planetCenterRef, planetName, colliderSurfaceRadius);

  const soiRing = useMemo(() => {
    if (gravitySoiRadius === undefined || gravitySurfaceRadius === undefined) return null;
    const soiLocalRadius = (gravitySoiRadius / gravitySurfaceRadius) * radius;
    const segments = 128;
    const arr = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      arr[i * 3] = Math.cos(theta) * soiLocalRadius;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = Math.sin(theta) * soiLocalRadius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineDashedMaterial({
      color: 0x4499ff,
      dashSize: soiLocalRadius * 0.04,
      gapSize: soiLocalRadius * 0.04,
      opacity: 0.35,
      transparent: true,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, [gravitySoiRadius, gravitySurfaceRadius, radius]);

  const bumpTexture = useMemo(() => {
    if (!useBumpMap) return null;
    if (planetName === 'Mars') return '/textures/mars-bump-alpha.png';
  }, [useBumpMap, planetName]);
  const marsNormalTexture = useTexture('/textures/mars-normal.jpg');
  const marsEmissiveTexture = useTexture('/textures/mars-emissive.jpg');
  marsEmissiveTexture.colorSpace = THREE.SRGBColorSpace;
  const coloniesTexture = showColonies ? marsEmissiveTexture : null;

  const isNeptune = planetName === 'Neptune';
  const materialColor = isNeptune ? '#84c8ff' : color;
  const materialEmissive = showColonies ? '#ffffff' : isNeptune ? '#123d8a' : emissive;
  const materialEmissiveIntensity = showColonies ? 1.5 : isNeptune ? 1.15 : 1.0;
  const materialRoughness = isNeptune ? 0.62 : 0.2;
  const materialBumpScale = useBumpMap ? (isNeptune ? -0.35 : -0.6) : 0;
  const resolvedBumpMap = planetName === 'Mars' ? marsNormalTexture : bumpTexture;
  const resolvedBumpScale = planetName === 'Mars' ? 0.6 : materialBumpScale;
  const resolvedDisplacementMap = useBumpMap ? resolvedBumpMap : null;
  const resolvedDisplacementScale = useBumpMap ? 0.0 : 0;
  const resolvedDisplacementBias = useBumpMap ? 100.0 : 0;

  const neptuneRimMaterial = useMemo(() => {
    if (!isNeptune) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#46f4ff') },
        uIntensity: { value: 1.8 },
      },
      vertexShader: `
        varying vec3 vNormalW;
        void main() {
          vNormalW = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormalW;
        uniform vec3 uColor;
        uniform float uIntensity;
        void main() {
          float lit = max(dot(normalize(vNormalW), vec3(-1.0, 0.0, 0.0)), 0.0);
          float band = smoothstep(0.05, 0.95, lit);
          float alpha = pow(band, 2.2) * 0.55;
          gl_FragColor = vec4(uColor * band * uIntensity, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      fog: false,
    });
  }, [isNeptune]);

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

  useEffect(() => {
    return () => {
      neptuneRimMaterial?.dispose();
    };
  }, [neptuneRimMaterial]);

  useFrame(({ camera }, delta) => {
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

    // Distance-based visibility — orbits still tick; only the mesh is hidden.
    // Reuse _planetWorldPos if gravity already populated it, otherwise fetch it here.
    if (meshVisRef.current && planetCenterRef.current) {
      if (!gravityBodies.has(planetName)) {
        planetCenterRef.current.getWorldPosition(_planetWorldPos);
      }
      camera.getWorldPosition(_camPos);
      const visibilityDist = isNeptune ? Number.POSITIVE_INFINITY : VISIBILITY_DIST;
      meshVisRef.current.visible = _camPos.distanceTo(_planetWorldPos) < visibilityDist;
    }
  });

  return (
    <group ref={orbitRef}>
      <group ref={planetCenterRef} position={[orbitRadius, 0, 0]}>
        <group ref={meshVisRef}>
          <group position={[0, orbitY, 0]}>
            <group rotation-x={axialTilt}>
              <group ref={spinRef}>
                <mesh ref={planetMeshRef}>
                  <sphereGeometry args={[radius, 64, 64]} />
                  {textureUrl ? (
                    <Suspense
                      fallback={
                        <meshStandardMaterial
                          color={materialColor}
                          emissive={0}
                          emissiveMap={coloniesTexture}
                          emissiveIntensity={materialEmissiveIntensity}
                          roughness={materialRoughness}
                          metalness={1.0}
                          bumpMap={resolvedBumpMap as THREE.Texture | null}
                          bumpScale={resolvedBumpScale}
                          displacementMap={resolvedDisplacementMap as THREE.Texture | null}
                          displacementScale={resolvedDisplacementScale}
                          displacementBias={resolvedDisplacementBias}
                          fog={false}
                        />
                      }
                    >
                      <PlanetSurfaceMaterial
                        textureUrl={textureUrl}
                        normalMapUrl={normalMapUrl}
                        color={materialColor}
                        emissive={materialEmissive}
                        emissiveMap={coloniesTexture}
                        emissiveIntensity={materialEmissiveIntensity}
                        roughness={materialRoughness}
                        bumpMap={resolvedBumpMap as THREE.Texture | null}
                        bumpScale={resolvedBumpScale}
                        displacementMap={resolvedDisplacementMap as THREE.Texture | null}
                        displacementScale={resolvedDisplacementScale}
                        displacementBias={resolvedDisplacementBias}
                      />
                    </Suspense>
                  ) : (
                    <meshStandardMaterial
                      color={materialColor}
                      emissive={materialEmissive}
                      emissiveMap={coloniesTexture}
                      emissiveIntensity={materialEmissiveIntensity}
                      roughness={materialRoughness}
                      bumpMap={resolvedBumpMap as THREE.Texture | null}
                      bumpScale={resolvedBumpScale}
                      displacementMap={resolvedDisplacementMap as THREE.Texture | null}
                      displacementScale={resolvedDisplacementScale}
                      displacementBias={resolvedDisplacementBias}
                      fog={false}
                    />
                  )}
                </mesh>
                {isNeptune && neptuneRimMaterial && (
                  <mesh scale={[1.018, 1.018, 1.018]}>
                    <sphereGeometry args={[radius, 64, 64]} />
                    <primitive object={neptuneRimMaterial} attach="material" />
                  </mesh>
                )}

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
          </group>

          {/* Sphere of influence boundary — blue dashed ring in the XZ plane */}
          {soiRing && <primitive object={soiRing} />}
        </group>
      </group>
    </group>
  );
}
