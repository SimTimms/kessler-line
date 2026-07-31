import { useMemo, useRef, useEffect, useLayoutEffect, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipVelocity } from './Ship/Spaceship';
import { gravityBodies, type GravityBody } from '../context/GravityRegistry';
import { orbitStatusRef, trajectoryApsisRef } from '../context/ShipState';
import { shipPosRef } from '../context/ShipPos';
import { navHudEnabledRef } from '../context/NavHud';
import { minimapOverlayActiveRef } from '../context/MinimapUi';
import {
  SHIP_DIRECTION_MIN_SPEED,
  SHIP_DIRECTION_ORBIT_COLOR,
  SHIP_DIRECTION_RING_OPACITY,
  SHIP_DIRECTION_VELOCITY_ARROW_SCALE,
  SHIP_DIRECTION_VELOCITY_COLOR,
} from '../config/shipDirectionIndicatorConfig';
import {
  createShipDirectionArrow,
  createShipDirectionRing,
  placeShipDirectionArrow,
} from './shipDirectionArrow';
import {
  SHIP_DIRECTION_INDICATOR_FRAME_PRIORITY,
  syncShipDirectionScreenLabel,
  useShipDirectionScreenLabelRoot,
} from './ShipDirectionScreenLabel';
import { TRAJ_UPDATE_INTERVAL } from '../config/trajectoryConfig';

/** Local +Z offset past the arrow tip — label projects from this anchor. */
const SPEED_LABEL_LOCAL_Z = 22;
const ORBIT_REQ_LABEL_LOCAL_Z = 22;

const _shipWorld = new THREE.Vector3();

const MIN_SPEED = SHIP_DIRECTION_MIN_SPEED;
const TRAJ_STEPS = 400;
const TRAJ_DT = 0.9; // seconds per step — stable symplectic Euler (covers ~360 s, enough for gas giant orbits ~300-350 s)
const ORBIT_MIN_STEPS = 25; // steps before orbit-closure check starts
const ORBIT_CLOSE_DIST = 150; // world units to declare orbit closed
// Trajectory must travel at least this far from start before closure is checked.
// Prevents approach arcs that curve near the start from being mistaken for orbits.
const ORBIT_AWAY_DIST = 500;
const VELOCITY_X_OFFSET = 0;

// Module-level scratch — no GC per frame
const _simPos = new THREE.Vector3();
const _simVel = new THREE.Vector3();
const _orbitPos = new THREE.Vector3();
const _orbitVel = new THREE.Vector3();
const _orbitDir = new THREE.Vector3();
const _apsisScaleWorld = new THREE.Vector3();

/** Target on-screen height for Pe/Ap sprites (px). World scale is derived from camera each frame. */
const APSIS_MARKER_SCREEN_PX = 20;

// ── Trajectory simulation throttle ────────────────────────────────────────
// The 400-step simulation (≥400 Math.sqrt calls) runs every N frames.
// Results are cached in module-level vars and reused between updates.
let _trajTick = TRAJ_UPDATE_INTERVAL; // start at interval so the very first frame runs
let _cachedPrimaryBody: GravityBody | null = null;
let _cachedPrimaryBodyId: string | null = null;
let _cachedPrimaryIsPlanet = false;
let _cachedPeriStep = -1;
let _cachedApoStep = -1;
let _cachedPeriDist = Infinity;
let _cachedApoDist = -Infinity;
let _cachedOrbitClosedAt = -1;

function getApsisMarkerScale(
  camera: THREE.Camera,
  canvasHeight: number,
  worldX: number,
  worldZ: number
): [number, number] {
  _apsisScaleWorld.set(worldX, 0, worldZ);
  if (camera instanceof THREE.PerspectiveCamera) {
    const dist = camera.position.distanceTo(_apsisScaleWorld);
    const vFov = (camera.fov * Math.PI) / 180;
    const frustumHeight = 2 * Math.tan(vFov / 2) * Math.max(dist, 1e-6);
    const h = (APSIS_MARKER_SCREEN_PX / canvasHeight) * frustumHeight;
    const w = h * 3.2;
    return [w, h];
  }
  const h = 10;
  return [h * 3.2, h];
}

