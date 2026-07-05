import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getCollidables } from '../context/CollisionRegistry';
import { SHIP_COLLISION_ID } from '../context/ShipState';
import { clearHoveredObject, setHoveredObject } from '../context/HoveredObject';
import { pickCollidable } from '../utils/collidableRaycast';
import {
  resolveCollidableLabel,
  resolveCollidableVelocity,
} from '../utils/resolveCollidableMotion';

const _pointerNdc = new THREE.Vector2(-2, -2);
const _position = new THREE.Vector3();
const _velocity = new THREE.Vector3();

function isInsideCanvas(canvas: HTMLCanvasElement, clientX: number, clientY: number): boolean {
  const rect = canvas.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

export default function HoverPicker() {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointerActiveRef = useRef(false);
  const pointerDownRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;

    const setPointerFromEvent = (e: PointerEvent) => {
      if (!isInsideCanvas(canvas, e.clientX, e.clientY)) {
        pointerActiveRef.current = false;
        clearHoveredObject();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerActiveRef.current = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerDownRef.current) return;
      setPointerFromEvent(e);
    };

    const onPointerEnter = (e: PointerEvent) => {
      if (pointerDownRef.current) return;
      setPointerFromEvent(e);
    };

    const onPointerDown = () => {
      pointerDownRef.current = true;
      clearHoveredObject();
    };

    const onPointerUp = () => {
      pointerDownRef.current = false;
    };

    const onPointerLeave = () => {
      pointerActiveRef.current = false;
      clearHoveredObject();
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointerup', onPointerUp);
      clearHoveredObject();
    };
  }, [gl]);

  useFrame(() => {
    if (!pointerActiveRef.current || pointerDownRef.current) return;

    raycaster.current.setFromCamera(_pointerNdc, camera);
    const hit = pickCollidable(raycaster.current, getCollidables(), SHIP_COLLISION_ID);

    if (!hit) {
      clearHoveredObject();
      return;
    }

    hit.getWorldPosition(_position);
    resolveCollidableVelocity(hit, _velocity);
    setHoveredObject(hit.id, resolveCollidableLabel(hit), _position, _velocity);
  });

  return null;
}
