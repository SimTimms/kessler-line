import { useMemo, useRef, useEffect, useLayoutEffect, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shipVelocity } from './Ship/Spaceship';
import { gravityBodies } from '../context/GravityRegistry';
import { orbitStatusRef, trajectoryApsisRef } from '../context/ShipState';
import { shipPosRef } from '../context/ShipPos';
import { navHudEnabledRef } from '../context/NavHud';
import { minimapOverlayActiveRef } from '../context/MinimapUi';
import {
  SHIP_DIRECTION_MIN_SPEED,
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

/** Local +Z offset past the arrow tip — label projects from this anchor. */
const SPEED_LABEL_LOCAL_Z = 22;

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
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.frustumCulled = false;
  sprite.visible = false;
  return { sprite, ctx, color };
}

function drawApsisLabel(ctx: CanvasRenderingContext2D, color: string, label: string, alt: number) {
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
    if (!orbitCtx) throw new Error('Canvas 2D context unavailable');

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

    return {
      velocityArrow,
      directionRing: createShipDirectionRing(SHIP_DIRECTION_VELOCITY_COLOR),
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
    if (!navHudEnabledRef.current) {
      velocityArrow.visible = false;
      directionRing.visible = false;
      syncShipDirectionScreenLabel(null, screenLabelRef.current, camera, size, false);
      orbitLine.visible = false;
      orbitSprite.visible = false;
      periMarker.sprite.visible = false;
      apoMarker.sprite.visible = false;
      return;
    }
    if (!shipGroupRef.current) return;
    shipGroupRef.current.updateWorldMatrix(true, false);
    shipGroupRef.current.getWorldPosition(_shipWorld);

    const speed = shipVelocity.length();
    directionRing.visible = true;

    // Place ring/arrow from the rendered ship pose (same space as TargetIndicatorLine).
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

    let primaryBody: (typeof gravityBodies extends Map<string, infer T> ? T : never) | null = null;
    let primaryBodyId: string | null = null;
    let primaryAccel = 0;
    for (const [id, body] of gravityBodies) {
      const dx = body.position.x - ship.x;
      const dz = body.position.z - ship.z;
      const dist2 = dx * dx + dz * dz;
      const dist = Math.sqrt(dist2);
      if (dist > body.surfaceRadius && dist < body.soiRadius) {
        const accel = body.mu / dist2;
        if (accel > primaryAccel) {
          primaryAccel = accel;
          primaryBody = body;
          primaryBodyId = id;
        }
      }
    }
    const primaryIsPlanet = primaryBodyId !== null && primaryBodyId !== 'Sun';

    // Start the simulation from the ship model centre (shipPosRef).
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

    // Adaptive timestep: if the orbit period exceeds the fixed simulation window,
    // scale dt up so the full orbit fits in TRAJ_STEPS steps. Scale the closure
    // distance proportionally so the arrival-back-at-start check still fires.
    let simDt = TRAJ_DT;
    let orbitCloseDist = ORBIT_CLOSE_DIST;
    if (primaryBody) {
      const r0 = _simPos.length();
      const v2 = _simVel.lengthSq();
      const energy = 0.5 * v2 - primaryBody.mu / Math.max(r0, 1);
      if (energy < 0) {
        const a = -primaryBody.mu / (2 * energy); // semi-major axis
        const period = 2 * Math.PI * Math.sqrt((a * a * a) / primaryBody.mu);
        const neededDt = period / (TRAJ_STEPS * 0.9); // cover >1 full orbit
        if (neededDt > simDt) {
          simDt = neededDt;
          // Close-distance scales with step size so the loop-closure check
          // can still trigger when each step covers more ground
          orbitCloseDist = Math.max(ORBIT_CLOSE_DIST, _simVel.length() * simDt * 2.0);
        }
      }
    }

    let orbitClosedAt = -1; // step where trajectory closed into a loop
    let maxDistFromStart = 0; // furthest the sim has travelled from the ship
    const startX = _simPos.x;
    const startZ = _simPos.z;

    // Apsis tracking
    let periStep = -1,
      apoStep = -1;
    let periDist = Infinity,
      apoDist = -Infinity;

    for (let i = 0; i < TRAJ_STEPS; i++) {
      const worldX = primaryBody ? _simPos.x + primaryBody.position.x : _simPos.x;
      const worldZ = primaryBody ? _simPos.z + primaryBody.position.z : _simPos.z;
      posArr[i * 3] = worldX - sx + VELOCITY_X_OFFSET;
      posArr[i * 3 + 1] = 0;
      posArr[i * 3 + 2] = worldZ - sz;

      // Track min/max distance from primary for apsis markers (worldX/worldZ, not ship-relative posArr)
      if (primaryBody) {
        const pdx = worldX - primaryBody.position.x;
        const pdz = worldZ - primaryBody.position.z;
        const pd = Math.sqrt(pdx * pdx + pdz * pdz);
        if (pd < periDist) {
          periDist = pd;
          periStep = i;
        }
        if (pd > apoDist) {
          apoDist = pd;
          apoStep = i;
        }
      }

      // Gravitational acceleration — skip inside a body's surface to prevent
      // chaotic oscillation when the trajectory passes through a planet.
      let ax = 0,
        az = 0;
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
            // Trajectory has hit a surface — stop here rather than oscillating
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
        // Fill remaining points at this position so line ends cleanly at impact
        const hitWorldX = primaryBody ? _simPos.x + primaryBody.position.x : _simPos.x;
        const hitWorldZ = primaryBody ? _simPos.z + primaryBody.position.z : _simPos.z;
        for (let j = i + 1; j < TRAJ_STEPS; j++) {
          posArr[j * 3] = hitWorldX - sx + VELOCITY_X_OFFSET;
          posArr[j * 3 + 1] = 0;
          posArr[j * 3 + 2] = hitWorldZ - sz;
        }
        break;
      }

      // Symplectic Euler: kick then drift (energy-conserving for orbits)
      _simVel.x += ax * simDt;
      _simVel.z += az * simDt;
      _simPos.x += _simVel.x * simDt;
      _simPos.z += _simVel.z * simDt;

      const cdx = _simPos.x - startX;
      const cdz = _simPos.z - startZ;
      const distFromStart = Math.sqrt(cdx * cdx + cdz * cdz);

      if (distFromStart > maxDistFromStart) maxDistFromStart = distFromStart;

      // Orbit closure: only valid after the trajectory has first moved well away
      // from start. This prevents an approach arc that swings near the start
      // from being misread as a closed orbit.
      if (
        i >= ORBIT_MIN_STEPS &&
        maxDistFromStart > ORBIT_AWAY_DIST &&
        distFromStart < orbitCloseDist
      ) {
        posArr[i * 3] = VELOCITY_X_OFFSET; // close back to ship centre
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

    // Publish trajectory-simulated apsides so other systems (e.g. autopilot status) can read them
    trajectoryApsisRef.current.periapsis =
      primaryBody && periStep >= 0 && periDist < Infinity ? periDist : 0;
    trajectoryApsisRef.current.apoapsis =
      primaryBody && apoStep >= 0 && orbitClosedAt >= 0 ? apoDist : 0;
    trajectoryApsisRef.current.surfaceRadius = primaryBody?.surfaceRadius ?? 0;

    // Pulse the ring slightly while trajectory highlight is active (autopilot cues).
    const ringMat = directionRing.material as THREE.LineBasicMaterial;
    if (trajectoryHighlightRef.current) {
      ringMat.opacity =
        SHIP_DIRECTION_RING_OPACITY +
        0.14 * (0.5 + 0.5 * Math.sin(Date.now() * 0.004));
    } else {
      ringMat.opacity = SHIP_DIRECTION_RING_OPACITY;
    }

    // ── Apsis markers ────────────────────────────────────────────────────────
    // Fixed ~screen-pixel size so they stay small and readable at any zoom / orbit radius.

    if (primaryIsPlanet && primaryBody && periStep >= 0) {
      const px = posArr[periStep * 3] + sx;
      const pz = posArr[periStep * 3 + 2] + sz;
      const alt = Math.round(Math.max(0, periDist - primaryBody.surfaceRadius));
      periMarker.sprite.visible = true;
      periMarker.sprite.position.set(px, 0, pz);
      const [mW, mH] = getApsisMarkerScale(camera, size.height, px, pz);
      periMarker.sprite.scale.set(mW, mH, 1);
      drawApsisLabel(periMarker.ctx, periMarker.color, 'Pe', alt);
      (periMarker.sprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    } else {
      periMarker.sprite.visible = false;
    }

    // Apoapsis only meaningful for a closed orbit
    if (primaryIsPlanet && primaryBody && apoStep >= 0 && orbitClosedAt >= 0) {
      const ax = posArr[apoStep * 3] + sx;
      const az = posArr[apoStep * 3 + 2] + sz;
      const alt = Math.round(Math.max(0, apoDist - primaryBody.surfaceRadius));
      apoMarker.sprite.visible = true;
      apoMarker.sprite.position.set(ax, 0, az);
      const [aW, aH] = getApsisMarkerScale(camera, size.height, ax, az);
      apoMarker.sprite.scale.set(aW, aH, 1);
      drawApsisLabel(apoMarker.ctx, apoMarker.color, 'Ap', alt);
      (apoMarker.sprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    } else {
      apoMarker.sprite.visible = false;
    }

    // ── Ideal orbit trajectory (green) ─────────────────────────────────────
    const showOrbit = Boolean(primaryBody);
    orbitLine.visible = showOrbit;
    orbitSprite.visible = showOrbit;
    if (!showOrbit || !primaryBody) return;

    const rdx = ship.x - primaryBody.position.x;
    const rdz = ship.z - primaryBody.position.z;
    const rLen = Math.sqrt(rdx * rdx + rdz * rdz) || 1;
    const idealOrbitRadius = Math.min(
      primaryBody.surfaceRadius + primaryBody.orbitAltitude,
      primaryBody.soiRadius * 0.9
    );
    if (idealOrbitRadius <= primaryBody.surfaceRadius) return;

    const vx = rdx / rLen;
    const vz = rdz / rLen;
    const vCirc = Math.sqrt(primaryBody.mu / idealOrbitRadius);
    const tx = -vz;
    const tz = vx;
    const relVelX = shipVelocity.x - primaryBody.velocity.x;
    const relVelZ = shipVelocity.z - primaryBody.velocity.z;
    const dot = relVelX * tx + relVelZ * tz;
    const tangentSign = dot >= 0 ? 1 : -1;

    _orbitDir.set(vx, 0, vz).multiplyScalar(idealOrbitRadius);
    _orbitPos.copy(primaryBody.position).add(_orbitDir);
    _orbitVel.set(tx * vCirc * tangentSign, 0, tz * vCirc * tangentSign);
    _orbitVel.x += primaryBody.velocity.x;
    _orbitVel.z += primaryBody.velocity.z;

    // Anchor orbit line at body position — geometry in body-relative coords
    orbitLine.position.set(primaryBody.position.x, 0, primaryBody.position.z);

    const baseAngle = Math.atan2(vz, vx);
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

    const orbitMid = Math.floor(TRAJ_STEPS / 2);
    // Convert body-relative back to world for sprite
    const ox = orbitPosArr[orbitMid * 3] + primaryBody.position.x;
    const oz = orbitPosArr[orbitMid * 3 + 2] + primaryBody.position.z;
    orbitSprite.scale.set(32, 10, 1);
    orbitSprite.position.set(ox, 0, oz);

    orbitSpriteCtx.clearRect(0, 0, 256, 64);
    orbitSpriteCtx.fillStyle = '#30ff7a';
    orbitSpriteCtx.font = 'bold 12px monospace';
    orbitSpriteCtx.textAlign = 'center';
    orbitSpriteCtx.textBaseline = 'middle';
    // Display periapsis and apoapsis altitude if available
    const { periapsis, apoapsis, surfaceRadius } = orbitStatusRef.current;
    if (periapsis > 0 && apoapsis > 0) {
      const periAlt = Math.max(0, periapsis - surfaceRadius);
      const apoAlt = Math.max(0, apoapsis - surfaceRadius);
      orbitSpriteCtx.fillText(`PERI: ${Math.round(periAlt)}  APO: ${Math.round(apoAlt)}`, 128, 20);
    }
    orbitSpriteCtx.fillText('CIRCULAR ORBIT', 128, 34);
    (orbitSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
  }, SHIP_DIRECTION_INDICATOR_FRAME_PRIORITY);

  return (
    <>
      <primitive object={directionRing} />
      <primitive object={velocityArrow}>
        <group ref={speedLabelAnchorRef} position={[0, 0, SPEED_LABEL_LOCAL_Z]} />
      </primitive>
      <primitive object={orbitLine} />
      <primitive object={orbitSprite} />
      <primitive object={periMarker.sprite} />
      <primitive object={apoMarker.sprite} />
    </>
  );
}
