import { useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { RefObject } from 'react';
import * as THREE from 'three';

/**
 * Place/sync ship direction markers after physics (−1) and with the follow
 * camera (0), but before EffectComposer (default renderPriority 1).
 *
 * Priority must stay ≤ 0: any useFrame priority > 0 disables R3F's auto-render
 * and EffectComposer becomes the renderer — updates after that show up one
 * frame late (ring/arrows lag behind the ship at high speed).
 */
export const SHIP_DIRECTION_INDICATOR_FRAME_PRIORITY = 0;

const _proj = new THREE.Vector3();

/**
 * Project a world-space Object3D (typically the label anchor on an arrow) to
 * the canvas and pin a DOM label to that pixel. Call from the same late
 * useFrame that places the arrow so labels cannot lag behind at high speed.
 */
export function syncShipDirectionScreenLabel(
  object: THREE.Object3D | null | undefined,
  el: HTMLElement | null | undefined,
  camera: THREE.Camera,
  size: { width: number; height: number },
  visible: boolean,
  offsetYPx = 0
): void {
  if (!el) return;
  if (!object || !visible) {
    el.style.display = 'none';
    return;
  }

  object.updateWorldMatrix(true, false);
  _proj.setFromMatrixPosition(object.matrixWorld);
  _proj.project(camera);

  if (_proj.z > 1) {
    el.style.display = 'none';
    return;
  }

  const x = (_proj.x * 0.5 + 0.5) * size.width;
  const y = (-_proj.y * 0.5 + 0.5) * size.height + offsetYPx;
  el.style.display = 'block';
  el.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%, -50%)`;
}

const WRAP_STYLE =
  'position:absolute;top:0;left:0;transform-origin:0 0;pointer-events:none;display:none;z-index:10;';

/**
 * Creates a real DOM node next to the canvas (not via R3F JSX — R3F cannot
 * host HTML elements). Returns a stable ref to the wrapper for screen sync.
 */
export function useShipDirectionScreenLabelRoot(): RefObject<HTMLDivElement | null> {
  const gl = useThree((s) => s.gl);
  const labelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;

    const el = document.createElement('div');
    el.style.cssText = WRAP_STYLE;
    parent.appendChild(el);
    labelRef.current = el;

    return () => {
      el.remove();
      labelRef.current = null;
    };
  }, [gl]);

  return labelRef;
}
