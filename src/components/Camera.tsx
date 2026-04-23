import { useRef, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { thrustMultiplier, shipAcceleration } from '../context/ShipState';
import { hudShakeOffset } from '../context/HudShake';
import {
  shipInstructionMessage,
  scrapperIntroActive,
  scrapperWorldPos,
  scrapperWorldQuat,
} from '../context/CinematicState';
import {
  CAMERA_MOUSE_SENSITIVITY,
  CAMERA_WHEEL_SENSITIVITY,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  CAMERA_SHAKE_AMP_MAX,
  CAMERA_SHAKE_FREQUENCIES,
} from '../config/visualConfig';
import {
  SCRAPPER_INTRO_CAMERA_BEHIND_DIST,
  SCRAPPER_INTRO_CAMERA_HEIGHT,
  SCRAPPER_INTRO_CAMERA_BEHIND_OFFSET,
  SCRAPPER_LAUNCH_CAMERA_BEHIND_DIST,
  SCRAPPER_LAUNCH_CAMERA_HEIGHT,
  SCRAPPER_LAUNCH_CAMERA_Z_OFFSET,
  SCRAPPER_LAUNCH_CAMERA_Y_ROTATION,
  SCRAPPER_LAUNCH_CAMERA_Z_ROTATION,
  SCRAPPER_LAUNCH_CAMERA_EXIT_DISTANCE,
  SCRAPPER_INTRO_TO_LAUNCH_TRANSITION,
  SCRAPPER_LAUNCH_TO_PLAYER_TRANSITION,
} from '../config/scrapperConfig';
import { shipPosRef } from '../context/ShipPos';
import { KEY_TOGGLE_CAMERA_DECOUPLE } from '../config/keybindings';

// Scratch vectors — avoid allocating on every frame
const _offset = new THREE.Vector3();
const _target = new THREE.Vector3();
const _attachOffset = new THREE.Vector3(0, 14, -40);
const _scrapperOffset = new THREE.Vector3();
const _launchOffset = new THREE.Vector3();
const _launchComposedQuat = new THREE.Quaternion();
const _desiredPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();
// Computed once from config — Y rotation that swings the launch camera sideways
const _launchYRotQuat = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  SCRAPPER_LAUNCH_CAMERA_Y_ROTATION
);
const _launchZRotQuat = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 0, 1),
  SCRAPPER_LAUNCH_CAMERA_Z_ROTATION
);

