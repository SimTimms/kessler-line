import * as THREE from 'three';
import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';

type Vec3 = [number, number, number];

/** Red dust palette — combat pocket atmosphere. */
export const COMBAT_DUST_COLORS = [
  new THREE.Color('#c42828'),
  new THREE.Color('#8b1515'),
  new THREE.Color('#e04530'),
] as const;

/** Prefix collidable / drive-signature ids so this scene does not collide with Salvage/Drone Config. */
export const COMBAT_ID_PREFIX = 'combat-';

export function getCombatShipSpawn(): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  return {
    position: [0, 1.2, 0],
    /** Face the asteroid pocket (+Z). */
    rotation: [0, 0, 0],
  };
}

/**
 * Asteroid impact + combat target-practice pocket.
 * No solar system, berth, salvage bay, or decorative salvage asteroid grid —
 * only authored mineables for clamp-on-impact and a drone fleet for gunnery.
 */
export const COMBAT_CONFIG = {
  fogColor: '#02040a',
  canvasNear: CANVAS_NEAR,
  canvasFar: CANVAS_FAR,
  toneMappingExposure: TONE_MAPPING_EXPOSURE,
  /** Match Drone / LTD follow pose relative to the ship. */
  tutorialFollowOffset: [0, 100, 120] as Vec3,
  tutorialCameraZoomMax: 820,
  planetImpactCameraHoldMaxAltitude: 80_000,
  shipParticleCount: 100,
  playerShipUrl: '/shuttle-low-british.glb',
  /** Red dust cloud around the asteroid / drone pocket. */
  dustCloud: {
    radius: 2200,
    particleSize: 1500,
    radialSpread: 9,
    yInitial: -700,
    opacity: 0.12,
    colors: COMBAT_DUST_COLORS,
  },
  /**
   * Mineable rocks for impact / clamp authoring (local to world origin).
   * Keep a few close for quick iteration; larger ones further out for high-speed hits.
   */
  mineableAsteroids: [
    {
      id: 'asteroid-near',
      position: [45, 0, -80] as Vec3,
      rotation: [0.2, 0.8, 0.1] as Vec3,
      scale: 18,
      label: 'Impact Asteroid Near',
    },
    {
      id: 'asteroid-mid',
      position: [-60, -20, -160] as Vec3,
      rotation: [0.1, 1.4, -0.2] as Vec3,
      scale: 32,
      label: 'Impact Asteroid Mid',
    },
    {
      id: 'asteroid-far',
      position: [120, -40, -320] as Vec3,
      rotation: [-0.15, 0.4, 0.3] as Vec3,
      scale: 55,
      label: 'Impact Asteroid Far',
    },
    {
      id: 'asteroid-big',
      position: [-180, -80, -400] as Vec3,
      rotation: [0, 2.1, 0] as Vec3,
      scale: 90,
      label: 'Impact Asteroid Large',
    },
  ],
  /** Patrol drones used as moving target practice. */
  targetDroneFleet: {
    url: '/space_garbage_truck-low.glb',
    count: 2,
    scale: 0.25,
    spawnCenter: [0, 0, -200] as Vec3,
    spawnRadius: 420,
    /** Sphere collider around each scow mesh (visual scale is 10). */
    collisionRadius: 18,
    waypoints: [
      [45, 0, -80],
      [-60, -20, -160],
      [120, -40, -320],
      [-180, -80, -400],
      [0, 0, -200],
      [80, 0, -120],
      [-100, 0, -250],
    ] as Vec3[],
  },
  /** Draw wireframe colliders (drones, asteroids, ship). */
  showCollisionDebug: true,
};
