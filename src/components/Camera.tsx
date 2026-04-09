import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { thrustMultiplier, shipAcceleration } from '../context/ShipState';
import { hudShakeOffset } from '../context/HudShake';
import { shipInstructionMessage, scrapperIntroActive } from '../context/CinematicState';
import {
  CAMERA_MOUSE_SENSITIVITY,
  CAMERA_WHEEL_SENSITIVITY,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  CAMERA_SHAKE_AMP_MAX,
  CAMERA_SHAKE_FREQUENCIES,
} from '../config/visualConfig';
import { SCRAPPER_INTRO_CAMERA_RADIUS } from '../config/scrapperConfig';

// Scratch vectors — avoid allocating on every frame
const _offset = new THREE.Vector3();
const _target = new THREE.Vector3();
const _attachOffset = new THREE.Vector3(0, 14, -40);

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

  useEffect(() => {
    if (decoupled) {
      scene.add(camera);
      return;
    }
    const parent = attachTo?.current;
    if (!parent) return;
    parent.add(camera);
    return () => {
      scene.add(camera);
    };
  }, [attachTo, camera, scene, decoupled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyC') {
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

    if (scrapperIntroActive.current) {
      spherical.current.radius = SCRAPPER_INTRO_CAMERA_RADIUS;
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