/** Smoothstep easing — input must be in [0, 1]. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
interface OrbitCameraProps {
  followTarget?: { current: THREE.Vector3 };
  attachTo?: { current: THREE.Object3D | null };
}

export function OrbitCamera({ followTarget, attachTo }: OrbitCameraProps) {
  const { camera, gl, scene } = useThree();

  const isPointerDown = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const spherical = useRef(new THREE.Spherical(50, Math.PI / 4, 0));
  const didInitSpherical = useRef(false);
  const shakeTime = useRef(0);
  const [decoupled, setDecoupled] = useState(false);
  const [scrapperMode, setScrapperMode] = useState(scrapperIntroActive.current);
  const [launchMode, setLaunchMode] = useState(false);
  const launchEndedFiredRef = useRef(false);

  // Camera blend state — transitioningState drives the useEffect parenting;
  // transitioningRef is read each frame so changes are immediate.
  const [transitioningState, setTransitioningState] = useState(false);
  const transitioningRef = useRef(false);
  const transitionRef = useRef({
    active: false,
    t: 0,
    duration: 1.0,
    fromPos: new THREE.Vector3(),
    fromLookAt: new THREE.Vector3(),
  });

  // Stable callback to start a camera blend from the current position.
  const startTransition = useCallback(
    (duration: number, lookAt: THREE.Vector3) => {
      const tr = transitionRef.current;
      tr.fromPos.copy(camera.position);
      tr.fromLookAt.copy(lookAt);
      tr.t = 0;
      tr.duration = duration;
      tr.active = true;
    },
    [camera]
  );

  // Intro → launch: controls just enabled, hold the cinematic camera on the scrapper
  useEffect(() => {
    const onIntroEnded = () => {
      if (!scrapperMode) return;
      if (scrapperIntroActive.current) return;
      // Blend from intro camera to launch cinematic angle
      startTransition(SCRAPPER_INTRO_TO_LAUNCH_TRANSITION, scrapperWorldPos);
      setScrapperMode(false);
      setLaunchMode(true);
      launchEndedFiredRef.current = false;
    };
    window.addEventListener('ScrapperIntroEnded', onIntroEnded);
    return () => window.removeEventListener('ScrapperIntroEnded', onIntroEnded);
  }, [scrapperMode, startTransition]);

  // Launch → player: fired from useFrame when ship exceeds exit distance
  useEffect(() => {
    const onLaunchEnded = () => {
      // Blend from launch cinematic to normal player-follow camera.
      // Camera stays in scene space (transitioningState keeps it out of the ship group)
      // until the blend completes.
      startTransition(SCRAPPER_LAUNCH_TO_PLAYER_TRANSITION, shipPosRef.current);
      transitioningRef.current = true;
      setTransitioningState(true);
      setLaunchMode(false);
    };
    window.addEventListener('ScrapperLaunchEnded', onLaunchEnded);
    return () => window.removeEventListener('ScrapperLaunchEnded', onLaunchEnded);
  }, [startTransition]);

  useEffect(() => {
    if (scrapperMode || launchMode || decoupled || transitioningState) {
      scene.add(camera);
      return;
    }
    const parent = attachTo?.current;
    if (!parent) return;
    // attach() preserves world position when re-parenting, avoiding a single-frame pop
    parent.attach(camera);
    return () => {
      scene.attach(camera);
    };
  }, [attachTo, camera, scene, decoupled, scrapperMode, launchMode, transitioningState]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === KEY_TOGGLE_CAMERA_DECOUPLE) {
        setDecoupled((prev) => {
          const next = !prev;
          shipInstructionMessage.current = next ? 'CAMERA: FREE LOOK' : 'CAMERA: COUPLED';
          setTimeout(() => {
            shipInstructionMessage.current = '';
          }, 2000);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDestroyed = () => setDecoupled(true);
    window.addEventListener('ShipDestroyed', onDestroyed);
    return () => window.removeEventListener('ShipDestroyed', onDestroyed);
  }, []);

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

      spherical.current.theta -= dx * CAMERA_MOUSE_SENSITIVITY;
      spherical.current.phi -= dy * CAMERA_MOUSE_SENSITIVITY;
      spherical.current.phi = THREE.MathUtils.clamp(spherical.current.phi, 0.05, Math.PI - 0.05);
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      spherical.current.radius *= 1 + e.deltaY * CAMERA_WHEEL_SENSITIVITY;
      spherical.current.radius = THREE.MathUtils.clamp(
        spherical.current.radius,
        CAMERA_ZOOM_MIN,
        CAMERA_ZOOM_MAX
      );
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    if (!didInitSpherical.current) {
      spherical.current.setFromVector3(_attachOffset);
      didInitSpherical.current = true;
    }

    const excessMultiplier = Math.max(0, thrustMultiplier.current - 1);
    const isThrusting = shipAcceleration.current > 0 && excessMultiplier > 0;
    let shakeX = 0;
    let shakeY = 0;
    if (isThrusting) {
      shakeTime.current += delta * (8 + excessMultiplier * 0.3);
      const amp = Math.min(excessMultiplier * 0.05, CAMERA_SHAKE_AMP_MAX);
      const t = shakeTime.current;
      shakeX =
        (Math.sin(t * CAMERA_SHAKE_FREQUENCIES[0]) +
          Math.sin(t * CAMERA_SHAKE_FREQUENCIES[1]) * 0.5) *
        amp;
      shakeY =
        (Math.sin(t * CAMERA_SHAKE_FREQUENCIES[2]) +
          Math.sin(t * CAMERA_SHAKE_FREQUENCIES[3]) * 0.5) *
        amp;
      hudShakeOffset.x = shakeX * 4;
      hudShakeOffset.y = shakeY * 4;
    } else {
      shakeTime.current = 0;
      hudShakeOffset.x = 0;
      hudShakeOffset.y = 0;
    }

    const tr = transitionRef.current;

    if (scrapperMode) {
      // Fixed behind the scrapper: -X is behind (scrapper's +X is forward)
      _scrapperOffset.set(
        -SCRAPPER_INTRO_CAMERA_BEHIND_DIST,
        SCRAPPER_INTRO_CAMERA_HEIGHT,
        SCRAPPER_INTRO_CAMERA_BEHIND_OFFSET
      );
      _scrapperOffset.applyQuaternion(scrapperWorldQuat);
      _desiredPos.copy(scrapperWorldPos).add(_scrapperOffset);
      if (tr.active) {
        tr.t = Math.min(tr.t + delta / tr.duration, 1);
        camera.position.lerpVectors(tr.fromPos, _desiredPos, smoothstep(tr.t));
        if (tr.t >= 1) tr.active = false;
      } else {
        camera.position.copy(_desiredPos);
      }
      camera.lookAt(scrapperWorldPos);
      return;
    }

    if (launchMode) {
      // Cinematic camera follows the ship using a fixed offset derived from the
      // scrapper's orientation + configured Y rotation — so the angle stays
      // consistent as the player flies away, and the ship stays in frame.
      _launchComposedQuat
        .copy(scrapperWorldQuat)
        .multiply(_launchYRotQuat)
        .multiply(_launchZRotQuat);
      _launchOffset.set(
        -SCRAPPER_LAUNCH_CAMERA_BEHIND_DIST,
        SCRAPPER_LAUNCH_CAMERA_HEIGHT,
        SCRAPPER_LAUNCH_CAMERA_Z_OFFSET
      );
      _launchOffset.applyQuaternion(_launchComposedQuat);
      _desiredPos.copy(shipPosRef.current).add(_launchOffset);
      if (tr.active) {
        tr.t = Math.min(tr.t + delta / tr.duration, 1);
        camera.position.lerpVectors(tr.fromPos, _desiredPos, smoothstep(tr.t));
        if (tr.t >= 1) tr.active = false;
      } else {
        camera.position.copy(_desiredPos);
      }
      camera.lookAt(shipPosRef.current);
      // Check exit distance; fire event once — state update happens next render
      const dist = shipPosRef.current.distanceTo(scrapperWorldPos);
      if (dist > SCRAPPER_LAUNCH_CAMERA_EXIT_DISTANCE && !launchEndedFiredRef.current) {
        launchEndedFiredRef.current = true;
        window.dispatchEvent(new CustomEvent('ScrapperLaunchEnded'));
      }
      return;
    }

    // Blend from launch cinematic to attached player camera.
    // Camera is still in scene space; compute where the attached camera would
    // be in world space and lerp toward it.
    if (transitioningRef.current) {
      // Once the ship group has re-adopted the camera (state flushed), stop.
      if (attachTo?.current && camera.parent === attachTo.current) {
        transitioningRef.current = false;
        // Fall through to the normal attached block below.
      } else {
        _offset.setFromSpherical(spherical.current);
        const parent = attachTo?.current;
        if (parent) {
          parent.localToWorld(_desiredPos.copy(_offset));
          parent.getWorldPosition(_desiredLookAt);
        } else {
          _desiredPos.copy(shipPosRef.current).add(_offset);
          _desiredLookAt.copy(shipPosRef.current);
        }
        if (tr.active) {
          tr.t = Math.min(tr.t + delta / tr.duration, 1);
          camera.position.lerpVectors(tr.fromPos, _desiredPos, smoothstep(tr.t));
          if (tr.t >= 1) {
            tr.active = false;
            camera.position.copy(_desiredPos);
            setTransitioningState(false); // triggers re-parenting
          }
        } else {
          // Blend finished — hold position until React re-parents the camera
          camera.position.copy(_desiredPos);
        }
        camera.lookAt(_desiredLookAt);
        return;
      }
    }

    if (attachTo?.current && !decoupled) {
      _offset.setFromSpherical(spherical.current);
      camera.position.copy(_offset);
      camera.position.x += shakeX;
      camera.position.y += shakeY;
      camera.lookAt(attachTo.current.getWorldPosition(_target));
      return;
    }

    _offset.setFromSpherical(spherical.current);
    const target = followTarget ? followTarget.current : _target.set(0, 0, 0);
    camera.position.copy(target).add(_offset);
    camera.position.x += shakeX;
    camera.position.y += shakeY;
    camera.lookAt(target);
  }, 1);

  return null;
}
