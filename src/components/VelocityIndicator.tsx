import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipVelocity } from './Spaceship';

const MIN_SPEED = 0.05;

export default function VelocityIndicator({
  shipPositionRef,
}: {
  shipPositionRef: { current: THREE.Vector3 };
}) {
  const { line, sprite, spriteCtx } = useMemo(() => {
    // Dashed orange line
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 points × 3 components
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineDashedMaterial({
      color: 0xff8800,
      dashSize: 0.9,
      gapSize: 0.6,
      opacity: 0.85,
      transparent: true,
      depthTest: false,
    });

    const l = new THREE.Line(geo, mat);
    l.frustumCulled = false;

    // Canvas sprite for speed label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    });
    const s = new THREE.Sprite(spriteMat);
    s.frustumCulled = false;
    s.visible = false;

    return { line: l, sprite: s, spriteCtx: ctx };
  }, []);

  useFrame(() => {
    const speed = shipVelocity.length();
    line.visible = speed > MIN_SPEED;
    sprite.visible = speed > MIN_SPEED;
    if (!line.visible) return;

    const pos = line.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    const ship = shipPositionRef.current;

    const invSpeed = 1 / speed;
    const dx = shipVelocity.x * invSpeed;
    const dy = shipVelocity.y * invSpeed;
    const dz = shipVelocity.z * invSpeed;

    arr[0] = ship.x;
    arr[1] = ship.y;
    arr[2] = ship.z;
    const lineLength = Math.min(speed * 4, 300);
    arr[3] = ship.x + dx * lineLength;
    arr[4] = ship.y + dy * lineLength;
    arr[5] = ship.z + dz * lineLength;

    pos.needsUpdate = true;
    line.computeLineDistances();

    // Position label at 45% along the line, offset slightly above
    const frac = 0.45;
    const labelScale = Math.min(Math.max(speed * 0.25, 8), 36);
    sprite.scale.set(labelScale * 3.8, labelScale, 1);
    sprite.position.set(
      ship.x + dx * lineLength * frac,
      ship.y + labelScale * 0,
      ship.z + dz * lineLength * frac
    );

    // Redraw canvas texture
    spriteCtx.clearRect(0, 0, 256, 64);
    spriteCtx.fillStyle = '#ff8800';
    spriteCtx.font = 'bold 12px monospace';
    spriteCtx.textAlign = 'center';
    spriteCtx.textBaseline = 'middle';
    spriteCtx.fillText(`${speed.toFixed(1)} m/s`, 128, 34);
    (sprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
  });

  return (
    <>
      <primitive object={line} />
      <primitive object={sprite} />
    </>
  );
}
