import * as THREE from 'three';
import type { GravityBody } from '../../context/GravityRegistry';
import type { TrajectorySimResult } from '../../maths/trajectoryTypes';
import {
  APSIS_CANVAS_HEIGHT,
  APSIS_CANVAS_WIDTH,
  APSIS_MARKER_ASPECT,
  APSIS_MARKER_FALLBACK_HEIGHT,
  APSIS_MARKER_SCREEN_PX,
} from './constants';
import type { IndicatorObjects } from './indicatorObjects';
import { trajectoryCache } from './trajectoryCache';

export type ApsisMarker = ReturnType<typeof createApsisMarker>;

/** A camera-facing sprite with its own canvas for the "Pe 1200" label. */
export function createApsisMarker(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = APSIS_CANVAS_WIDTH;
  canvas.height = APSIS_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.frustumCulled = false;
  sprite.visible = false;
  return { sprite, ctx, color };
}

/** Draws a diamond and "<label>  <altitude>" onto the marker's canvas, then re-uploads it. */
function drawApsisLabel(marker: ApsisMarker, label: string, altitude: number) {
  const { ctx, color, sprite } = marker;
  if (!ctx) return;

  ctx.clearRect(0, 0, APSIS_CANVAS_WIDTH, APSIS_CANVAS_HEIGHT);
  ctx.fillStyle = color;

  // Diamond
  ctx.beginPath();
  ctx.moveTo(128, 8);
  ctx.lineTo(136, 16);
  ctx.lineTo(128, 24);
  ctx.lineTo(120, 16);
  ctx.closePath();
  ctx.fill();

  // Label and altitude
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${label}  ${altitude}`, 128, 56);

  (sprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
}

/** Redraws the Pe/Ap altitude text after a new trajectory result. */
export function redrawApsisLabels(
  objects: IndicatorObjects,
  result: TrajectorySimResult,
  body: GravityBody | null,
  isPlanet: boolean
) {
  if (!isPlanet || !body) return;

  if (result.periStep >= 0) {
    const altitude = Math.round(Math.max(0, result.periDist - body.surfaceRadius));
    drawApsisLabel(objects.periMarker, 'Pe', altitude);
  }
  if (result.apoStep >= 0 && result.orbitClosedAt >= 0) {
    const altitude = Math.round(Math.max(0, result.apoDist - body.surfaceRadius));
    drawApsisLabel(objects.apoMarker, 'Ap', altitude);
  }
}

/**
 * Places the Pe/Ap markers every frame, using the cached step indices and the
 * ship's current position (the stored points are ship-relative).
 */
export function updateApsisMarkers(
  objects: IndicatorObjects,
  shipX: number,
  shipZ: number,
  camera: THREE.Camera,
  canvasHeight: number
) {
  const { primaryBody, primaryIsPlanet, periStep, apoStep, orbitClosedAt } = trajectoryCache;
  const orbitingPlanet = primaryIsPlanet && primaryBody !== null;

  const periIndex = orbitingPlanet ? periStep : -1;
  const apoIndex = orbitingPlanet && orbitClosedAt >= 0 ? apoStep : -1;

  placeMarkerAtStep(
    objects.periMarker,
    periIndex,
    objects.posArr,
    shipX,
    shipZ,
    camera,
    canvasHeight
  );
  placeMarkerAtStep(
    objects.apoMarker,
    apoIndex,
    objects.posArr,
    shipX,
    shipZ,
    camera,
    canvasHeight
  );
}

/** Shows the marker at trajectory point `step`, or hides it when `step` is negative. */
function placeMarkerAtStep(
  marker: ApsisMarker,
  step: number,
  points: Float32Array,
  shipX: number,
  shipZ: number,
  camera: THREE.Camera,
  canvasHeight: number
) {
  if (step < 0) {
    marker.sprite.visible = false;
    return;
  }
  marker.sprite.visible = true;
  marker.sprite.position.set(points[step * 3] + shipX, 0, points[step * 3 + 2] + shipZ);
  scaleMarkerToScreen(marker.sprite, camera, canvasHeight);
}

/** Sets the sprite's world size so it appears APSIS_MARKER_SCREEN_PX tall at any camera distance. */
function scaleMarkerToScreen(sprite: THREE.Sprite, camera: THREE.Camera, canvasHeight: number) {
  if (!(camera instanceof THREE.PerspectiveCamera)) {
    sprite.scale.set(
      APSIS_MARKER_FALLBACK_HEIGHT * APSIS_MARKER_ASPECT,
      APSIS_MARKER_FALLBACK_HEIGHT,
      1
    );
    return;
  }
  const distance = camera.position.distanceTo(sprite.position);
  const verticalFov = (camera.fov * Math.PI) / 180;
  const frustumHeight = 2 * Math.tan(verticalFov / 2) * Math.max(distance, 1e-6);
  const height = (APSIS_MARKER_SCREEN_PX / canvasHeight) * frustumHeight;
  sprite.scale.set(height * APSIS_MARKER_ASPECT, height, 1);
}
