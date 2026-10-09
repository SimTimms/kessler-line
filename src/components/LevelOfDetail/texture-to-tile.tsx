import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useCallback } from 'react';
import type { WebGLProgramParametersWithUniforms } from 'three';
import type { TileUniforms } from '../Asteroid/AsteroidStation';

interface textureToTileProps {
  textureUrl: string;
  tileTextureUrl: string;
  tileUniformsRef: React.RefObject<TileUniforms | null>;
}

// we need a placeholder texture to render the tile when the texture is not loaded
const TILE_PLACEHOLDER = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
TILE_PLACEHOLDER.needsUpdate = true;

export function useTextureToTile({ textureUrl, tileUniformsRef }: textureToTileProps) {
  const [map] = useTexture([textureUrl]);

  const onBeforeCompile = useCallback(
    (shader: WebGLProgramParametersWithUniforms) => {
      if (!tileUniformsRef) return;
      const tileUniforms: TileUniforms = tileUniformsRef.current ?? {
        uTileMap: { value: TILE_PLACEHOLDER },
        uTileRepeat: { value: new THREE.Vector2(1, 1) },
        uTileSplit: { value: 0.5 },
        uTileBlend: { value: 0.5 },
        uTileStrength: { value: 0 },
      };
      tileUniformsRef.current = tileUniforms;
      Object.assign(shader.uniforms, tileUniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform sampler2D uTileMap;
uniform vec2 uTileRepeat;
uniform float uTileSplit;
uniform float uTileBlend;
uniform float uTileStrength;`
        )
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
vec2 tileUv = vMapUv * uTileRepeat;
float tileMix = uTileStrength;
sampledDiffuseColor = mix( sampledDiffuseColor, texture2D( uTileMap, tileUv ), tileMix );
diffuseColor *= sampledDiffuseColor;
#endif`
        );
    },
    [tileUniformsRef]
  );

  map.colorSpace = THREE.SRGBColorSpace;
  return { map, onBeforeCompile };
}
