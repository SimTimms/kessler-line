import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shipDestroyed, shipQuaternion } from '../../context/ShipState';
import {
  CAMERA_ATTACH_OFFSET,
  CAMERA_MOUSE_SENSITIVITY,
  CAMERA_WHEEL_SENSITIVITY,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
} from '../../config/visualConfig';
import { KEY_TOGGLE_CAMERA_DECOUPLE } from '../../config/keybindings';
import { sceneCamera } from '../../context/CameraRef';

/**
 * Persists across React remounts so nav view is not lost when the general-movement
 * tutorial auto-advances after entering nav camera. Reset when switching tutorial mode
 * in TutorialShell.
 */
export const tutorialNavViewModeRef = { current: false };

interface TutorialFollowCameraProps {
  followTarget: { current: THREE.Vector3 };
  followOffset?: [number, number, number];
}

const _offset = new THREE.Vector3();
const _worldOffset = new THREE.Vector3();
const _target = new THREE.Vector3();
const _followQuat = new THREE.Quaternion();
const _desiredCameraPos = new THREE.Vector3();
const _smoothedLookAt = new THREE.Vector3();

const CAMERA_POSITION_LERP_SPEED = 8;
const CAMERA_LOOKAT_LERP_SPEED = 10;
const NAVVIEW_HEIGHT = 1000;
const NAVVIEW_POSITION_LERP_SPEED = 4.2;
const NAVVIEW_LOOKAT_LERP_SPEED = 5.2;
const NAVVIEW_MIN_HEIGHT = 600;
const NAVVIEW_MAX_HEIGHT = 12000;
const NAVVIEW_TOPDOWN_PHI = 0.02;

export default function TutorialFollowCamera({
  followTarget,
  followOffset = CAMERA_ATTACH_OFFSET,
}: TutorialFollowCameraProps) {
  const { camera, gl, scene } = useThree();
  const followSpherical = useRef(new THREE.Spherical(10, Math.PI / 2, Math.PI));
  const navSpherical = useRef(new THREE.Spherical(NAVVIEW_HEIGHT, NAVVIEW_TOPDOWN_PHI, Math.PI));
  const didInit = useRef(false);
  const didInitCameraPose = useRef(false);
  const isPointerDown = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    sceneCamera.current = camera;
    scene.add(camera);
    return () => {
      sceneCamera.current = null;
      scene.add(camera);
    };
  }, [camera, scene]);

  useEffect(() => {
    _offset.set(...followOffset);
    followSpherical.current.setFromVector3(_offset);
    // Start navview above ship using current follow yaw so switching feels natural.
    navSpherical.current.theta = followSpherical.current.theta;
    navSpherical.current.phi = NAVVIEW_TOPDOWN_PHI;
    navSpherical.current.radius = NAVVIEW_HEIGHT;
    didInit.current = true;
  }, [followOffset]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      if (tutorialNavViewModeRef.current) {
        navSpherical.current.theta -= dx * CAMERA_MOUSE_SENSITIVITY;
      } else {
        followSpherical.current.theta -= dx * CAMERA_MOUSE_SENSITIVITY;
        followSpherical.current.phi -= dy * CAMERA_MOUSE_SENSITIVITY;
        followSpherical.current.phi = THREE.MathUtils.clamp(
          followSpherical.current.phi,
          0.05,
          Math.PI - 0.05
        );
      }
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (tutorialNavViewModeRef.current) {
        navSpherical.current.radius *= 1 + e.deltaY * CAMERA_WHEEL_SENSITIVITY;
        navSpherical.current.radius = THREE.MathUtils.clamp(
          navSpherical.current.radius,
          NAVVIEW_MIN_HEIGHT,
          NAVVIEW_MAX_HEIGHT
        );
      } else {
        const safeMin = Math.max(
          CAMERA_ZOOM_MIN,
          new THREE.Vector3(...followOffset).length() * 0.5
        );
        followSpherical.current.radius *= 1 + e.deltaY * CAMERA_WHEEL_SENSITIVITY;
        followSpherical.current.radius = THREE.MathUtils.clamp(
          followSpherical.current.radius,
          safeMin,
          CAMERA_ZOOM_MAX
        );
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== KEY_TOGGLE_CAMERA_DECOUPLE) return;
      if (e.repeat) return; // avoid repeat toggling follow ↔ nav in one held press
      const wasNav = tutorialNavViewModeRef.current;
      tutorialNavViewModeRef.current = !tutorialNavViewModeRef.current;
      if (tutorialNavViewModeRef.current) {
        // Lock navview to top-down while preserving its own stored yaw/zoom.
        navSpherical.current.phi = NAVVIEW_TOPDOWN_PHI;
        navSpherical.current.radius = THREE.MathUtils.clamp(
          navSpherical.current.radius,
          NAVVIEW_MIN_HEIGHT,
          NAVVIEW_MAX_HEIGHT
        );
      }
      if (!wasNav && tutorialNavViewModeRef.current) {
        window.dispatchEvent(new CustomEvent('TutorialNavCameraEntered'));
      }
      if (wasNav && !tutorialNavViewModeRef.current) {
        window.dispatchEvent(new CustomEvent('TutorialFollowCameraEntered'));
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [followOffset, gl]);

  useFrame((_, delta) => {
    if (shipDestroyed.current) return; // lock camera at last pose on destruction

    if (!didInit.current) {
      _offset.set(...followOffset);
      followSpherical.current.setFromVector3(_offset);
      didInit.current = true;
    }

    _target.copy(followTarget.current);
    if (tutorialNavViewModeRef.current) {
      // Yaw-only in navview: keep camera top-down to avoid X/Z axis tilt.
      navSpherical.current.phi = NAVVIEW_TOPDOWN_PHI;
      _offset.setFromSpherical(navSpherical.current);
      _desiredCameraPos.copy(_target).add(_offset);
    } else {
      _followQuat.copy(shipQuaternion).normalize();
      _offset.setFromSpherical(followSpherical.current);
      _worldOffset.copy(_offset).applyQuaternion(_followQuat);
      _desiredCameraPos.copy(_target).add(_worldOffset);
    }

    if (!didInitCameraPose.current) {
      camera.position.copy(_desiredCameraPos);
      _smoothedLookAt.copy(_target);
      didInitCameraPose.current = true;
    } else {
      const posAlpha =
        1 -
        Math.exp(
          -(tutorialNavViewModeRef.current
            ? NAVVIEW_POSITION_LERP_SPEED
            : CAMERA_POSITION_LERP_SPEED) * delta
        );
      const lookAlpha =
        1 -
        Math.exp(
          -(tutorialNavViewModeRef.current ? NAVVIEW_LOOKAT_LERP_SPEED : CAMERA_LOOKAT_LERP_SPEED) *
            delta
        );
      camera.position.lerp(_desiredCameraPos, posAlpha);
      _smoothedLookAt.lerp(_target, lookAlpha);
    }

    camera.lookAt(_smoothedLookAt);
  });

  return null;
}
