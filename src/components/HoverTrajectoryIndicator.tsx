import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
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
  HOVER_TRAJ_UPDATE_INTERVAL,
} from '../config/trajectoryConfig';
import { requestTrajectory, snapshotGravityBodies } from '../workers/trajectoryWorkerClient';

// ── Simulation throttle ────────────────────────────────────────────────────
// The 250-step sim runs via Web Worker every N frames. The tick resets when
// the hover target changes so the new target always gets an immediate update.
let _hoverTrajTick = HOVER_TRAJ_UPDATE_INTERVAL; // first frame always runs
let _lastHoverId: string | null = null;

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
      _lastHoverId = null;
      return;
    }

    const speed = hover.velocity.length();
    const ox = hover.position.x;
    const oz = hover.position.z;

    // Always update line origin so it tracks the (potentially moving) target
    line.position.set(ox, 0, oz);

    if (speed <= HOVER_TRAJ_MIN_SPEED) {
      line.visible = false;
      sprite.visible = false;
      return;
    }

    line.visible = true;
    sprite.visible = true;

    // Reset throttle tick when the hovered target changes so the new target
    // gets a trajectory on the very next frame rather than waiting N frames.
    const hoverId = hover.id ?? null;
    if (hoverId !== _lastHoverId) {
      _lastHoverId = hoverId;
      _hoverTrajTick = HOVER_TRAJ_UPDATE_INTERVAL;
    }

    // Only run the expensive simulation every N frames
    _hoverTrajTick++;
    if (_hoverTrajTick < HOVER_TRAJ_UPDATE_INTERVAL) return;
    _hoverTrajTick = 0;

    const bodies = snapshotGravityBodies();
    const capturedOx = ox;
    const capturedOz = oz;
    const capturedSpeed = speed;

    requestTrajectory(
      'hover',
      ox,
      oz,
      hover.velocity.x,
      hover.velocity.z,
      bodies,
      {
        steps: HOVER_TRAJ_STEPS,
        dt: HOVER_TRAJ_DT,
        detectOrbitClosure: false,
        trackApsides: false,
        adaptiveDt: false,
      },
      (result) => {
        const { positions, activeSteps } = result;

        // XZ→XYZ stride conversion (target-relative offsets)
        for (let i = 0; i < HOVER_TRAJ_STEPS; i++) {
          posArr[i * 3] = positions[i * 2] - capturedOx;
          posArr[i * 3 + 1] = 0;
          posArr[i * 3 + 2] = positions[i * 2 + 1] - capturedOz;
        }

        // Fill remainder with last computed position on surface hit
        if (activeSteps < HOVER_TRAJ_STEPS) {
          const lastX = posArr[(activeSteps - 1) * 3];
          const lastZ = posArr[(activeSteps - 1) * 3 + 2];
          for (let j = activeSteps; j < HOVER_TRAJ_STEPS; j++) {
            posArr[j * 3] = lastX;
            posArr[j * 3 + 1] = 0;
            posArr[j * 3 + 2] = lastZ;
          }
        }

        const pos = line.geometry.attributes.position;
        pos.needsUpdate = true;
        line.computeLineDistances();

        const mid = Math.floor((activeSteps - 1) / 2);
        const lx = posArr[mid * 3] + capturedOx;
        const lz = posArr[mid * 3 + 2] + capturedOz;
        const labelScale = Math.min(Math.max(capturedSpeed * 0.2, 6), 28);
        sprite.scale.set(labelScale * 3.8, labelScale, 1);
        sprite.position.set(lx, 0, lz);

        spriteCtx.clearRect(0, 0, 256, 64);
        spriteCtx.fillStyle = '#00c8ff';
        spriteCtx.font = 'bold 11px monospace';
        spriteCtx.textAlign = 'center';
        spriteCtx.textBaseline = 'middle';
        spriteCtx.fillText(`${capturedSpeed.toFixed(1)} m/s`, 128, 34);
        (sprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
      }
    );
  });

  return (
    <>
      <primitive object={line} />
      <primitive object={sprite} />
    </>
  );
}
