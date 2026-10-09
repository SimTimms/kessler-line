import * as THREE from 'three';

const TILE_MIN_TEXTURE_SIZE = 4096;

/** Shared across remounts so an in-flight fetch is never started twice. */
let tileTexturePromise: Promise<THREE.Texture | null> | null = null;

interface LoadTileTextureProps {
  tileTextureUrl: string;
}
export function loadTileTexture(
  gl: THREE.WebGLRenderer,
  { tileTextureUrl }: LoadTileTextureProps
): Promise<THREE.Texture | null> {
  // Already requested — may still be in flight, which is exactly what we want to share.
  if (tileTexturePromise) {
    return tileTexturePromise;
  }

  // Downloading 1.4MB just for three to resize it to 4096x512 is worse than not bothering.
  if (gl.capabilities.maxTextureSize < TILE_MIN_TEXTURE_SIZE) {
    tileTexturePromise = Promise.resolve(null);
    return tileTexturePromise;
  }

  tileTexturePromise = new THREE.TextureLoader()
    .loadAsync(tileTextureUrl)
    .then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = gl.capabilities.getMaxAnisotropy();
      return texture;
    })
    .catch(() => null); // a failed fetch must not retry every frame

  return tileTexturePromise;
}
