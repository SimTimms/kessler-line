import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gravityBodies } from '../context/GravityRegistry';
import { hoveredObject } from '../context/HoveredObject';
import { navHudEnabledRef } from '../context/NavHud';
import {
  HOVER_TRAJ_STEPS,
  HOVER_TRAJ_DT,
  HOVER_TRAJ_MIN_SPEED,
  HOVER_TRAJ_COLOR,
  HOVER_TRAJ_OPACITY,
  HOVER_TRAJ_DASH_SIZE,
  HOVER_TRAJ_GAP_SIZE,
} from '../config/trajectoryConfig';

const _simPos = new THREE.Vector3();
const _simVel = new THREE.Vector3();

export default function HoverTrajectoryIndicator() {
  const { line, sprite, spriteCtx, posArr } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(HOVER_TRAJ_STEPS * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));

    const mat = new THREE.LineDashedMaterial({
      color: HOVER_TRAJ_COLOR,
      dashSize: HOVER_TRAJ_DASH_SIZE,
      gapSize: HOVER_TRAJ_GAP_SIZE,
      opacity: HOVER_TRAJ_OPACITY,
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const l = new THREE.Line(geo, mat);
    l.frustumCulled = false;
    l.renderOrder = 999;
    l.visible = false;

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
    s.renderOrder = 999;
    s.visible = false;

    return { line: l, sprite: s, spriteCtx: ctx, posArr: arr };
  }, []);

  useFrame(() => {
    const hover = hoveredObject.id ? hoveredObject : null;
    const hudEnabled = navHudEnabledRef.current;

    if (!hudEnabled || !hover) {
      line.visible = false;
      sprite.visible = false;
      return;
    }

    const speed = hover.velocity.length();
    const ox = hover.position.x;
    const oz = hover.position.z;

    line.position.set(ox, 0, oz);

    if (speed <= HOVER_TRAJ_MIN_SPEED) {
      // Stationary pads/stations — no dashed ring; hover is handled by HUD labels.
      line.visible = false;
      sprite.visible = false;
      return;
    }

    line.visible = true;
    sprite.visible = true;

    let primaryBody: (typeof gravityBodies extends Map<string, infer T> ? T : never) | null = null;
    let primaryAccel = 0;
    for (const [, body] of gravityBodies) {
      const dx = body.position.x - ox;
      const dz = body.position.z - oz;
      const dist2 = dx * dx + dz * dz;
      const dist = Math.sqrt(dist2);
      if (dist > body.surfaceRadius && dist < body.soiRadius) {
        const accel = body.mu / dist2;
        if (accel > primaryAccel) {
          primaryAccel = accel;
          primaryBody = body;
        }
      }
    }

    if (primaryBody) {
      _simPos.set(ox - primaryBody.position.x, 0, oz - primaryBody.position.z);
      _simVel.set(
        hover.velocity.x - primaryBody.velocity.x,
        0,
        hover.velocity.z - primaryBody.velocity.z
      );
    } else {
      _simPos.set(ox, 0, oz);
      _simVel.copy(hover.velocity);
    }

    let activeSteps = HOVER_TRAJ_STEPS;

    for (let i = 0; i < HOVER_TRAJ_STEPS; i++) {
      const worldX = primaryBody ? _simPos.x + primaryBody.position.x : _simPos.x;
      const worldZ = primaryBody ? _simPos.z + primaryBody.position.z : _simPos.z;
      posArr[i * 3] = worldX - ox;
      posArr[i * 3 + 1] = 0;
      posArr[i * 3 + 2] = worldZ - oz;

      let ax = 0;
      let az = 0;
      let hitSurface = false;

      if (primaryBody) {
        const dx = -_simPos.x;
        const dz = -_simPos.z;
        const dist2 = dx * dx + dz * dz;
        const dist = Math.sqrt(dist2);
        if (dist < primaryBody.surfaceRadius) {
          hitSurface = true;
        } else {
          const accel = primaryBody.mu / dist2;
          ax += (dx / dist) * accel;
          az += (dz / dist) * accel;
        }
      } else {
        for (const [, body] of gravityBodies) {
          const dx = body.position.x - _simPos.x;
          const dz = body.position.z - _simPos.z;
          const dist2 = dx * dx + dz * dz;
          const dist = Math.sqrt(dist2);
          if (dist < body.surfaceRadius) {
            hitSurface = true;
            break;
          }
          if (dist < body.soiRadius) {
            const accel = body.mu / dist2;
            ax += (dx / dist) * accel;
            az += (dz / dist) * accel;
          }
        }
      }

      if (hitSurface) {
        activeSteps = i + 1;
        break;
      }

      _simVel.x += ax * HOVER_TRAJ_DT;
      _simVel.z += az * HOVER_TRAJ_DT;
      _simPos.x += _simVel.x * HOVER_TRAJ_DT;
      _simPos.z += _simVel.z * HOVER_TRAJ_DT;
    }

    if (activeSteps < HOVER_TRAJ_STEPS) {
      const hitWorldX = primaryBody ? _simPos.x + primaryBody.position.x : _simPos.x;
      const hitWorldZ = primaryBody ? _simPos.z + primaryBody.position.z : _simPos.z;
      for (let j = activeSteps; j < HOVER_TRAJ_STEPS; j++) {
        posArr[j * 3] = hitWorldX - ox;
        posArr[j * 3 + 1] = 0;
        posArr[j * 3 + 2] = hitWorldZ - oz;
      }
    }

    const pos = line.geometry.attributes.position;
    pos.needsUpdate = true;
    line.computeLineDistances();

    const mid = Math.floor((activeSteps - 1) / 2);
    const lx = posArr[mid * 3] + ox;
    const lz = posArr[mid * 3 + 2] + oz;
    const labelScale = Math.min(Math.max(speed * 0.2, 6), 28);
    sprite.scale.set(labelScale * 3.8, labelScale, 1);
    sprite.position.set(lx, 0, lz);

    spriteCtx.clearRect(0, 0, 256, 64);
    spriteCtx.fillStyle = '#00c8ff';
    spriteCtx.font = 'bold 11px monospace';
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
