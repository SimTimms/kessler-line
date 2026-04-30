import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shipQuaternion } from '../../context/ShipState';
import {
  CAMERA_ATTACH_OFFSET,
  CAMERA_MOUSE_SENSITIVITY,
  CAMERA_WHEEL_SENSITIVITY,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
} from '../../config/visualConfig';

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

export default function TutorialFollowCamera({
  followTarget,
  followOffset = CAMERA_ATTACH_OFFSET,
}: TutorialFollowCameraProps) {
  const { camera, gl, scene } = useThree();
  const spherical = useRef(new THREE.Spherical(10, Math.PI / 2, Math.PI));
  const didInit = useRef(false);
  const didInitCameraPose = useRef(false);
  const isPointerDown = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    scene.add(camera);
    return () => {
      scene.add(camera);
    };
  }, [camera, scene]);

  useEffect(() => {
    _offset.set(...followOffset);
    spherical.current.setFromVector3(_offset);
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

      spherical.current.theta -= dx * CAMERA_MOUSE_SENSITIVITY;
      spherical.current.phi -= dy * CAMERA_MOUSE_SENSITIVITY;
      spherical.current.phi = THREE.MathUtils.clamp(spherical.current.phi, 0.05, Math.PI - 0.05);
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      spherical.current.radius *= 1 + e.deltaY * CAMERA_WHEEL_SENSITIVITY;
      const safeMin = Math.max(CAMERA_ZOOM_MIN, new THREE.Vector3(...followOffset).length() * 0.5);
      spherical.current.radius = THREE.MathUtils.clamp(spherical.current.radius, safeMin, CAMERA_ZOOM_MAX);
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
  }, [followOffset, gl]);

  useFrame((_, delta) => {
    if (!didInit.current) {
      _offset.set(...followOffset);
      spherical.current.setFromVector3(_offset);
      didInit.current = true;
    }

    _target.copy(followTarget.current);
    _followQuat.copy(shipQuaternion).normalize();
    _offset.setFromSpherical(spherical.current);
    _worldOffset.copy(_offset).applyQuaternion(_followQuat);
    _desiredCameraPos.copy(_target).add(_worldOffset);

    if (!didInitCameraPose.current) {
      camera.position.copy(_desiredCameraPos);
      _smoothedLookAt.copy(_target);
      didInitCameraPose.current = true;
    } else {
      const posAlpha = 1 - Math.exp(-CAMERA_POSITION_LERP_SPEED * delta);
      const lookAlpha = 1 - Math.exp(-CAMERA_LOOKAT_LERP_SPEED * delta);
      camera.position.lerp(_desiredCameraPos, posAlpha);
      _smoothedLookAt.lerp(_target, lookAlpha);
    }

    camera.lookAt(_smoothedLookAt);
  });

  return null;
}
