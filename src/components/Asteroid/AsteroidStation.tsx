import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useTextureToTile } from '../LevelOfDetail/texture-to-tile';
import { loadTileTexture } from '../LevelOfDetail/load-tile-texture';

const DEFAULT_URL = '/models/asteroid-station.glb';
/** Same as decorative salvage rocks — authored GLB normals are too strong at world scale. */

const TILE_TEXTURE_URL = './textures/asteroidStation/asteroid-diffuse-high-tile.jpg';
const DIFFUSE_TEXTURE_URL = './textures/asteroidStation/asteroid-diffuse-high.jpg';
const _camPos = new THREE.Vector3();
const _asteroidWorldPos = new THREE.Vector3();
const LOAD_TILE_DISTANCE = 3000;
/** How many times the close-up tile repeats across the mesh UVs. */
const TILE_REPEAT = 8;

export interface AsteroidStationProps {
  url?: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  mineableId?: string;
  collisionRadius?: number;
  label?: string;
  /** Multiplier on the model's normal map. 1 = as authored, 0 = flat shading. */
  normalScale?: number;
}

export interface TileUniforms {
  uTileMap: { value: THREE.Texture };
  uTileRepeat: { value: THREE.Vector2 };
  uTileSplit: { value: number };
  uTileBlend: { value: number };
  uTileStrength: { value: number };
}

export default function AsteroidStation({
  url = DEFAULT_URL,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: AsteroidStationProps) {
  const gltf = useGLTF(url) as unknown as { scene: THREE.Group };
  const modelScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const groupRef = useRef<THREE.Group>(null);

  const gl = useThree((state) => state.gl);
  const tileUniformsRef = useRef<TileUniforms | null>(null);

  const { map, onBeforeCompile } = useTextureToTile({
    textureUrl: DIFFUSE_TEXTURE_URL,
    tileTextureUrl: TILE_TEXTURE_URL,
    tileUniformsRef,
  });

  useEffect(() => {
    modelScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (child.name.includes('asteroid-secondary')) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.material = new THREE.MeshStandardMaterial({ map });

        child.material.onBeforeCompile = onBeforeCompile;
        if (tileUniformsRef.current) {
          child.material.uniforms = tileUniformsRef.current;
        }
        return;
      }
    });
  }, [modelScene, tileUniformsRef]);

  useFrame(({ camera }) => {
    groupRef.current?.getWorldPosition(_asteroidWorldPos);
    camera.getWorldPosition(_camPos);
    const camDist = _camPos.distanceTo(_asteroidWorldPos);

    if (camDist < LOAD_TILE_DISTANCE) {
      loadTileTexture(gl, {
        tileTextureUrl: TILE_TEXTURE_URL,
      }).then((texture) => {
        if (
          texture &&
          tileUniformsRef.current &&
          texture !== tileUniformsRef.current.uTileMap.value
        ) {
          tileUniformsRef.current.uTileMap.value = texture;
          tileUniformsRef.current.uTileRepeat.value.set(TILE_REPEAT, TILE_REPEAT);
          tileUniformsRef.current.uTileSplit.value = 0.5;
          tileUniformsRef.current.uTileBlend.value = 0.5;
          tileUniformsRef.current.uTileStrength.value = 1;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={modelScene} />
    </group>
  );
}

useGLTF.preload(DEFAULT_URL);
