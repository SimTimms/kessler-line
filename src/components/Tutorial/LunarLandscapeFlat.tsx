import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shipPosRef } from '../../context/ShipPos';
import { buildLunarColorMap, buildLunarBumpMap } from '../../utils/lunarTextureGen';

// How far below the ship origin the surface sits
const GROUND_Y = -150;
// Large enough to fill the viewport at any camera angle
const PLANE_SIZE = 4000;
// Tiles must be large enough that seam lines rarely enter the camera's ~200-unit
// field of view. At 3 repeats each tile is ~1333 units wide — well off-screen.
const TEXTURE_REPEAT = 3;
// World-space width of one texture tile, used for UV scrolling
const TILE_WORLD_SIZE = PLANE_SIZE / TEXTURE_REPEAT;

/**
 * Horizontal distance from ship (XZ) where terrain starts blending to black.
 * Plane half-extent is PLANE_SIZE/2 — fade must reach 1.0 *before* that (~2000) or the rim stays gray.
 */
const HORIZON_FADE_START = 350;
/** Past this XZ radius, ground is fully black (side midpoints of the square are at PLANE_SIZE/2). */
const HORIZON_FADE_END = 1650;

export default function LunarLandscape() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  const colorMap = useMemo(() => {
    const tex = buildLunarColorMap(2048, 2048);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(TEXTURE_REPEAT, TEXTURE_REPEAT);
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    return tex;
  }, [gl]);

  const bumpMap = useMemo(() => {
    const tex = buildLunarBumpMap(2048, 2048);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(TEXTURE_REPEAT, TEXTURE_REPEAT);
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    return tex;
  }, [gl]);

  const shipXZUniform = useMemo(() => ({ value: new THREE.Vector2(0, 0) }), []);

  const groundMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: colorMap,
      bumpMap,
      bumpScale: 8,
      displacementMap: bumpMap,
      displacementScale: 115,
      displacementBias: -7.5,
      roughness: 0.95,
      metalness: 0,
    });
    m.customProgramCacheKey = () => 'lunarHorizonFadeWorldDisplace';

    m.onBeforeCompile = (shader) => {
      shader.uniforms.uLunarShipXZ = shipXZUniform;
      shader.uniforms.uLunarFadeStart = { value: HORIZON_FADE_START };
      shader.uniforms.uLunarFadeEnd = { value: HORIZON_FADE_END };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vLunarWorldPos;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vLunarWorldPos = worldPosition.xyz;`
      );

      // World-space displacement: UV derived from model-space world position so
      // vertex heights stay stable as the mesh translates with the ship each frame.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <displacementvmap_vertex>',
        `#ifdef USE_DISPLACEMENTMAP
          vec4 _lwp = modelMatrix * vec4(transformed, 1.0);
          vec2 _luv = fract((_lwp.xz / ${PLANE_SIZE.toFixed(1)} + 0.5) * ${TEXTURE_REPEAT.toFixed(1)});
          transformed += normalize(objectNormal) * (texture2D(displacementMap, _luv).x * displacementScale + displacementBias);
        #endif`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vLunarWorldPos;
        uniform vec2 uLunarShipXZ;
        uniform float uLunarFadeStart;
        uniform float uLunarFadeEnd;`
      );

      // Radial fade to black before the finite plane rim; mix uses true black (not fog) so it matches the canvas.
      // uLunarHFade is reused after dithering — dithering would otherwise add grain to "black" and look semi-opaque.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        `float uLunarHorizDist = length(vLunarWorldPos.xz - uLunarShipXZ);
        float uLunarHFade = smoothstep(uLunarFadeStart, uLunarFadeEnd, uLunarHorizDist);
        #include <fog_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), uLunarHFade);
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        if (uLunarHFade > 0.985) {
          gl_FragColor.rgb = vec3(0.0);
        }
        `
      );
    };

    return m;
  }, [colorMap, bumpMap, shipXZUniform]);

  useEffect(() => {
    return () => {
      colorMap.dispose();
      bumpMap.dispose();
      groundMaterial.dispose();
    };
  }, [colorMap, bumpMap, groundMaterial]);

  useFrame(() => {
    const ship = shipPosRef.current;
    const mesh = meshRef.current;
    shipXZUniform.value.set(ship.x, ship.z);
    if (!mesh) return;

    // Keep the plane centered under the ship so it never runs out of ground
    mesh.position.x = ship.x;
    mesh.position.z = ship.z;

    // Scroll the UV offset relative to ship travel distance.
    // Dividing by TILE_WORLD_SIZE maps world units to normalized texture coords.
    const offsetX = ship.x / TILE_WORLD_SIZE;
    const offsetZ = -ship.z / TILE_WORLD_SIZE; // negated: +Z flight scrolls terrain backward
    colorMap.offset.set(offsetX, offsetZ);
    bumpMap.offset.set(offsetX, offsetZ);
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, GROUND_Y, 0]}
      receiveShadow={true}
      material={groundMaterial}
    >
      {/* Subdivided for displacement — more segments = smoother height field.
          Note: scrolling UV offsets cause per-vertex height jumps each frame;
          increase segments to reduce visible popping, or lower displacementScale. */}
      <planeGeometry args={[PLANE_SIZE, PLANE_SIZE, 128, 128]} />
    </mesh>
  );
}
