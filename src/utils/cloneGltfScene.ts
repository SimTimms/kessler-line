import type { Group, Object3D } from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

/**
 * Independent instance of a GLTF scene graph.
 * Never insert the useGLTF cache object into the live scene — a second
 * `<primitive object={gltf.scene}>` (or a naive clone of a skinned mesh)
 * reparents / rebinds the player ship and leaves the camera following an empty group.
 */
export function cloneGltfScene(source: Object3D): Group {
  return cloneSkinned(source) as Group;
}
