import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  minimapViewportEnabled,
  minimapViewportBounds,
  minimapViewportZoomHalfSpan,
  minimapViewportPanCenter,
  minimapEffectComposerActive,
  minimapExcludedObjects,
} from '../../context/MinimapViewportState';
import {
  floatingOriginActiveRef,
  floatingOriginOffsetRef,
} from '../../context/FloatingOrigin';

// Camera altitude must be well above the largest planet radii (~4M world units).
const CAMERA_Y = 10_000_000;
// Far plane must reach from the camera down past the scene (objects sit near y=0).
const CAMERA_FAR = CAMERA_Y * 2;

/**
 * Renders the 3D scene a second time from a top-down orthographic camera,
 * clipped to the minimap's screen area using WebGL scissor/viewport.
 * Must be mounted inside the main Canvas.
 */
export default function MinimapViewportRenderer() {
  const orthCamera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_FAR);
    cam.up.set(0, 0, -1);
    return cam;
  }, []);

  useFrame(({ gl, scene, camera: mainCamera }) => {
    // When EffectComposer isn't mounted, no other priority>0 callback renders
    // the main scene. Do it here so the main view isn't blank.
    if (!minimapEffectComposerActive.current) {
      gl.render(scene, mainCamera);
    }

    if (!minimapViewportEnabled.current) return;

    const bounds = minimapViewportBounds.current;
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const halfSpan = minimapViewportZoomHalfSpan.current;
    if (halfSpan <= 0) return;

    const pan = minimapViewportPanCenter.current;
    const aspect = bounds.width / bounds.height;

    // Update orthographic frustum to match minimap zoom/pan.
    orthCamera.left = -halfSpan * aspect;
    orthCamera.right = halfSpan * aspect;
    orthCamera.top = halfSpan;
    orthCamera.bottom = -halfSpan;
    orthCamera.updateProjectionMatrix();

    // Position camera above the pan center, looking straight down.
    let camX = pan.x;
    let camZ = pan.z;

    // Convert simulation-space pan center to render-space when floating origin is active.
    if (floatingOriginActiveRef.current) {
      camX += floatingOriginOffsetRef.current.x;
      camZ += floatingOriginOffsetRef.current.z;
    }

    orthCamera.position.set(camX, CAMERA_Y, camZ);
    orthCamera.lookAt(camX, 0, camZ);
    orthCamera.updateMatrixWorld();

    // Convert CSS pixel bounds to GL viewport coords (GL Y is bottom-up).
    const canvas = gl.domElement;
    const pixelRatio = gl.getPixelRatio();
    const canvasHeight = canvas.clientHeight;

    const vpX = Math.round(bounds.left * pixelRatio);
    const vpY = Math.round((canvasHeight - bounds.top - bounds.height) * pixelRatio);
    const vpW = Math.round(bounds.width * pixelRatio);
    const vpH = Math.round(bounds.height * pixelRatio);

    // Hide excluded objects (ships, combat FX, particles) for the minimap pass.
    const hidden: THREE.Object3D[] = [];
    for (const obj of minimapExcludedObjects) {
      if (obj.visible) {
        obj.visible = false;
        hidden.push(obj);
      }
    }

    // Temporarily disable fog — the high-altitude camera would fog everything out.
    const savedFog = scene.fog;
    scene.fog = null;

    const prevAutoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setScissorTest(true);
    gl.setScissor(vpX, vpY, vpW, vpH);
    gl.setViewport(vpX, vpY, vpW, vpH);
    gl.clearDepth();
    gl.render(scene, orthCamera);

    // Restore everything.
    for (const obj of hidden) obj.visible = true;
    scene.fog = savedFog;
    gl.setScissorTest(false);
    gl.setViewport(0, 0, canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio);
    gl.autoClear = prevAutoClear;
  }, 2);

  return null;
}
