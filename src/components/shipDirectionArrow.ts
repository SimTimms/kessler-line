import * as THREE from 'three';
import {
  SHIP_DIRECTION_ARROW_SHAFT_LENGTH,
  SHIP_DIRECTION_ARROW_SHAFT_WIDTH,
  SHIP_DIRECTION_ARROW_TIP_LENGTH,
  SHIP_DIRECTION_ARROW_TIP_RADIUS,
  SHIP_DIRECTION_RING_OPACITY,
  SHIP_DIRECTION_RING_RADIUS,
  SHIP_DIRECTION_TARGET_LINE_GAP,
  SHIP_DIRECTION_TARGET_LINE_LENGTH,
  SHIP_DIRECTION_TARGET_LINE_THICKNESS,
  SHIP_DIRECTION_VELOCITY_ARC_REF_SPEED,
  SHIP_DIRECTION_VELOCITY_ARC_SCALE_MAX,
  SHIP_DIRECTION_VELOCITY_ARC_SCALE_MIN,
  SHIP_DIRECTION_VELOCITY_LINE_LENGTH,
  SHIP_DIRECTION_VELOCITY_LINE_THICKNESS,
} from '../config/shipDirectionIndicatorConfig';

const _fwd = new THREE.Vector3(0, 0, 1);
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/** Build a small arrow mesh that points along local +Z. */
export function createShipDirectionArrow(color: string | number, opacity = 0.88): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
  // Shared tip/shaft material — keep a direct ref so callers can recolor without
  // walking children (R3F may also attach Html/label groups under the arrow).
  group.userData.arrowMaterial = mat;

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(SHIP_DIRECTION_ARROW_TIP_RADIUS, SHIP_DIRECTION_ARROW_TIP_LENGTH, 8),
    mat
  );
  tip.rotation.x = Math.PI / 2;
  tip.position.z = SHIP_DIRECTION_ARROW_TIP_LENGTH * 0.35;
  tip.frustumCulled = false;
  group.add(tip);

  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(
      SHIP_DIRECTION_ARROW_SHAFT_WIDTH,
      SHIP_DIRECTION_ARROW_SHAFT_WIDTH,
      SHIP_DIRECTION_ARROW_SHAFT_LENGTH
    ),
    mat
  );
  shaft.position.z = -SHIP_DIRECTION_ARROW_SHAFT_LENGTH * 0.35;
  shaft.frustumCulled = false;
  group.add(shaft);

  group.frustumCulled = false;
  return group;
}

export function setShipDirectionArrowColor(arrow: THREE.Object3D, color: THREE.ColorRepresentation) {
  const mat = arrow.userData.arrowMaterial as THREE.MeshBasicMaterial | undefined;
  if (mat) mat.color.set(color);
}

/** Faint circle in the XZ plane around the ship. */
export function createShipDirectionRing(color: string | number): THREE.Line {
  const segments = 64;
  const positions = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    positions[i * 3] = Math.cos(t) * SHIP_DIRECTION_RING_RADIUS;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = Math.sin(t) * SHIP_DIRECTION_RING_RADIUS;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: SHIP_DIRECTION_RING_OPACITY,
    depthTest: false,
    depthWrite: false,
  });
  const ring = new THREE.Line(geo, mat);
  ring.frustumCulled = false;
  return ring;
}

/**
 * Two short lines perpendicular to local +Z with a gap between them.
 * When aligned with the velocity line indicator, the single velocity line
 * sits in the gap.
 */
export function createShipDirectionSplitLine(color: string | number, opacity = 0.88): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
  group.userData.arrowMaterial = mat;

  const halfGap = SHIP_DIRECTION_TARGET_LINE_GAP / 2;
  const segLen = SHIP_DIRECTION_TARGET_LINE_LENGTH;
  const thick = SHIP_DIRECTION_TARGET_LINE_THICKNESS;

  const inner = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, segLen), mat);
  inner.position.z = -(halfGap + segLen / 2);
  inner.frustumCulled = false;
  group.add(inner);

  const outer = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, segLen), mat);
  outer.position.z = halfGap + segLen / 2;
  outer.frustumCulled = false;
  group.add(outer);

  group.frustumCulled = false;
  return group;
}

/**
 * Three short line segments along local +Z with gaps between them.
 * Used for the orbit-direction indicator.
 */
export function createShipDirectionTripleLine(color: string | number, opacity = 0.88): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
  group.userData.arrowMaterial = mat;

  const gap = SHIP_DIRECTION_TARGET_LINE_GAP;
  const segLen = SHIP_DIRECTION_TARGET_LINE_LENGTH;
  const thick = SHIP_DIRECTION_TARGET_LINE_THICKNESS;

  const center = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, segLen), mat);
  center.position.z = 0;
  center.frustumCulled = false;
  group.add(center);

  const inner = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, segLen), mat);
  inner.position.z = -(gap + segLen);
  inner.frustumCulled = false;
  group.add(inner);

  const outer = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, segLen), mat);
  outer.position.z = gap + segLen;
  outer.frustumCulled = false;
  group.add(outer);

  group.frustumCulled = false;
  return group;
}

/** Single short line perpendicular to local +Z — fits in the target split gap when aligned. */
export function createShipDirectionLine(color: string | number, opacity = 0.88): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
  group.userData.arrowMaterial = mat;

  const line = new THREE.Mesh(
    new THREE.BoxGeometry(
      SHIP_DIRECTION_VELOCITY_LINE_THICKNESS,
      SHIP_DIRECTION_VELOCITY_LINE_THICKNESS,
      SHIP_DIRECTION_VELOCITY_LINE_LENGTH
    ),
    mat
  );
  line.frustumCulled = false;
  group.add(line);

  group.frustumCulled = false;
  return group;
}

/**
 * World-space radius of the velocity ring for the current ship speed.
 * {@link SHIP_DIRECTION_VELOCITY_ARC_REF_SPEED} (0.9 m/s) maps to
 * {@link SHIP_DIRECTION_RING_RADIUS}.
 */
export function velocityRingRadiusForSpeed(speed: number): number {
  const r = SHIP_DIRECTION_RING_RADIUS;
  const ref = SHIP_DIRECTION_VELOCITY_ARC_REF_SPEED;
  const minR = r * SHIP_DIRECTION_VELOCITY_ARC_SCALE_MIN;
  const maxR = r * SHIP_DIRECTION_VELOCITY_ARC_SCALE_MAX;
  if (!(speed > 0) || !(ref > 0)) return minR;
  const scaled = r * (Math.log1p(speed) / Math.log1p(ref));
  return Math.min(Math.max(scaled, minR), maxR);
}

/** Place an arrow on the circumference in XZ, oriented along `dirWorld` (y ignored). */
export function placeShipDirectionArrow(
  arrow: THREE.Object3D,
  shipX: number,
  shipY: number,
  shipZ: number,
  dirX: number,
  dirZ: number,
  radius = SHIP_DIRECTION_RING_RADIUS
): boolean {
  const len = Math.hypot(dirX, dirZ);
  if (len < 1e-6) {
    arrow.visible = false;
    return false;
  }
  const nx = dirX / len;
  const nz = dirZ / len;
  arrow.visible = true;
  arrow.position.set(shipX + nx * radius, shipY, shipZ + nz * radius);
  _dir.set(nx, 0, nz);
  _quat.setFromUnitVectors(_fwd, _dir);
  arrow.quaternion.copy(_quat);
  return true;
}
