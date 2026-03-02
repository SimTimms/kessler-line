import type * as THREE from 'three';

/** Populated by CameraCapture inside Scene's Canvas; read by MagneticHUD for 3D→2D projection. */
export const sceneCamera = { current: null as THREE.Camera | null };
