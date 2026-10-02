import * as THREE from 'three';

const MARS_CAP_URL = '/textures/mars-high.jpg';
/** Cap is 8192px wide; three silently downscales past maxTextureSize, so skip the fetch on capped GPUs. */
const MARS_CAP_MIN_TEXTURE_SIZE = 8192;

/** Shared across remounts so an in-flight fetch is never started twice. */
let capTexturePromise: Promise<THREE.Texture | null> | null = null;

export function loadMarsCap(gl: THREE.WebGLRenderer): Promise<THREE.Texture | null> {
  // Already requested — may still be in flight, which is exactly what we want to share.
  if (capTexturePromise) {
    return capTexturePromise;
  }

  // Downloading 1.4MB just for three to resize it to 4096x512 is worse than not bothering.
  if (gl.capabilities.maxTextureSize < MARS_CAP_MIN_TEXTURE_SIZE) {
    capTexturePromise = Promise.resolve(null);
    return capTexturePromise;
  }

  capTexturePromise = new THREE.TextureLoader()
    .loadAsync(MARS_CAP_URL)
    .then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping; // longitude wraps
      texture.wrapT = THREE.ClampToEdgeWrapping; // latitude must not bleed past the band edges
      texture.anisotropy = gl.capabilities.getMaxAnisotropy();
      return texture;
    })
    .catch(() => null); // a failed fetch must not retry every frame

  return capTexturePromise;
}