function makeApsisSprite(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.frustumCulled = false;
  sprite.visible = false;
  return { sprite, ctx, color };
}

function drawApsisLabel(
  ctx: CanvasRenderingContext2D | null,
  color: string,
  label: string,
  alt: number
) {
  if (!ctx) return;
  ctx.clearRect(0, 0, 256, 80);
  ctx.fillStyle = color;
  // Diamond (compact — matches small screen-space scale)
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
  ctx.fillText(`${label}  ${alt}`, 128, 56);
}

export default function VelocityIndicator({
  shipGroupRef,
}: {
  shipGroupRef: RefObject<THREE.Group>;
}) {
  const shipPositionRef = shipPosRef;
  const trajectoryHighlightRef = useRef(false);
  const speedLabelAnchorRef = useRef<THREE.Group>(null!);
  const screenLabelRef = useShipDirectionScreenLabelRoot();
  const speedRef = useRef<HTMLDivElement | null>(null);

  const orbitReqLabelAnchorRef = useRef<THREE.Group>(null!);
  const orbitReqScreenLabelRef = useShipDirectionScreenLabelRoot();
  const orbitReqSpeedRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = screenLabelRef.current;
    if (!root) return;

    root.replaceChildren();
    const speed = document.createElement('div');
    speed.style.cssText =
      'font-family:monospace;font-size:9px;font-weight:700;letter-spacing:0.04em;white-space:nowrap;pointer-events:none;color:#ff8800;text-shadow:0 0 8px rgba(255,136,0,0.55);opacity:0.92;';
    root.append(speed);
    speedRef.current = speed;

    return () => {
      speedRef.current = null;
      root.replaceChildren();
    };
  }, [screenLabelRef]);

  useLayoutEffect(() => {
    const root = orbitReqScreenLabelRef.current;
    if (!root) return;

    root.replaceChildren();
    const col = document.createElement('div');
    col.style.cssText =
      'display:flex;flex-direction:column;align-items:center;gap:2px;font-family:monospace;pointer-events:none;opacity:0.92;text-align:center;';
    const title = document.createElement('div');
    title.style.cssText =
      'font-size:8px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;color:#30ff7a;text-shadow:0 0 8px rgba(48,255,122,0.5);';
    title.textContent = 'CIRC';
    const speed = document.createElement('div');
    speed.style.cssText =
      'font-size:9px;font-weight:700;letter-spacing:0.04em;white-space:nowrap;color:#30ff7a;text-shadow:0 0 8px rgba(48,255,122,0.55);';
    col.append(title, speed);
    root.append(col);
    orbitReqSpeedRef.current = speed;

    return () => {
      orbitReqSpeedRef.current = null;
      root.replaceChildren();
    };
  }, [orbitReqScreenLabelRef]);

  useEffect(() => {
    const onStart = () => {
      trajectoryHighlightRef.current = true;
    };
    const onStop = () => {
      trajectoryHighlightRef.current = false;
    };
    window.addEventListener('TrajectoryHighlightStart', onStart);
    window.addEventListener('TrajectoryHighlightStop', onStop);
    return () => {
      window.removeEventListener('TrajectoryHighlightStart', onStart);
      window.removeEventListener('TrajectoryHighlightStop', onStop);
    };
  }, []);
  const {
    velocityArrow,
    directionRing,
    orbitDirArrow,
    orbitDirRing,
    posArr,
    orbitLine,
    orbitSprite,
    orbitSpriteCtx,
    orbitPosArr,
    periMarker,
    apoMarker,
  } = useMemo(() => {
    const arr = new Float32Array(TRAJ_STEPS * 3);

    const orbitGeo = new THREE.BufferGeometry();
    const orbitArr = new Float32Array(TRAJ_STEPS * 3);
    orbitGeo.setAttribute('position', new THREE.BufferAttribute(orbitArr, 3));

    const orbitMat = new THREE.LineDashedMaterial({
      color: 0x30ff7a,
      dashSize: 3,
      gapSize: 2,
      opacity: 0.22,
      transparent: true,
      depthTest: false,
    });

    const ol = new THREE.Line(orbitGeo, orbitMat);
    ol.frustumCulled = false;

    const orbitCanvas = document.createElement('canvas');
    orbitCanvas.width = 256;
    orbitCanvas.height = 64;
    const orbitCtx = orbitCanvas.getContext('2d');

    const orbitTexture = new THREE.CanvasTexture(orbitCanvas);
    const orbitSpriteMat = new THREE.SpriteMaterial({
      map: orbitTexture,
      depthTest: false,
      transparent: true,
    });
    const orbitSprite = new THREE.Sprite(orbitSpriteMat);
    orbitSprite.frustumCulled = false;
    orbitSprite.visible = false;

    const peri = makeApsisSprite('#00e5ff');
    const apo = makeApsisSprite('#00e5ff');

    const velocityArrow = createShipDirectionArrow(SHIP_DIRECTION_VELOCITY_COLOR);
    velocityArrow.scale.setScalar(SHIP_DIRECTION_VELOCITY_ARROW_SCALE);

    const orbitDirArrow = createShipDirectionArrow(SHIP_DIRECTION_ORBIT_COLOR);
    orbitDirArrow.scale.setScalar(SHIP_DIRECTION_VELOCITY_ARROW_SCALE);
    const orbitDirRing = createShipDirectionRing(SHIP_DIRECTION_ORBIT_COLOR);
    (orbitDirRing.material as THREE.LineBasicMaterial).opacity = 0.005;

    return {
      velocityArrow,
      directionRing: createShipDirectionRing(SHIP_DIRECTION_VELOCITY_COLOR),
      orbitDirArrow,
      orbitDirRing,
      posArr: arr,
      orbitLine: ol,
      orbitSprite,
      orbitSpriteCtx: orbitCtx,
      orbitPosArr: orbitArr,
      periMarker: peri,
      apoMarker: apo,
    };
  }, []);

  useFrame(({ camera, size }) => {
    // ── Always: HUD guard ──────────────────────────────────────────────────
    if (!navHudEnabledRef.current) {
      velocityArrow.visible = false;
      directionRing.visible = false;
      orbitDirArrow.visible = false;
      orbitDirRing.visible = false;
      syncShipDirectionScreenLabel(null, screenLabelRef.current, camera, size, false);
      syncShipDirectionScreenLabel(null, orbitReqScreenLabelRef.current, camera, size, false);
      orbitLine.visible = false;
      orbitSprite.visible = false;
      periMarker.sprite.visible = false;
      apoMarker.sprite.visible = false;
      return;
    }
    if (!shipGroupRef.current) return;
    shipGroupRef.current.updateWorldMatrix(true, false);
    shipGroupRef.current.getWorldPosition(_shipWorld);

    // ── Always: velocity arrow + speed label ───────────────────────────────
    const speed = shipVelocity.length();
    directionRing.visible = true;

    directionRing.position.copy(_shipWorld);
    const arrowPlaced = placeShipDirectionArrow(
      velocityArrow,
      _shipWorld.x,
      _shipWorld.y,
      _shipWorld.z,
      shipVelocity.x,
      shipVelocity.z
    );
    if (arrowPlaced) {
      velocityArrow.updateWorldMatrix(true, true);
    }
    const showSpeedLabel =
      arrowPlaced && speed > MIN_SPEED && !minimapOverlayActiveRef.current;
    syncShipDirectionScreenLabel(
      speedLabelAnchorRef.current,
      screenLabelRef.current,
      camera,
      size,
      showSpeedLabel,
      40
    );
    if (speedRef.current && showSpeedLabel) {
      speedRef.current.textContent = `${speed.toFixed(1)} m/s`;
    }

    const ship = shipPositionRef.current;
    const sx = ship.x;
    const sz = ship.z;

    // ── Throttled: expensive trajectory simulation ─────────────────────────
    // Runs every TRAJ_UPDATE_INTERVAL frames (~20 Hz at 60 fps).
    // posArr, orbitPosArr, and all cached state persist between updates.
    _trajTick++;
    if (_trajTick >= TRAJ_UPDATE_INTERVAL) {
      _trajTick = 0;

      // Primary body detection — squared distances avoid per-body sqrt
      let primaryBody: GravityBody | null = null;
      let primaryBodyId: string | null = null;
      let primaryAccel = 0;
      for (const [id, body] of gravityBodies) {
        const dx = body.position.x - ship.x;
        const dz = body.position.z - ship.z;
        const dist2 = dx * dx + dz * dz;
        const srSq = body.surfaceRadius * body.surfaceRadius;
        const soiSq = body.soiRadius * body.soiRadius;
        if (dist2 > srSq && dist2 < soiSq) {
          const accel = body.mu / dist2;
          if (accel > primaryAccel) {
            primaryAccel = accel;
            primaryBody = body;
            primaryBodyId = id;
          }
        }
      }

      // Simulation initial conditions (body-relative frame)
      if (primaryBody) {
        _simPos.set(
          ship.x - primaryBody.position.x,
          0,
          ship.z - primaryBody.position.z
        );
        _simVel.set(
          shipVelocity.x - primaryBody.velocity.x,
          0,
          shipVelocity.z - primaryBody.velocity.z
        );
      } else {
        _simPos.set(ship.x, 0, ship.z);
        _simVel.copy(shipVelocity);
      }

      // Adaptive timestep: scale dt so a full orbit fits within TRAJ_STEPS
      let simDt = TRAJ_DT;
      let orbitCloseDist = ORBIT_CLOSE_DIST;
      if (primaryBody) {
        const r0 = _simPos.length();
        const v2 = _simVel.lengthSq();
        const energy = 0.5 * v2 - primaryBody.mu / Math.max(r0, 1);
        if (energy < 0) {
          const a = -primaryBody.mu / (2 * energy);
          const period = 2 * Math.PI * Math.sqrt((a * a * a) / primaryBody.mu);
          const neededDt = period / (TRAJ_STEPS * 0.9);
          if (neededDt > simDt) {
            simDt = neededDt;
            orbitCloseDist = Math.max(ORBIT_CLOSE_DIST, _simVel.length() * simDt * 2.0);
          }
        }
      }

      let orbitClosedAt = -1;
      let maxDistFromStart = 0;
      const startX = _simPos.x;
      const startZ = _simPos.z;
      let periStep = -1, apoStep = -1;
      let periDist = Infinity, apoDist = -Infinity;

      // 400-step symplectic Euler integration
      for (let i = 0; i < TRAJ_STEPS; i++) {
        const worldX = primaryBody ? _simPos.x + primaryBody.position.x : _simPos.x;
        const worldZ = primaryBody ? _simPos.z + primaryBody.position.z : _simPos.z;
        posArr[i * 3] = worldX - sx + VELOCITY_X_OFFSET;
        posArr[i * 3 + 1] = 0;
        posArr[i * 3 + 2] = worldZ - sz;

        // Track min/max distance from primary for apsis markers
        if (primaryBody) {
          const pdx = worldX - primaryBody.position.x;
          const pdz = worldZ - primaryBody.position.z;
          const pd = Math.sqrt(pdx * pdx + pdz * pdz);
          if (pd < periDist) { periDist = pd; periStep = i; }
          if (pd > apoDist) { apoDist = pd; apoStep = i; }
        }

        let ax = 0, az = 0;
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
            if (dist < body.surfaceRadius) { hitSurface = true; break; }
            if (dist < body.soiRadius) {
              const accel = body.mu / dist2;
              ax += (dx / dist) * accel;
              az += (dz / dist) * accel;
            }
          }
        }

        if (hitSurface) {
          const hitWorldX = primaryBody ? _simPos.x + primaryBody.position.x : _simPos.x;
          const hitWorldZ = primaryBody ? _simPos.z + primaryBody.position.z : _simPos.z;
          for (let j = i + 1; j < TRAJ_STEPS; j++) {
            posArr[j * 3] = hitWorldX - sx + VELOCITY_X_OFFSET;
            posArr[j * 3 + 1] = 0;
            posArr[j * 3 + 2] = hitWorldZ - sz;
          }
          break;
        }

        _simVel.x += ax * simDt;
        _simVel.z += az * simDt;
        _simPos.x += _simVel.x * simDt;
        _simPos.z += _simVel.z * simDt;

        const cdx = _simPos.x - startX;
        const cdz = _simPos.z - startZ;
        const distFromStart = Math.sqrt(cdx * cdx + cdz * cdz);
        if (distFromStart > maxDistFromStart) maxDistFromStart = distFromStart;

        if (
          i >= ORBIT_MIN_STEPS &&
          maxDistFromStart > ORBIT_AWAY_DIST &&
          distFromStart < orbitCloseDist
        ) {
          posArr[i * 3] = VELOCITY_X_OFFSET;
          posArr[i * 3 + 1] = 0;
          posArr[i * 3 + 2] = 0;
          orbitClosedAt = i;
          break;
        }
      }

      if (orbitClosedAt >= 0) {
        for (let i = orbitClosedAt + 1; i < TRAJ_STEPS; i++) {
          const src = i - (orbitClosedAt + 1);
          posArr[i * 3] = posArr[src * 3];
          posArr[i * 3 + 1] = posArr[src * 3 + 1];
          posArr[i * 3 + 2] = posArr[src * 3 + 2];
        }
      }

      // Publish apsides for autopilot and other systems
      trajectoryApsisRef.current.periapsis =
        primaryBody && periStep >= 0 && periDist < Infinity ? periDist : 0;
      trajectoryApsisRef.current.apoapsis =
        primaryBody && apoStep >= 0 && orbitClosedAt >= 0 ? apoDist : 0;
      trajectoryApsisRef.current.surfaceRadius = primaryBody?.surfaceRadius ?? 0;

      // Apsis canvas textures — redraw altitude labels
      const primaryIsPlanet = primaryBodyId !== null && primaryBodyId !== 'Sun';
      if (primaryIsPlanet && primaryBody && periStep >= 0) {
        const alt = Math.round(Math.max(0, periDist - primaryBody.surfaceRadius));
        drawApsisLabel(periMarker.ctx, periMarker.color, 'Pe', alt);
        (periMarker.sprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
      }
      if (primaryIsPlanet && primaryBody && apoStep >= 0 && orbitClosedAt >= 0) {
        const alt = Math.round(Math.max(0, apoDist - primaryBody.surfaceRadius));
        drawApsisLabel(apoMarker.ctx, apoMarker.color, 'Ap', alt);
        (apoMarker.sprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
      }

      // Ideal orbit circle geometry (400 cos/sin) — recomputed on sim frames
      if (primaryBody) {
        const rdx = ship.x - primaryBody.position.x;
        const rdz = ship.z - primaryBody.position.z;
        const rLen = Math.sqrt(rdx * rdx + rdz * rdz) || 1;
        const idealOrbitRadius = Math.min(
          primaryBody.surfaceRadius + primaryBody.orbitAltitude,
          primaryBody.soiRadius * 0.9
        );
        if (idealOrbitRadius > primaryBody.surfaceRadius) {
          const baseAngle = Math.atan2(rdz / rLen, rdx / rLen);
          const step = (Math.PI * 2) / (TRAJ_STEPS - 1);
          for (let i = 0; i < TRAJ_STEPS; i++) {
            const theta = baseAngle + i * step;
            orbitPosArr[i * 3] = Math.cos(theta) * idealOrbitRadius;
            orbitPosArr[i * 3 + 1] = 0;
            orbitPosArr[i * 3 + 2] = Math.sin(theta) * idealOrbitRadius;
          }
          const orbitPos = orbitLine.geometry.attributes.position;
          orbitPos.needsUpdate = true;
          orbitLine.computeLineDistances();
        }
      }

      // Orbit sprite texture — redraw label text
      if (orbitSpriteCtx) {
        orbitSpriteCtx.clearRect(0, 0, 256, 64);
        orbitSpriteCtx.fillStyle = '#30ff7a';
        orbitSpriteCtx.font = 'bold 12px monospace';
        orbitSpriteCtx.textAlign = 'center';
        orbitSpriteCtx.textBaseline = 'middle';
        const { periapsis, apoapsis, surfaceRadius } = orbitStatusRef.current;
        if (periapsis > 0 && apoapsis > 0) {
          const periAlt = Math.max(0, periapsis - surfaceRadius);
          const apoAlt = Math.max(0, apoapsis - surfaceRadius);
          orbitSpriteCtx.fillText(`PERI: ${Math.round(periAlt)}  APO: ${Math.round(apoAlt)}`, 128, 20);
        }
        orbitSpriteCtx.fillText('CIRCULAR ORBIT', 128, 34);
        (orbitSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
      }

      // Update cache for non-sim frames
      _cachedPrimaryBody = primaryBody;
      _cachedPrimaryBodyId = primaryBodyId;
      _cachedPrimaryIsPlanet = primaryIsPlanet;
      _cachedPeriStep = periStep;
      _cachedApoStep = apoStep;
      _cachedPeriDist = periDist;
      _cachedApoDist = apoDist;
      _cachedOrbitClosedAt = orbitClosedAt;
    }

    // ── Always: ring opacity pulse ─────────────────────────────────────────
    const ringMat = directionRing.material as THREE.LineBasicMaterial;
    if (trajectoryHighlightRef.current) {
      ringMat.opacity =
        SHIP_DIRECTION_RING_OPACITY +
        0.14 * (0.5 + 0.5 * Math.sin(Date.now() * 0.004));
    } else {
      ringMat.opacity = SHIP_DIRECTION_RING_OPACITY;
    }

    // ── Always: apsis marker positions (cached step indices + current ship pos) ──
    // posArr entries are ship-relative at sim time; using current sx/sz gives a
    // small positional drift equal to ship_velocity × frames_since_sim, which is
    // imperceptible against orbits spanning thousands of units.
    if (_cachedPrimaryIsPlanet && _cachedPrimaryBody && _cachedPeriStep >= 0) {
      const px = posArr[_cachedPeriStep * 3] + sx;
      const pz = posArr[_cachedPeriStep * 3 + 2] + sz;
      periMarker.sprite.visible = true;
      periMarker.sprite.position.set(px, 0, pz);
      const [mW, mH] = getApsisMarkerScale(camera, size.height, px, pz);
      periMarker.sprite.scale.set(mW, mH, 1);
    } else {
      periMarker.sprite.visible = false;
    }

    if (_cachedPrimaryIsPlanet && _cachedPrimaryBody && _cachedApoStep >= 0 && _cachedOrbitClosedAt >= 0) {
      const apx = posArr[_cachedApoStep * 3] + sx;
      const apz = posArr[_cachedApoStep * 3 + 2] + sz;
      apoMarker.sprite.visible = true;
      apoMarker.sprite.position.set(apx, 0, apz);
      const [aW, aH] = getApsisMarkerScale(camera, size.height, apx, apz);
      apoMarker.sprite.scale.set(aW, aH, 1);
    } else {
      apoMarker.sprite.visible = false;
    }

    // ── Always: orbit section ──────────────────────────────────────────────
    const showOrbit = Boolean(_cachedPrimaryBody);
    orbitLine.visible = showOrbit;
    orbitSprite.visible = showOrbit;
    if (!showOrbit || !_cachedPrimaryBody) {
      orbitDirArrow.visible = false;
      orbitDirRing.visible = false;
      syncShipDirectionScreenLabel(null, orbitReqScreenLabelRef.current, camera, size, false);
      return;
    }

    // Radial geometry — uses current ship pos vs cached primary (cheap)
    const rdx = ship.x - _cachedPrimaryBody.position.x;
    const rdz = ship.z - _cachedPrimaryBody.position.z;
    const rLen = Math.sqrt(rdx * rdx + rdz * rdz) || 1;
    const idealOrbitRadius = Math.min(
      _cachedPrimaryBody.surfaceRadius + _cachedPrimaryBody.orbitAltitude,
      _cachedPrimaryBody.soiRadius * 0.9
    );
    if (idealOrbitRadius <= _cachedPrimaryBody.surfaceRadius) {
      orbitDirArrow.visible = false;
      orbitDirRing.visible = false;
      syncShipDirectionScreenLabel(null, orbitReqScreenLabelRef.current, camera, size, false);
      return;
    }

    const vx = rdx / rLen;
    const vz = rdz / rLen;
    const vCircNow = Math.sqrt(_cachedPrimaryBody.mu / Math.max(rLen, 1));
    const tx = -vz;
    const tz = vx;
    const relVelX = shipVelocity.x - _cachedPrimaryBody.velocity.x;
    const relVelZ = shipVelocity.z - _cachedPrimaryBody.velocity.z;
    const dot = relVelX * tx + relVelZ * tz;
    const tangentSign = dot >= 0 ? 1 : -1;
    const dirX = tx * tangentSign;
    const dirZ = tz * tangentSign;

    // Orbit direction arrow tracks current velocity every frame
    if (_cachedPrimaryIsPlanet) {
      orbitDirRing.visible = true;
      orbitDirRing.position.copy(_shipWorld);
      const orbitArrowPlaced = placeShipDirectionArrow(
        orbitDirArrow,
        _shipWorld.x,
        _shipWorld.y,
        _shipWorld.z,
        dirX,
        dirZ
      );
      if (orbitArrowPlaced) {
        orbitDirArrow.updateWorldMatrix(true, true);
      }
      const showOrbitReqLabel =
        orbitArrowPlaced && !minimapOverlayActiveRef.current;
      syncShipDirectionScreenLabel(
        orbitReqLabelAnchorRef.current,
        orbitReqScreenLabelRef.current,
        camera,
        size,
        showOrbitReqLabel,
        40
      );
      if (orbitReqSpeedRef.current && showOrbitReqLabel) {
        orbitReqSpeedRef.current.textContent = `${vCircNow.toFixed(1)} m/s`;
      }
    } else {
      orbitDirArrow.visible = false;
      orbitDirRing.visible = false;
      syncShipDirectionScreenLabel(null, orbitReqScreenLabelRef.current, camera, size, false);
    }

    // Orbit line and sprite track the planet every frame (cheap position updates)
    _orbitDir.set(vx, 0, vz).multiplyScalar(idealOrbitRadius);
    _orbitPos.copy(_cachedPrimaryBody.position).add(_orbitDir);
    _orbitVel.set(
      tx * Math.sqrt(_cachedPrimaryBody.mu / idealOrbitRadius) * tangentSign,
      0,
      tz * Math.sqrt(_cachedPrimaryBody.mu / idealOrbitRadius) * tangentSign
    );
    _orbitVel.x += _cachedPrimaryBody.velocity.x;
    _orbitVel.z += _cachedPrimaryBody.velocity.z;

    orbitLine.position.set(_cachedPrimaryBody.position.x, 0, _cachedPrimaryBody.position.z);

    const orbitMid = Math.floor(TRAJ_STEPS / 2);
    const ox = orbitPosArr[orbitMid * 3] + _cachedPrimaryBody.position.x;
    const oz = orbitPosArr[orbitMid * 3 + 2] + _cachedPrimaryBody.position.z;
    orbitSprite.scale.set(32, 10, 1);
    orbitSprite.position.set(ox, 0, oz);
  }, SHIP_DIRECTION_INDICATOR_FRAME_PRIORITY);

  return (
    <>
      <primitive object={directionRing} />
      <primitive object={velocityArrow}>
        <group ref={speedLabelAnchorRef} position={[0, 0, SPEED_LABEL_LOCAL_Z]} />
      </primitive>
      <primitive object={orbitDirRing} />
      <primitive object={orbitDirArrow}>
        <group ref={orbitReqLabelAnchorRef} position={[0, 0, ORBIT_REQ_LABEL_LOCAL_Z]} />
      </primitive>
      <primitive object={orbitLine} />
      <primitive object={orbitSprite} />
      <primitive object={periMarker.sprite} />
      <primitive object={apoMarker.sprite} />
    </>
  );
}
