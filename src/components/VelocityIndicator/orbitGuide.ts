import * as THREE from 'three';
import type { GravityBody } from '../../context/GravityRegistry';
import { orbitStatusRef } from '../../context/ShipState';
import {
  IDEAL_ORBIT_MAX_SOI_FRACTION,
  ORBIT_GUIDE_COLOR,
  ORBIT_GUIDE_DASH_SIZE,
  ORBIT_GUIDE_GAP_SIZE,
  ORBIT_GUIDE_OPACITY,
  ORBIT_GUIDE_POINTS,
  ORBIT_LABEL_CANVAS_HEIGHT,
  ORBIT_LABEL_CANVAS_WIDTH,
  ORBIT_LABEL_SPRITE_HEIGHT,
  ORBIT_LABEL_SPRITE_WIDTH,
} from './constants';
import type { IndicatorObjects } from './indicatorObjects';

/** Radius of the ideal circular orbit: surface + orbit altitude, capped inside the SOI. */
export function getIdealOrbitRadius(body: GravityBody): number {
  return Math.min(
    body.surfaceRadius + body.orbitAltitude,
    body.soiRadius * IDEAL_ORBIT_MAX_SOI_FRACTION
  );
}

/** The faint dashed circle. Its points are filled in by rebuildOrbitGuideCircle. */
export function createOrbitGuideLine() {
  const positions = new Float32Array(ORBIT_GUIDE_POINTS * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineDashedMaterial({
    color: ORBIT_GUIDE_COLOR,
    dashSize: ORBIT_GUIDE_DASH_SIZE,
    gapSize: ORBIT_GUIDE_GAP_SIZE,
    opacity: ORBIT_GUIDE_OPACITY,
    transparent: true,
    depthTest: false,
  });

  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  return { line, positions };
}

/** The "CIRCULAR ORBIT" text sprite. */
export function createOrbitLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = ORBIT_LABEL_CANVAS_WIDTH;
  canvas.height = ORBIT_LABEL_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  const material = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.frustumCulled = false;
  sprite.visible = false;
  return { sprite, ctx };
}

/**
 * Recomputes the circle's points around the body, starting at the ship's angle.
 *
 * Runs on every trajectory result even though only the start angle changes —
 * the circle could be built once per body instead.
 */
export function rebuildOrbitGuideCircle(
  objects: IndicatorObjects,
  body: GravityBody,
  shipPos: THREE.Vector3
) {
  const radius = getIdealOrbitRadius(body);
  if (radius <= body.surfaceRadius) return;

  const dx = shipPos.x - body.position.x;
  const dz = shipPos.z - body.position.z;
  const distance = Math.sqrt(dx * dx + dz * dz) || 1;
  const startAngle = Math.atan2(dz / distance, dx / distance);
  const angleStep = (Math.PI * 2) / (ORBIT_GUIDE_POINTS - 1);

  const points = objects.orbitPosArr;
  for (let i = 0; i < ORBIT_GUIDE_POINTS; i++) {
    const theta = startAngle + i * angleStep;
    points[i * 3] = Math.cos(theta) * radius;
    points[i * 3 + 1] = 0;
    points[i * 3 + 2] = Math.sin(theta) * radius;
  }

  objects.orbitLine.geometry.attributes.position.needsUpdate = true;
  objects.orbitLine.computeLineDistances();
}

/** Redraws the label: current PERI/APO altitudes (when in orbit) and "CIRCULAR ORBIT". */
export function drawOrbitGuideLabel(objects: IndicatorObjects) {
  const ctx = objects.orbitSpriteCtx;
  if (!ctx) return;

  ctx.clearRect(0, 0, ORBIT_LABEL_CANVAS_WIDTH, ORBIT_LABEL_CANVAS_HEIGHT);
  ctx.fillStyle = ORBIT_GUIDE_COLOR;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const { periapsis, apoapsis, surfaceRadius } = orbitStatusRef.current;
  if (periapsis > 0 && apoapsis > 0) {
    const periAltitude = Math.round(Math.max(0, periapsis - surfaceRadius));
    const apoAltitude = Math.round(Math.max(0, apoapsis - surfaceRadius));
    ctx.fillText(`PERI: ${periAltitude}  APO: ${apoAltitude}`, 128, 20);
  }
  ctx.fillText('CIRCULAR ORBIT', 128, 34);

  (objects.orbitSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
}

/** Shows or hides the circle and its label together. */
export function setOrbitGuideVisible(objects: IndicatorObjects, visible: boolean) {
  objects.orbitLine.visible = visible;
  objects.orbitSprite.visible = visible;
}

/** Every frame: centres the circle on the body and puts the label halfway round it. */
export function positionOrbitGuide(objects: IndicatorObjects, body: GravityBody) {
  objects.orbitLine.position.set(body.position.x, 0, body.position.z);

  const mid = Math.floor(ORBIT_GUIDE_POINTS / 2);
  const points = objects.orbitPosArr;
  objects.orbitSprite.scale.set(ORBIT_LABEL_SPRITE_WIDTH, ORBIT_LABEL_SPRITE_HEIGHT, 1);
  objects.orbitSprite.position.set(
    points[mid * 3] + body.position.x,
    0,
    points[mid * 3 + 2] + body.position.z
  );
}
