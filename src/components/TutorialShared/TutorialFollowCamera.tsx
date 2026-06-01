import { useEffect, useRef, type RefObject } from 'react';
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
import {
  clampCameraForInboundPlanetHold,
  shouldHoldCameraForPlanetImpact,
} from '../../utils/tutorialPlanetCameraHold';

/**
 * Persists across React remounts so nav view is not lost when the general-movement
 * tutorial auto-advances after entering nav camera. Reset when switching tutorial mode
 * in TutorialShell.
 */
export const tutorialNavViewModeRef = { current: false };

interface TutorialFollowCameraProps {
  followTarget: { current: THREE.Vector3 };
  followOffset?: [number, number, number];
  zoomMax?: number;
  /** When set, follow this object's world position (overrides followTarget each frame). */
  attachTo?: RefObject<THREE.Object3D | null>;
  /** Ignore pitch/roll — yaw-only offset for the follow camera. */
  flattenBanking?: boolean;
  /**
   * Orbit in ship-local space and roll the view with the hull (ship stays level on
   * screen; the world appears to bank underneath you).
   */
  followShipOrientation?: boolean;
  /** useFrame priority (lower runs earlier in the frame). */
  framePriority?: number;
  /**
   * When set and the ship is inbound below this surface altitude, clamp camera
   * distance from the primary body so the view stays on the planet's outskirts.
   */
  planetImpactCameraHoldMaxAltitude?: number;
}

const _offset = new THREE.Vector3();
const _worldOffset = new THREE.Vector3();
const _target = new THREE.Vector3();
const _followQuat = new THREE.Quaternion();
const _shipUp = new THREE.Vector3();
const _flatForward = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _desiredCameraPos = new THREE.Vector3();
const _smoothedLookAt = new THREE.Vector3();
const _shipForward = new THREE.Vector3(0, 0, 1);
const CAMERA_POSITION_LERP_SPEED = 8;
const CAMERA_LOOKAT_LERP_SPEED = 10;
const NAVVIEW_HEIGHT = 50000;
const NAVVIEW_POSITION_LERP_SPEED = 4.2;
const NAVVIEW_LOOKAT_LERP_SPEED = 5.2;
const NAVVIEW_MIN_HEIGHT = 600;
const NAVVIEW_MAX_HEIGHT = 250000;
const NAVVIEW_TOPDOWN_PHI = 0.02;

export default function TutorialFollowCamera({
  followTarget,
  followOffset = CAMERA_ATTACH_OFFSET,
  zoomMax = CAMERA_ZOOM_MAX,
  attachTo,
  flattenBanking = false,
  followShipOrientation = false,
  framePriority = 0,
  planetImpactCameraHoldMaxAltitude,
}: TutorialFollowCameraProps) {
  const { camera, gl, scene } = useThree();
  const followSpherical = useRef(new THREE.Spherical(10, Math.PI / 2, Math.PI));
  const navSpherical = useRef(new THREE.Spherical(NAVVIEW_HEIGHT, NAVVIEW_TOPDOWN_PHI, Math.PI));
  const didInit = useRef(false);
  const didInitCameraPose = useRef(false);
  const smoothedCameraUp = useRef(new THREE.Vector3(0, 1, 0));
  const isPointerDown = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    sceneCamera.current = camera;
    scene.add(camera);
    return () => {
      sceneCamera.current = null;
      scene.remove(camera);
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
          zoomMax
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
  }, [followOffset, gl, zoomMax]);

  useFrame((_, delta) => {
    if (shipDestroyed.current) return; // lock camera at last pose on destruction

    if (!didInit.current) {
      _offset.set(...followOffset);
      followSpherical.current.setFromVector3(_offset);
      didInit.current = true;
    }

    if (attachTo?.current) {
      attachTo.current.getWorldPosition(_target);
    } else {
      _target.copy(followTarget.current);
    }
    if (tutorialNavViewModeRef.current) {
      // Yaw-only in navview: keep camera top-down to avoid X/Z axis tilt.
      navSpherical.current.phi = NAVVIEW_TOPDOWN_PHI;
      _offset.setFromSpherical(navSpherical.current);
      _desiredCameraPos.copy(_target).add(_offset);
    } else {
      if (followShipOrientation) {
        if (attachTo?.current) {
          attachTo.current.getWorldQuaternion(_followQuat);
        } else {
          _followQuat.copy(shipQuaternion).normalize();
        }
      } else if (flattenBanking) {
        _followQuat.copy(shipQuaternion).normalize();
        _flatForward.set(0, 0, 1).applyQuaternion(_followQuat);
        _flatForward.y = 0;
        if (_flatForward.lengthSq() > 1e-8) {
          _flatForward.normalize();
          _followQuat.setFromUnitVectors(_shipForward, _flatForward);
        } else {
          _followQuat.identity();
        }
      } else {
        _followQuat.copy(shipQuaternion).normalize();
      }
      _offset.setFromSpherical(followSpherical.current);
      _worldOffset.copy(_offset).applyQuaternion(_followQuat);
      _desiredCameraPos.copy(_target).add(_worldOffset);
    }

    if (
      planetImpactCameraHoldMaxAltitude !== undefined &&
      !tutorialNavViewModeRef.current &&
      shouldHoldCameraForPlanetImpact(planetImpactCameraHoldMaxAltitude)
    ) {
      clampCameraForInboundPlanetHold(_desiredCameraPos, planetImpactCameraHoldMaxAltitude);
    }

    const rollViewWithShip = followShipOrientation && !tutorialNavViewModeRef.current;

    if (!didInitCameraPose.current) {
      camera.position.copy(_desiredCameraPos);
      _smoothedLookAt.copy(_target);
      if (rollViewWithShip) {
        _shipUp.set(0, 1, 0).applyQuaternion(_followQuat);
        smoothedCameraUp.current.copy(_shipUp);
        camera.up.copy(_shipUp);
      }
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
      if (rollViewWithShip) {
        _shipUp.set(0, 1, 0).applyQuaternion(_followQuat);
        smoothedCameraUp.current.lerp(_shipUp, lookAlpha);
        camera.up.copy(smoothedCameraUp.current);
      }
    }

    if (rollViewWithShip) {
      camera.lookAt(_smoothedLookAt);
    } else {
      camera.up.copy(_worldUp);
      camera.lookAt(_smoothedLookAt);
    }

  }, framePriority);

  return null;
}
