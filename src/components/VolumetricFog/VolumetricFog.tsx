import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Raymarched volumetric fog volume — a spherical pocket of animated FBM cloud
 * you can fly through, as opposed to the flat billboard ring `DustCloud` draws
 * or the scene-wide `fogExp2` the nav scenes attach.
 *
 * The march runs in unit-sphere space, so `density` behaves identically whether
 * the volume is 500 or 500,000 world units across.
 */

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;

  #include <common>
  #include <logdepthbuf_pars_vertex>

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
    #include <logdepthbuf_vertex>
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vWorldPos;

  uniform vec3 uCenter;
  uniform float uRadius;
  uniform vec3 uColor;
  uniform vec3 uLightColor;
  uniform vec3 uLightPos;
  uniform float uLightStrength;
  uniform float uDensity;
  uniform float uTime;
  uniform float uNoiseScale;
  uniform float uFalloff;
  uniform float uCoverage;
  uniform float uAnisotropy;
  uniform float uSeed;
  uniform vec3 uDrift;

  #include <common>
  #include <logdepthbuf_pars_fragment>

  float hash31(vec3 p) {
    p = fract(p * 0.1031 + uSeed);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int o = 0; o < OCTAVES; o++) {
      sum += amp * valueNoise(p);
      p = p * 2.02 + vec3(17.3, 9.1, 23.7);
      amp *= 0.5;
    }
    return sum;
  }

  /** Density at a point in unit-sphere space (|p| <= 1 is inside the volume). */
  float densityAt(vec3 p) {
    float r = length(p);
    if (r >= 1.0) return 0.0;

    // Soft shell so the volume never shows its geometric silhouette.
    float edge = pow(1.0 - r, uFalloff);
    float n = fbm(p * uNoiseScale + uDrift * uTime);

    // Carve the noise into wisps rather than an even haze.
    return edge * smoothstep(uCoverage, 1.0, n);
  }

  /** Entry/exit distances along a ray against the unit sphere; .y < 0 means a miss. */
  vec2 intersectUnitSphere(vec3 ro, vec3 rd) {
    float b = dot(ro, rd);
    float c = dot(ro, ro) - 1.0;
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
  }

  /** Henyey-Greenstein phase — forward scatter when uAnisotropy > 0. */
  float phaseHG(float cosTheta, float g) {
    float gg = g * g;
    float denom = 1.0 + gg - 2.0 * g * cosTheta;
    return (1.0 - gg) / (4.0 * PI * pow(max(denom, 1e-4), 1.5));
  }

  #ifdef FOG_LIGHT
  /** Short march toward the light so thick regions self-shadow. */
  float lightTransmittance(vec3 p, vec3 lightDir) {
    float stepSize = 1.0 / float(LIGHT_STEPS);
    float optical = 0.0;
    for (int j = 1; j <= LIGHT_STEPS; j++) {
      optical += densityAt(p + lightDir * (float(j) * stepSize)) * uDensity * stepSize;
    }
    return exp(-optical);
  }
  #endif

  void main() {
    #include <logdepthbuf_fragment>

    // Work in unit-sphere space: uniform scale keeps the ray direction intact.
    vec3 ro = (cameraPosition - uCenter) / uRadius;
    vec3 rd = normalize(vWorldPos - cameraPosition);

    vec2 hit = intersectUnitSphere(ro, rd);
    if (hit.y <= 0.0) discard;

    float tNear = max(hit.x, 0.0);
    float span = hit.y - tNear;
    if (span <= 0.0) discard;

    float stepSize = span / float(STEPS);
    // Dither the start offset — without it the march bands into onion rings.
    float jitter = hash12(gl_FragCoord.xy) * stepSize;

    #ifdef FOG_LIGHT
      vec3 lightDir = normalize((uLightPos - uCenter) / uRadius - ro);
      float phase = phaseHG(dot(rd, lightDir), uAnisotropy);
    #endif

    float transmittance = 1.0;
    vec3 scattered = vec3(0.0);

    for (int i = 0; i < STEPS; i++) {
      vec3 p = ro + rd * (tNear + jitter + float(i) * stepSize);
      float d = densityAt(p) * uDensity;
      if (d <= 0.0) continue;

      float absorbed = 1.0 - exp(-d * stepSize);

      vec3 lit = uColor;
      #ifdef FOG_LIGHT
        vec3 sunDir = normalize(uLightPos - (uCenter + p * uRadius));
        lit += uLightColor * uLightStrength * phase * lightTransmittance(p, sunDir);
      #endif

      scattered += transmittance * absorbed * lit;
      transmittance *= 1.0 - absorbed;
      if (transmittance < 0.01) break;
    }

    float alpha = 1.0 - transmittance;
    if (alpha <= 0.002) discard;

    gl_FragColor = vec4(scattered / max(alpha, 1e-4), alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface VolumetricFogProps {
  position?: [number, number, number];
  /** Volume radius in world units. */
  radius?: number;
  /** Base scattering colour of the cloud. */
  color?: THREE.ColorRepresentation;
  /** Optical thickness. Above ~4 the volume reads as solid. */
  density?: number;
  /** Samples per view ray — the main quality/cost dial. */
  steps?: number;
  /** FBM octaves. 3 is plenty at typical viewing distance. */
  octaves?: number;
  /** Noise features per volume radius: higher is wispier. */
  noiseScale?: number;
  /** Noise threshold: higher leaves more empty space between wisps. */
  coverage?: number;
  /** Edge softness exponent — higher pulls density toward the core. */
  falloff?: number;
  /** World-space drift of the noise field, in radii per second. */
  drift?: [number, number, number];
  /** Varies the noise field between instances. */
  seed?: number;
  /** World-space light position for in-scattering, or null for flat colour. */
  lightPosition?: [number, number, number] | null;
  lightColor?: THREE.ColorRepresentation;
  lightStrength?: number;
  /** Henyey-Greenstein g: > 0 forward scatters, giving a lit rim near the light. */
  anisotropy?: number;
  /** Shadow-march samples toward the light. Only used when lightPosition is set. */
  lightSteps?: number;
  visible?: boolean;
}

export default function VolumetricFog({
  position = [0, 0, 0],
  radius = 5000,
  color = '#5a6b9c',
  density = 1.6,
  steps = 24,
  octaves = 3,
  noiseScale = 2.6,
  coverage = 0.38,
  falloff = 1.6,
  drift = [0.01, 0.004, 0.008],
  seed = 0,
  lightPosition = null,
  lightColor = '#ffeedd',
  lightStrength = 1.4,
  anisotropy = 0.35,
  lightSteps = 3,
  visible = true,
}: VolumetricFogProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const centerRef = useRef(new THREE.Vector3());
  const scaleRef = useRef(new THREE.Vector3());

  const hasLight = lightPosition !== null;

  // Rebuilt only when a compile-time define changes; everything else is a uniform write.
  const material = useMemo(() => {
    const defines: Record<string, string> = {
      STEPS: String(Math.max(1, Math.round(steps))),
      OCTAVES: String(Math.max(1, Math.round(octaves))),
    };
    if (hasLight) {
      defines.FOG_LIGHT = '';
      defines.LIGHT_STEPS = String(Math.max(1, Math.round(lightSteps)));
    }

    return new THREE.ShaderMaterial({
      defines,
      uniforms: {
        uCenter: { value: new THREE.Vector3() },
        uRadius: { value: radius },
        uColor: { value: new THREE.Color(color) },
        uLightColor: { value: new THREE.Color(lightColor) },
        uLightPos: { value: new THREE.Vector3() },
        uLightStrength: { value: lightStrength },
        uDensity: { value: density },
        uTime: { value: 0 },
        uNoiseScale: { value: noiseScale },
        uFalloff: { value: falloff },
        uCoverage: { value: coverage },
        uAnisotropy: { value: anisotropy },
        uSeed: { value: seed },
        uDrift: { value: new THREE.Vector3() },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      fog: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, octaves, lightSteps, hasLight]);

  useEffect(() => () => material.dispose(), [material]);

  // Cheap prop -> uniform sync; no recompile.
  useEffect(() => {
    const u = material.uniforms;
    u.uColor.value.set(color);
    u.uLightColor.value.set(lightColor);
    u.uLightStrength.value = lightStrength;
    u.uDensity.value = density;
    u.uNoiseScale.value = noiseScale;
    u.uFalloff.value = falloff;
    u.uCoverage.value = coverage;
    u.uAnisotropy.value = anisotropy;
    u.uSeed.value = seed;
    u.uDrift.value.set(drift[0], drift[1], drift[2]);
    if (lightPosition) u.uLightPos.value.set(...lightPosition);
  }, [
    material,
    color,
    lightColor,
    lightStrength,
    density,
    noiseScale,
    falloff,
    coverage,
    anisotropy,
    seed,
    drift,
    lightPosition,
  ]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.visible) return;

    // useFrame runs before three updates the graph, so refresh this node's matrix.
    mesh.updateWorldMatrix(true, false);
    const center = mesh.getWorldPosition(centerRef.current);
    const worldRadius = mesh.getWorldScale(scaleRef.current).x;

    const u = material.uniforms;
    u.uTime.value += delta;
    u.uCenter.value.copy(center);
    u.uRadius.value = worldRadius;

    // Front faces are behind the camera once it enters the volume, so flip to the
    // back shell and stop depth-testing — inside a cloud, everything is fogged.
    const inside = state.camera.position.distanceTo(center) < worldRadius * 1.02;
    const side = inside ? THREE.BackSide : THREE.FrontSide;
    if (material.side !== side) {
      material.side = side;
      material.depthTest = !inside;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={radius} visible={visible} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
