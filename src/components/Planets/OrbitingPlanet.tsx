import { useRef, useEffect, useMemo, useState, Suspense } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { gravityBodies } from '../../context/GravityRegistry';
import { useRegisterPlanetCollider } from '../../hooks/useRegisterPlanetCollider';

// ── Procedural bump map (craters + terrain) ──────────────────────────────
function buildMarsBumpMap(): THREE.CanvasTexture {
  const W = 2048,
    H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Neutral mid-gray base — 128 = flat
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, W, H);

  // Deterministic LCG
  let s = 98765;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  // Large-scale terrain swells
  for (let i = 0; i < 50; i++) {
    const x = rand() * W,
      y = rand() * H,
      r = rand() * 240 + 100;
    const v = Math.floor(128 + (rand() - 0.5) * 60);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${v},${v},${v},0.35)`);
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Large craters
  for (let i = 0; i < 80; i++) {
    const x = rand() * W,
      y = rand() * H,
      r = rand() * 60 + 20;
    const bowl = ctx.createRadialGradient(x, y, 0, x, y, r * 0.85);
    bowl.addColorStop(0, 'rgba(70,70,70,0.85)');
    bowl.addColorStop(0.7, 'rgba(100,100,100,0.4)');
    bowl.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = bowl;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Raised rim
    ctx.strokeStyle = 'rgba(195,195,195,0.55)';
    ctx.lineWidth = r * 0.12 + 1;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Medium craters
  for (let i = 0; i < 400; i++) {
    const x = rand() * W,
      y = rand() * H,
      r = rand() * 18 + 4;
    const bowl = ctx.createRadialGradient(x, y, 0, x, y, r);
    bowl.addColorStop(0, 'rgba(75,75,75,0.80)');
    bowl.addColorStop(0.75, 'rgba(110,110,110,0.25)');
    bowl.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = bowl;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(185,185,185,0.45)';
    ctx.lineWidth = r * 0.15 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.88, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Small pits
  for (let i = 0; i < 1200; i++) {
    const x = rand() * W,
      y = rand() * H,
      r = rand() * 5 + 1;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(85,85,85,0.75)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ── Procedural bump map (atmospheric bands + storm features) ─────────────
function buildNeptuneBumpMap(): THREE.CanvasTexture {
  const W = 2048,
    H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Neutral mid-gray base
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, W, H);

  // Deterministic LCG
  let s = 77531;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  // Atmospheric bands — horizontal strips at different latitudes
  const bands: [number, number, number, number][] = [
    [90, 22, 108, 0.5], // north polar darkening
    [68, 18, 142, 0.35], // bright polar band
    [48, 22, 112, 0.4], // dark mid-lat band
    [25, 18, 138, 0.28], // lighter band
    [0, 28, 118, 0.42], // equatorial darker
    [-22, 18, 136, 0.28], // lighter band south
    [-46, 22, 112, 0.38], // dark south band
    [-68, 18, 140, 0.3], // bright south polar
    [-90, 22, 106, 0.5], // south polar darkening
  ];

  for (const [lat, width, v, op] of bands) {
    const cy = ((90 - lat) / 180) * H;
    const hy = (width / 180) * H * 0.5;
    const g = ctx.createLinearGradient(0, cy - hy, 0, cy + hy);
    g.addColorStop(0, 'rgba(128,128,128,0)');
    g.addColorStop(0.5, `rgba(${v},${v},${v},${op})`);
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, cy - hy, W, hy * 2);
  }

  // Wavy turbulence at band boundaries
  for (let i = 0; i < 9; i++) {
    const baseLat = -80 + i * 20;
    const cy = ((90 - baseLat) / 180) * H;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    for (let x = 0; x < W; x += 8) {
      const wave = Math.sin(x * 0.006 + rand() * 6) * 18 + Math.sin(x * 0.013 + rand() * 4) * 9;
      ctx.lineTo(x, cy + wave);
    }
    const v = rand() > 0.5 ? 150 : 105;
    ctx.strokeStyle = `rgba(${v},${v},${v},${rand() * 0.18 + 0.08})`;
    ctx.lineWidth = rand() * 7 + 2;
    ctx.stroke();
  }

  // Great Dark Spot — large oval depression ~20°S, 280°E longitude
  {
    const cx = (280 / 360) * W;
    const cy = ((90 + 22) / 180) * H;
    const rx = W * 0.055;
    const ry = H * 0.065;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(68,68,68,0.78)');
    g.addColorStop(0.55, 'rgba(95,95,95,0.38)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 1.25, 0, Math.PI * 2);
    ctx.fill();
    // Bright rim
    ctx.strokeStyle = 'rgba(158,158,158,0.38)';
    ctx.lineWidth = rx * 0.06;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 1.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Scooter — bright cloud at ~42°S, 80°E
  {
    const cx = (80 / 360) * W;
    const cy = ((90 + 42) / 180) * H;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.3);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.028);
    g.addColorStop(0, 'rgba(172,172,172,0.72)');
    g.addColorStop(0.5, 'rgba(152,152,152,0.3)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, W * 0.038, H * 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Small Dark Spot 2 — ~55°S, 197°E
  {
    const cx = (197 / 360) * W;
    const cy = ((90 + 55) / 180) * H;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.022);
    g.addColorStop(0, 'rgba(78,78,78,0.62)');
    g.addColorStop(0.6, 'rgba(105,105,105,0.22)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, W * 0.028, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wispy high-altitude cloud streaks
  for (let i = 0; i < 28; i++) {
    const lat = (rand() - 0.5) * 140;
    const cy_streak = ((90 - lat) / 180) * H;
    const x0 = rand() * W;
    const len = rand() * W * 0.22 + W * 0.04;
    const wv = rand() * 7 - 3.5;
    ctx.beginPath();
    ctx.moveTo(x0, cy_streak);
    for (let x = x0; x < x0 + len; x += 12) {
      const wave = Math.sin((x - x0) * 0.022) * wv;
      ctx.lineTo(x % W, cy_streak + wave);
    }
    const v = rand() > 0.5 ? 158 : 100;
    ctx.strokeStyle = `rgba(${v},${v},${v},${rand() * 0.22 + 0.08})`;
    ctx.lineWidth = rand() * 2.5 + 0.8;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const _planetWorldPos = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const VISIBILITY_DIST = 15_000_000; // world-space units; ~15M covers cross-system visibility

function buildProceduralGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

interface PlanetGlowSpriteProps {
  glowTextureUrl?: string;
  radius: number;
  tint: string;
  opacity: number;
}

function PlanetGlowSprite({ glowTextureUrl, radius, tint, opacity }: PlanetGlowSpriteProps) {
  const fallbackMap = useMemo(() => buildProceduralGlowTexture(), []);
  const loadedMapRef = useRef<THREE.Texture | null>(null);
  const [map, setMap] = useState<THREE.Texture | null>(() => (glowTextureUrl ? null : fallbackMap));

  useEffect(() => {
    if (!glowTextureUrl) {
      if (loadedMapRef.current) {
        loadedMapRef.current.dispose();
        loadedMapRef.current = null;
      }
      setMap(fallbackMap);
      return;
    }

    let cancelled = false;
    setMap(null);

    const loader = new THREE.TextureLoader();
    loader.load(
      glowTextureUrl,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        const img = tex.image as HTMLImageElement;
        if (!img?.width || !img?.height) {
          tex.dispose();
          console.warn(`[PlanetGlow] Invalid image for "${glowTextureUrl}"`);
          setMap(fallbackMap);
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        if (loadedMapRef.current) loadedMapRef.current.dispose();
        loadedMapRef.current = tex;
        setMap(tex);
      },
      undefined,
      () => {
        if (cancelled) return;
        console.warn(`[PlanetGlow] Failed to load "${glowTextureUrl}", using procedural fallback.`);
        setMap(fallbackMap);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [glowTextureUrl, fallbackMap]);

  useEffect(
    () => () => {
      loadedMapRef.current?.dispose();
      loadedMapRef.current = null;
    },
    []
  );

  if (!map) return null;

  return (
    <sprite scale={[radius * 65, radius * 65, 1]} frustumCulled={false}>
      <spriteMaterial
        map={map}
        color={tint}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        opacity={opacity}
        fog={false}
      />
    </sprite>
  );
}

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
  displacementMap,
  displacementScale,
  displacementBias,
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
  glowColor,
  glowTextureUrl,
  textureUrl,
  normalMapUrl,
  emissive = '#000000',
  orbitalSpeed,
  spinSpeed,
  axialTilt,
  initialAngle,
  rings = false,
  showGlowSprite = true,
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
    if (planetName === 'Neptune') return buildNeptuneBumpMap();
    return buildMarsBumpMap();
  }, [useBumpMap, planetName]);
  const marsNormalTexture = useTexture('/mars-normal.jpg');
  const marsEmissiveTexture = useTexture('/mars-emissive.jpg');
  marsEmissiveTexture.colorSpace = THREE.SRGBColorSpace;
  const coloniesTexture = showColonies ? marsEmissiveTexture : null;

  const isNeptune = planetName === 'Neptune';
  const materialColor = isNeptune ? '#84c8ff' : color;
  const materialEmissive = showColonies ? '#ffffff' : isNeptune ? '#123d8a' : emissive;
  const materialEmissiveIntensity = showColonies ? 1.5 : isNeptune ? 1.15 : 1.0;
  const materialRoughness = isNeptune ? 0.62 : 0.8;
  const materialBumpScale = useBumpMap ? (isNeptune ? -0.35 : -0.6) : 0;
  const resolvedBumpMap = planetName === 'Mars' ? marsNormalTexture : bumpTexture;
  const resolvedBumpScale = planetName === 'Mars' ? 4.0 : materialBumpScale;
  const resolvedDisplacementMap = useBumpMap ? resolvedBumpMap : null;
  const resolvedDisplacementScale = useBumpMap ? 0.0 : 0;
  const resolvedDisplacementBias = useBumpMap ? 100.0 : 0;
  const glowOpacity = glowTextureUrl ? 0.04 : isNeptune ? 0.028 : 0.005;
  const glowTint = glowColor ?? color;
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
            {showGlowSprite && (
              <PlanetGlowSprite
                glowTextureUrl={glowTextureUrl}
                radius={radius}
                tint={glowTint}
                opacity={glowOpacity}
              />
            )}

            {/* Axial tilt applied once; spin group rotates around the tilted axis */}
            <group rotation-x={axialTilt}>
              <group ref={spinRef}>
                <mesh ref={planetMeshRef}>
                  <sphereGeometry args={[radius, 64, 64]} />
                  {textureUrl ? (
                    <Suspense
                      fallback={
                        <meshStandardMaterial
                          color={materialColor}
                          emissive={10000000}
                          emissiveMap={coloniesTexture}
                          emissiveIntensity={materialEmissiveIntensity}
                          roughness={materialRoughness}
                          bumpMap={resolvedBumpMap}
                          bumpScale={resolvedBumpScale}
                          displacementMap={resolvedDisplacementMap}
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
                        bumpMap={resolvedBumpMap}
                        bumpScale={resolvedBumpScale}
                        displacementMap={resolvedDisplacementMap}
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
                      bumpMap={resolvedBumpMap}
                      bumpScale={resolvedBumpScale}
                      displacementMap={resolvedDisplacementMap}
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
