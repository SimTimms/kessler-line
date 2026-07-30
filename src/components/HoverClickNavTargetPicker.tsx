import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getCollidables } from '../context/CollisionRegistry';
import { SHIP_COLLISION_ID } from '../context/ShipState';
import { pickCollidable } from '../utils/collidableRaycast';
import { resolveCollidableLabel, resolveCollidableVelocity } from '../utils/resolveCollidableMotion';
import { selectTarget } from '../context/TargetSelection';
import { setNavTarget } from '../context/NavTarget';

const CLICK_MOVE_TOLERANCE_PX = 6;

const _pointerNdc = new THREE.Vector2();
const _hitPos = new THREE.Vector3();
const _hitVel = new THREE.Vector3();

function isInsideCanvas(canvas: HTMLCanvasElement, clientX: number, clientY: number): boolean {
  const rect = canvas.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

export default function HoverClickNavTargetPicker() {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const downPointRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (!isInsideCanvas(canvas, e.clientX, e.clientY)) {
        downPointRef.current = null;
        movedRef.current = false;
        return;
      }
      downPointRef.current = { x: e.clientX, y: e.clientY };
      movedRef.current = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      const down = downPointRef.current;
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (dx * dx + dy * dy > CLICK_MOVE_TOLERANCE_PX * CLICK_MOVE_TOLERANCE_PX) {
        movedRef.current = true;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const down = downPointRef.current;
      downPointRef.current = null;
      if (!down || movedRef.current) return;
      if (!isInsideCanvas(canvas, e.clientX, e.clientY)) return;

      const rect = canvas.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(_pointerNdc, camera);

      const hit = pickCollidable(
        raycaster.current,
        getCollidables().filter((c) => !c.id.startsWith('docking-bay-')),
        SHIP_COLLISION_ID
      );
      if (!hit) return;

      hit.getWorldPosition(_hitPos);
      resolveCollidableVelocity(hit, _hitVel);
      selectTarget(resolveCollidableLabel(hit), _hitVel, _hitPos, hit.id, 'default');
      setNavTarget(hit.id, _hitPos);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [camera, gl]);

  return null;
}
